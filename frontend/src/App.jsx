import { useCallback, useMemo, useState } from "react";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  useNodesState,
  useEdgesState,
} from "reactflow";

import {
  Shield,
  Search,
  Wallet,
  Activity,
  Database,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Network,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Bell,
  Settings,
  ChevronRight,
  Loader2,
  Copy,
  ExternalLink,
  Maximize2,
  Focus,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";

import "reactflow/dist/style.css";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const FOCUSED_MAX_NODES = 25;
const FOCUSED_HOP1_LIMIT = 8;
const FOCUSED_HOP2_LIMIT = 16;

function shortAddress(address) {
  if (!address) return "Unknown";

  if (address.length <= 18) {
    return address;
  }

  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function normalizeGraph(trace) {
  const sourceGraph = trace?.graph || {};

  const graph = {};

  Object.entries(sourceGraph).forEach(([wallet, info]) => {
    const normalizedWallet = String(wallet).toLowerCase();

    graph[normalizedWallet] = {
      ...info,

      connected_wallets: (info?.connected_wallets || []).map((item) =>
        String(item).toLowerCase()
      ),
    };
  });

  return graph;
}

function buildGraph(trace, rootWallet, mode = "focused") {
  const graph = normalizeGraph(trace);

  const root = rootWallet?.toLowerCase();

  if (!root) {
    return {
      nodes: [],
      edges: [],
      totalWallets: 0,
      totalEdges: 0,
    };
  }

  const walletSet = new Set([root]);

  Object.entries(graph).forEach(([wallet, info]) => {
    walletSet.add(wallet);

    (info?.connected_wallets || []).forEach((connected) => {
      walletSet.add(connected);
    });
  });

  const levelMap = new Map();

  levelMap.set(root, 0);

  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) continue;

    const currentLevel = levelMap.get(current) ?? 0;

    const info = graph[current];

    (info?.connected_wallets || []).forEach((connected) => {
      if (!levelMap.has(connected)) {
        levelMap.set(connected, currentLevel + 1);

        queue.push(connected);
      }
    });
  }

  walletSet.forEach((wallet) => {
    if (!levelMap.has(wallet)) {
      levelMap.set(wallet, 1);
    }
  });

  const allEdges = [];

  const seenEdges = new Set();

  Object.entries(graph).forEach(([wallet, info]) => {
    (info?.connected_wallets || []).forEach((connected) => {
      const id = `${wallet}-${connected}`;

      if (seenEdges.has(id)) {
        return;
      }

      seenEdges.add(id);

      allEdges.push({
        id,
        source: wallet,
        target: connected,

        animated: true,

        markerEnd: {
          type: MarkerType.ArrowClosed,
        },

        className: "animatedTraceEdge",
      });
    });
  });

  let visibleWallets = Array.from(walletSet);

  if (mode === "focused") {
    const hop1 = [];
    const hop2 = [];

    Array.from(walletSet).forEach((wallet) => {
      const level = levelMap.get(wallet) ?? 1;

      if (level === 1) {
        hop1.push(wallet);
      }

      if (level === 2) {
        hop2.push(wallet);
      }
    });

    visibleWallets = [
      root,
      ...hop1.slice(0, FOCUSED_HOP1_LIMIT),
      ...hop2.slice(0, FOCUSED_HOP2_LIMIT),
    ].slice(0, FOCUSED_MAX_NODES);
  }

  const visibleSet = new Set(visibleWallets);

  const visibleEdges = allEdges.filter(
    (edge) =>
      visibleSet.has(edge.source) &&
      visibleSet.has(edge.target)
  );

  const grouped = {};

  visibleWallets.forEach((wallet) => {
    const level = levelMap.get(wallet) ?? 1;

    if (!grouped[level]) {
      grouped[level] = [];
    }

    grouped[level].push(wallet);
  });

  const nodes = visibleWallets.map((wallet) => {
    const level = levelMap.get(wallet) ?? 1;

    const levelGroup = grouped[level] || [];

    const index = levelGroup.indexOf(wallet);

    const total = levelGroup.length;

    const isRoot = wallet === root;

    const x = 80 + level * 320;

    const verticalGap = mode === "focused" ? 115 : 135;

    const y =
      220 +
      (index - (total - 1) / 2) * verticalGap;

    return {
      id: wallet,

      position: {
        x,
        y,
      },

      data: {
        label: (
          <div className="walletNodeInner">
            <div
              className={
                isRoot
                  ? "walletNodeIcon suspectIcon"
                  : "walletNodeIcon normalIcon"
              }
            >
              <Wallet size={17} />
            </div>

            <div>
              <strong>
                {isRoot
                  ? "SUSPECT WALLET"
                  : `HOP ${level} WALLET`}
              </strong>

              <span>
                {shortAddress(wallet)}
              </span>
            </div>
          </div>
        ),

        fullAddress: wallet,
        level,
      },

      className:
        isRoot
          ? "flowNode suspectNode"
          : "flowNode walletFlowNode",

      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  return {
    nodes,
    edges: visibleEdges,

    totalWallets: walletSet.size,
    totalEdges: allEdges.length,
  };
}

function App() {
  const [page, setPage] = useState("Investigate");

  const [walletAddress, setWalletAddress] = useState("");

  const [caseData, setCaseData] = useState(null);

  const [traceData, setTraceData] = useState(null);

  const [analysisData, setAnalysisData] = useState(null);

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");

  const [error, setError] = useState("");

  const [selectedNode, setSelectedNode] = useState(null);

  const [graphMode, setGraphMode] = useState("focused");

  const [totalGraphStats, setTotalGraphStats] = useState({
    wallets: 0,
    edges: 0,
  });

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState([]);

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState([]);

  const traceStats = useMemo(() => {
    return {
      visibleWallets: nodes.length,
      visibleConnections: edges.length,
      totalWallets: totalGraphStats.wallets,
      totalConnections: totalGraphStats.edges,
      hops: traceData?.max_hops ?? 0,
    };
  }, [
    nodes,
    edges,
    traceData,
    totalGraphStats,
  ]);

  const applyGraphView = useCallback(
    (trace, rootWallet, mode) => {
      if (!trace || !rootWallet) {
        return;
      }

      const result = buildGraph(
        trace,
        rootWallet,
        mode
      );

      setGraphMode(mode);

      setNodes(result.nodes);

      setEdges(result.edges);

      setTotalGraphStats({
        wallets: result.totalWallets,
        edges: result.totalEdges,
      });
    },
    [
      setNodes,
      setEdges,
    ]
  );

  async function startInvestigation() {
    const wallet = walletAddress.trim();

    if (!wallet) {
      setError(
        "Enter a suspect wallet address."
      );

      return;
    }

    setLoading(true);

    setError("");
    setCaseData(null);
    setTraceData(null);
    setAnalysisData(null);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setGraphMode("focused");

    setTotalGraphStats({
      wallets: 0,
      edges: 0,
    });

    try {
      /*
       * CREATE / GET CASE
       *
       * Backend duplicate-wallet logic will
       * return existing case when wallet
       * already exists.
       */

      setStatus(
        "Validating suspect wallet..."
      );

      const createResponse = await fetch(
        `${API_BASE}/api/cases/`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            wallet_address: wallet,
            fraud_type:
              "Cryptocurrency Fraud",
          }),
        }
      );

      const created =
        await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          created?.detail ||
            `Case request failed (${createResponse.status})`
        );
      }

      setCaseData(created);

      setWalletAddress(
        created.wallet_address
      );

      setStatus(
        `Opening ${created.case_id} • Starting blockchain trace...`
      );

      /*
       * TRACE
       */

      const traceResponse = await fetch(
        `${API_BASE}/api/cases/${created.case_id}/trace`
      );

      const traceResult =
        await traceResponse.json();

      if (!traceResponse.ok) {
        throw new Error(
          traceResult?.detail ||
            `Trace failed (${traceResponse.status})`
        );
      }

      setTraceData(traceResult.trace);

      setStatus(
        "Building transaction intelligence graph..."
      );

      const graphResult = buildGraph(
        traceResult.trace,
        created.wallet_address,
        "focused"
      );

      setTotalGraphStats({
        wallets:
          graphResult.totalWallets,

        edges:
          graphResult.totalEdges,
      });

      setNodes([]);
      setEdges([]);

      /*
       * Focused graph animation
       */

      for (
        let i = 0;
        i < graphResult.nodes.length;
        i++
      ) {
        const node =
          graphResult.nodes[i];

        await new Promise((resolve) =>
          setTimeout(
            resolve,
            i === 0 ? 80 : 60
          )
        );

        setNodes((current) => [
          ...current,
          node,
        ]);

        const connectedEdges =
          graphResult.edges.filter(
            (edge) =>
              edge.target === node.id ||
              edge.source === node.id
          );

        setEdges((current) => {
          const ids = new Set(
            current.map((edge) => edge.id)
          );

          return [
            ...current,

            ...connectedEdges.filter(
              (edge) =>
                !ids.has(edge.id)
            ),
          ];
        });
      }

      /*
       * ANALYZE SAME CASE
       */

      setStatus(
        `Running fraud intelligence analysis for ${created.case_id}...`
      );

      const analysisResponse = await fetch(
        `${API_BASE}/api/cases/${created.case_id}/analyze`,
        {
          method: "POST",
        }
      );

      const analyzed =
        await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(
          analyzed?.detail ||
            `Analysis failed (${analysisResponse.status})`
        );
      }

      setAnalysisData(
        analyzed.analysis
      );

      setCaseData((current) => ({
        ...current,

        status: analyzed.status,

        risk_level:
          analyzed.analysis
            ?.risk
            ?.risk_level,
      }));

      const riskLevel =
        analyzed.analysis
          ?.risk
          ?.risk_level ||
        "UNKNOWN";

      const riskScore =
        analyzed.analysis
          ?.risk
          ?.risk_score ?? 0;

      setStatus(
        `${created.case_id} investigation complete • ${graphResult.totalWallets} wallets traced • Risk ${riskLevel} (${riskScore}/100)`
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Investigation failed."
      );

      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  /*
   * OPEN EXISTING CASE
   *
   * IMPORTANT:
   * This function does NOT call
   * POST /api/cases/
   *
   * Therefore clicking CASE-007
   * will not create CASE-010.
   */

  async function openExistingCase(item) {
    if (
      !item?.case_id ||
      !item?.wallet_address
    ) {
      return;
    }

    setPage("Investigate");

    setWalletAddress(
      item.wallet_address
    );

    setCaseData(item);

    setTraceData(null);
    setAnalysisData(null);
    setSelectedNode(null);

    setNodes([]);
    setEdges([]);

    setGraphMode("focused");

    setTotalGraphStats({
      wallets: 0,
      edges: 0,
    });

    setLoading(true);
    setError("");

    try {
      setStatus(
        `Opening existing investigation ${item.case_id}...`
      );

      /*
       * TRACE EXISTING CASE
       */

      const traceResponse = await fetch(
        `${API_BASE}/api/cases/${item.case_id}/trace`
      );

      const traceResult =
        await traceResponse.json();

      if (!traceResponse.ok) {
        throw new Error(
          traceResult?.detail ||
            `Trace failed (${traceResponse.status})`
        );
      }

      setTraceData(
        traceResult.trace
      );

      const graphResult = buildGraph(
        traceResult.trace,
        item.wallet_address,
        "focused"
      );

      setTotalGraphStats({
        wallets:
          graphResult.totalWallets,

        edges:
          graphResult.totalEdges,
      });

      /*
       * Existing case opens immediately.
       * No long animation.
       */

      setNodes(
        graphResult.nodes
      );

      setEdges(
        graphResult.edges
      );

      /*
       * ANALYZE EXISTING CASE
       */

      setStatus(
        `Loading intelligence for ${item.case_id}...`
      );

      const analysisResponse = await fetch(
        `${API_BASE}/api/cases/${item.case_id}/analyze`,
        {
          method: "POST",
        }
      );

      const analyzed =
        await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(
          analyzed?.detail ||
            `Analysis failed (${analysisResponse.status})`
        );
      }

      setAnalysisData(
        analyzed.analysis
      );

      setCaseData((current) => ({
        ...current,

        status:
          analyzed.status,

        risk_level:
          analyzed.analysis
            ?.risk
            ?.risk_level ||
          current?.risk_level,
      }));

      const risk =
        analyzed.analysis
          ?.risk
          ?.risk_level ||
        "UNKNOWN";

      const score =
        analyzed.analysis
          ?.risk
          ?.risk_score ?? 0;

      setStatus(
        `${item.case_id} loaded • ${graphResult.totalWallets} wallets • Risk ${risk} (${score}/100)`
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to open existing investigation."
      );

      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  function switchGraphMode(mode) {
    if (
      !traceData ||
      !caseData?.wallet_address
    ) {
      return;
    }

    setSelectedNode(null);

    applyGraphView(
      traceData,
      caseData.wallet_address,
      mode
    );

    if (mode === "focused") {
      setStatus(
        `Focused view • ${totalGraphStats.wallets} total wallets traced`
      );
    } else {
      setStatus(
        `Full graph loaded • ${totalGraphStats.wallets} wallets • ${totalGraphStats.edges} connections`
      );
    }
  }

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNode(node);
    },
    []
  );

  async function copyWallet(address) {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(
        address
      );
    } catch (err) {
      console.error(err);
    }
  }

  const riskLevel =
    analysisData
      ?.risk
      ?.risk_level;

  const riskScore =
    analysisData
      ?.risk
      ?.risk_score;

  const patternSummary = useMemo(() => {
    const findings = analysisData?.pattern_findings || [];
    const grouped = new Map();

    findings.forEach((finding) => {
      const pattern = finding?.pattern || "Pattern Detected";
      const existing = grouped.get(pattern) || {
        pattern,
        count: 0,
        sampleWallet: null,
      };

      existing.count += 1;

      if (!existing.sampleWallet && finding?.wallet) {
        existing.sampleWallet = finding.wallet;
      }

      grouped.set(pattern, existing);
    });

    return Array.from(grouped.values());
  }, [analysisData]);

  const patternCount = patternSummary.length;

  return (
    <div className="shadowApp">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <Shield size={24} />
          </div>

          <div>
            <div className="brandName">
              SHADOWTRACE
            </div>

            <div className="brandSub">
              BLOCKCHAIN INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="navLabel">
          INVESTIGATION
        </div>

        <Nav
          icon={
            <LayoutDashboard />
          }
          label="Dashboard"
          active={
            page === "Dashboard"
          }
          onClick={() =>
            setPage("Dashboard")
          }
        />

        <Nav
          icon={<Search />}
          label="Investigate"
          active={
            page === "Investigate"
          }
          onClick={() =>
            setPage("Investigate")
          }
        />

        <Nav
          icon={<FolderOpen />}
          label="Cases"
          active={
            page === "Cases"
          }
          onClick={() =>
            setPage("Cases")
          }
        />

        <Nav
          icon={<Bell />}
          label="Alerts"
          active={
            page === "Alerts"
          }
          onClick={() =>
            setPage("Alerts")
          }
        />

        <Nav
          icon={<FileText />}
          label="Reports"
          active={
            page === "Reports"
          }
          onClick={() =>
            setPage("Reports")
          }
        />

        <div className="navLabel systemLabel">
          SYSTEM
        </div>

        <Nav
          icon={<Settings />}
          label="Settings"
          active={
            page === "Settings"
          }
          onClick={() =>
            setPage("Settings")
          }
        />

        <div className="sidebarStatus">
          <span className="onlinePulse" />

          <div>
            <strong>
              Intelligence Engine
            </strong>

            <small>
              Operational
            </small>
          </div>
        </div>
      </aside>

      <main className="mainArea">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              SIH26183 • DIGITAL ASSET INVESTIGATION
            </div>

            <h1>
              {page === "Investigate"
                ? "Blockchain Investigation"
                : page}
            </h1>
          </div>

          <div className="networkLive">
            <span />
            Blockchain Network Live
          </div>
        </header>

        {page === "Dashboard" && (
          <Dashboard
            onOpenCase={
              openExistingCase
            }
            onNavigate={
              setPage
            }
          />
        )}

        {page === "Cases" && (
          <Cases
            onOpenCase={
              openExistingCase
            }
          />
        )}

        {page === "Alerts" && (
          <Alerts />
        )}

        {page === "Reports" && (
          <Reports />
        )}

        {page === "Settings" && (
          <SettingsPage />
        )}

        {page === "Investigate" && (
          <>
            <section className="investigationHero">
              <div className="heroText">
                <div className="heroBadge">
                  <Network size={14} />
                  REAL-TIME BLOCKCHAIN TRACE
                </div>

                <h2>
                  Trace a Suspect Wallet
                </h2>

                <p>
                  Enter a victim-reported suspect
                  wallet address. ShadowTrace will
                  validate the wallet, trace fund
                  movement, detect suspicious
                  patterns, calculate risk and
                  generate investigator intelligence.
                </p>
              </div>

              <div className="walletSearchBox">
                <label>
                  SUSPECT WALLET ADDRESS
                </label>

                <div className="walletInputRow">
                  <div className="walletInput">
                    <Wallet size={20} />

                    <input
                      value={
                        walletAddress
                      }
                      onChange={(event) =>
                        setWalletAddress(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !loading
                        ) {
                          startInvestigation();
                        }
                      }}
                      placeholder="Enter Ethereum / supported wallet address"
                    />
                  </div>

                  <button
                    className="traceButton"
                    onClick={
                      startInvestigation
                    }
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2
                        size={19}
                        className="spin"
                      />
                    ) : (
                      <Search size={19} />
                    )}

                    {loading
                      ? "ANALYZING..."
                      : "TRACE WALLET"}
                  </button>
                </div>

                <div className="inputMeta">
                  <span>
                    Chain detection: Automatic
                  </span>

                  <span>
                    Maximum trace depth: 2 hops
                  </span>
                </div>
              </div>
            </section>

            {error && (
              <div className="errorBanner">
                <AlertTriangle size={17} />

                {error}
              </div>
            )}

            {status && (
              <div className="statusBanner">
                {loading ? (
                  <Loader2
                    size={16}
                    className="spin"
                  />
                ) : (
                  <CheckCircle2
                    size={16}
                  />
                )}

                {status}
              </div>
            )}

            <section className="statsRow">
              <StatCard
                icon={<Shield />}
                label="Case ID"
                value={
                  caseData?.case_id ||
                  "—"
                }
              />

              <StatCard
                icon={<Database />}
                label="Blockchain"
                value={
                  caseData?.chain ||
                  "—"
                }
              />

              <StatCard
                icon={<Wallet />}
                label="Total Wallets"
                value={
                  traceStats.totalWallets ||
                  0
                }
              />

              <StatCard
                icon={<Activity />}
                label="Risk"
                value={
                  analysisData
                    ? `${riskLevel} • ${riskScore}/100`
                    : "—"
                }
              />
            </section>

            <section className="workspace">
              <div className="graphCard">
                <div className="cardHeader">
                  <div>
                    <div className="sectionLabel">
                      LIVE FUND FLOW
                    </div>

                    <h3>
                      Transaction Intelligence Graph
                    </h3>

                    <p>
                      Showing{" "}
                      {traceStats.visibleWallets}{" "}
                      of{" "}
                      {traceStats.totalWallets}{" "}
                      traced wallets
                    </p>
                  </div>

                  <div className="graphHeaderActions">
                    <div className="graphModeButtons">
                      <button
                        className={
                          graphMode ===
                          "focused"
                            ? "graphModeButton active"
                            : "graphModeButton"
                        }
                        onClick={() =>
                          switchGraphMode(
                            "focused"
                          )
                        }
                        disabled={
                          !traceData
                        }
                      >
                        <Focus size={14} />
                        Focused View
                      </button>

                      <button
                        className={
                          graphMode ===
                          "full"
                            ? "graphModeButton active"
                            : "graphModeButton"
                        }
                        onClick={() =>
                          switchGraphMode(
                            "full"
                          )
                        }
                        disabled={
                          !traceData
                        }
                      >
                        <Maximize2
                          size={14}
                        />
                        Full Graph
                      </button>
                    </div>

                    <div className="liveIndicator">
                      <span />
                      LIVE
                    </div>
                  </div>
                </div>

                <div className="graphViewInfo">
                  {graphMode === "focused"
                    ? "Focused View displays a limited investigation graph while preserving the complete trace result."
                    : "Full Graph displays all traced wallets and available connections."}
                </div>

                <div className="graphArea">
                  {nodes.length === 0 ? (
                    <div className="emptyGraph">
                      <div className="emptyGraphCircle">
                        <Network size={36} />
                      </div>

                      <h3>
                        Ready for investigation
                      </h3>

                      <p>
                        Enter a suspect wallet
                        above to generate the
                        blockchain transaction graph.
                      </p>
                    </div>
                  ) : (
                    <ReactFlow
                      key={`${caseData?.case_id}-${graphMode}`}
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={
                        onNodesChange
                      }
                      onEdgesChange={
                        onEdgesChange
                      }
                      onNodeClick={
                        onNodeClick
                      }
                      fitView
                      fitViewOptions={{
                        padding: 0.15,
                      }}
                      minZoom={
                        graphMode === "full"
                          ? 0.05
                          : 0.2
                      }
                      maxZoom={1.8}
                    >
                      <Background
                        gap={28}
                        size={1}
                      />

                      <MiniMap
                        pannable
                        zoomable
                      />

                      <Controls />
                    </ReactFlow>
                  )}
                </div>
              </div>

              <aside className="intelColumn">
                <div className="intelCard">
                  <div className="intelTitle">
                    <Shield size={18} />

                    <div>
                      <strong>
                        Investigation Intelligence
                      </strong>

                      <span>
                        Current case analysis
                      </span>
                    </div>
                  </div>

                  <InfoRow
                    label="Case"
                    value={
                      caseData?.case_id ||
                      "—"
                    }
                  />

                  <InfoRow
                    label="Chain"
                    value={
                      caseData?.chain ||
                      "—"
                    }
                  />

                  <InfoRow
                    label="Status"
                    value={
                      caseData?.status ||
                      "—"
                    }
                  />

                  <InfoRow
                    label="Risk Level"
                    value={
                      riskLevel || "—"
                    }
                  />

                  <InfoRow
                    label="Risk Score"
                    value={
                      analysisData
                        ? `${riskScore}/100`
                        : "—"
                    }
                  />

                  <InfoRow
                    label="Patterns"
                    value={
                      patternCount
                    }
                  />

                  <InfoRow
                    label="Trace Depth"
                    value={
                      traceData
                        ? `${traceData.max_hops} Hops`
                        : "—"
                    }
                  />

                  <InfoRow
                    label="Visible Wallets"
                    value={`${traceStats.visibleWallets}/${traceStats.totalWallets}`}
                  />
                </div>

                <div className="intelCard">
                  <div className="intelTitle">
                    <AlertTriangle size={18} />

                    <div>
                      <strong>
                        Risk Assessment
                      </strong>

                      <span>
                        Risk scoring reasons
                      </span>
                    </div>
                  </div>

                  {analysisData?.risk
                    ?.reasons?.length > 0 ? (
                    <div className="alertReasons">
                      {analysisData.risk.reasons.map(
                        (reason, index) => (
                          <div key={index}>
                            • {reason}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="emptyIntel">
                      {analysisData
                        ? "No additional risk indicators were generated."
                        : "Run an investigation to calculate risk."}
                    </div>
                  )}
                </div>

                <div className="intelCard">
                  <div className="intelTitle">
                    <Wallet size={18} />

                    <div>
                      <strong>
                        Selected Wallet
                      </strong>

                      <span>
                        Click any graph node
                      </span>
                    </div>
                  </div>

                  {selectedNode ? (
                    <div className="selectedWallet">
                      <div className="selectedAddress">
                        {
                          selectedNode
                            .data
                            ?.fullAddress
                        }
                      </div>

                      <div className="walletActions">
                        <button
                          onClick={() =>
                            copyWallet(
                              selectedNode
                                .data
                                ?.fullAddress
                            )
                          }
                        >
                          <Copy size={14} />
                          Copy
                        </button>

                        <button
                          type="button"
                        >
                          <ExternalLink
                            size={14}
                          />
                          Inspect
                        </button>
                      </div>

                      <InfoRow
                        label="Hop Level"
                        value={
                          selectedNode
                            .data
                            ?.level ?? 0
                        }
                      />
                    </div>
                  ) : (
                    <div className="emptyIntel">
                      Select a wallet node from
                      the graph to inspect its
                      details.
                    </div>
                  )}
                </div>

                <div className="intelCard nearestVaspCard">
                  <div className="intelTitle">
                    <Building2 size={18} />

                    <div>
                      <strong>
                        Exchange / VASP Attribution
                      </strong>

                      <span>
                        Direct match and nearest traced endpoint
                      </span>
                    </div>
                  </div>

                  {!analysisData ? (
                    <div className="pendingModule">
                      Run an investigation to view attribution results.
                    </div>
                  ) : (
                    <>
                      <InfoRow
                        label="Direct Wallet Match"
                        value={
                          analysisData.exchange_matches?.length > 0
                            ? `${analysisData.exchange_matches.length} MATCHED`
                            : "No direct match"
                        }
                      />

                      {analysisData.exchange_matches?.length > 0 && (
                        <div className="exchangeList">
                          {analysisData.exchange_matches.map(
                            (match, index) => (
                              <div
                                className="exchangeMatch"
                                key={`${match.matched_address}-${index}`}
                              >
                                <strong>
                                  {match.exchange || "Known Exchange"}
                                </strong>

                                <span>
                                  {match.type || "VASP"}
                                </span>

                                <small>
                                  {match.chain || caseData?.chain}
                                </small>

                                <div className="selectedAddress">
                                  {match.matched_address}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div className="intelligenceCardHeader">
                        <div>
                          <span className="intelligenceLabel">
                            FUND ATTRIBUTION
                          </span>

                          <h3>
                            Nearest Exchange / VASP
                          </h3>
                        </div>

                        <span
                          className={
                            analysisData.nearest_vasp?.vasp_found
                              ? "vaspFoundBadge"
                              : "vaspNotFoundBadge"
                          }
                        >
                          {analysisData.nearest_vasp?.vasp_found
                            ? "VASP IDENTIFIED"
                            : "NO VASP MATCH"}
                        </span>
                      </div>

                      {analysisData.nearest_vasp?.vasp_found ? (
                        <>
                          <div className="vaspStatsGrid">
                            <div className="vaspStat">
                              <span>Exchange / VASP</span>
                              <strong>
                                {analysisData.nearest_vasp
                                  .nearest_vasp?.exchange || "Unknown"}
                              </strong>
                            </div>

                            <div className="vaspStat">
                              <span>Entity Type</span>
                              <strong>
                                {analysisData.nearest_vasp
                                  .nearest_vasp?.type || "Unknown"}
                              </strong>
                            </div>

                            <div className="vaspStat">
                              <span>Blockchain</span>
                              <strong>
                                {analysisData.nearest_vasp
                                  .nearest_vasp?.chain ||
                                  caseData?.chain ||
                                  "Unknown"}
                              </strong>
                            </div>

                            <div className="vaspStat">
                              <span>Distance</span>
                              <strong>
                                {analysisData.nearest_vasp.hop_distance}{" "}
                                {analysisData.nearest_vasp.hop_distance === 1
                                  ? "Hop"
                                  : "Hops"}
                              </strong>
                            </div>
                          </div>

                          <div className="vaspMatchInfo">
                            <span>Matched Address</span>

                            <code>
                              {analysisData.nearest_vasp
                                .nearest_vasp?.matched_address}
                            </code>

                            <small>
                              Match Type:{" "}
                              {analysisData.nearest_vasp
                                .nearest_vasp?.match_type ||
                                "KNOWN_EXCHANGE_ADDRESS"}
                            </small>
                          </div>

                          <div className="fundPathSection">
                            <div className="fundPathHeader">
                              Fund Flow Path
                            </div>

                            <div className="fundPath">
                              {(analysisData.nearest_vasp.path || []).map(
                                (wallet, index) => {
                                  const isRoot = index === 0;
                                  const isExchange =
                                    index ===
                                    (analysisData.nearest_vasp.path || [])
                                      .length -
                                      1;

                                  return (
                                    <div
                                      className="fundPathStep"
                                      key={`${wallet}-${index}`}
                                    >
                                      <div
                                        className={`fundPathWallet ${
                                          isRoot
                                            ? "fundPathRoot"
                                            : isExchange
                                            ? "fundPathExchange"
                                            : ""
                                        }`}
                                      >
                                        <span>
                                          {isRoot
                                            ? "Suspect"
                                            : isExchange
                                            ? "VASP"
                                            : `Intermediary ${index}`}
                                        </span>

                                        <code>
                                          {wallet.length > 22
                                            ? `${wallet.slice(
                                                0,
                                                10
                                              )}...${wallet.slice(-8)}`
                                            : wallet}
                                        </code>
                                      </div>

                                      {!isExchange && (
                                        <div className="fundPathArrow">
                                          ↓
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>

                          <div className="vaspRecommendation">
                            <strong>
                              Investigator Recommendation
                            </strong>

                            <p>
                              Known Exchange/VASP endpoint identified in the
                              outgoing fund flow. Preserve the traced path and
                              initiate the appropriate VASP information-
                              preservation or freezing workflow subject to
                              investigator verification and applicable legal
                              procedure.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="vaspEmptyState">
                          <strong>
                            No known Exchange/VASP identified
                          </strong>

                          <p>
                            No address in the currently traced outgoing
                            fund-flow path matched the available Exchange/VASP
                            address dataset.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="intelCard">
                  <div className="intelTitle">
                    <Activity size={18} />

                    <div>
                      <strong>
                        Detected Patterns
                      </strong>

                      <span>
                        Unique transaction behavior types
                      </span>
                    </div>
                  </div>

                  {patternSummary.length > 0 ? (
                    <div className="patternList">
                      {patternSummary.map((item) => (
                        <div
                          className="patternItem"
                          key={item.pattern}
                        >
                          <AlertTriangle size={14} />

                          <div>
                            <strong>
                              {item.pattern}
                            </strong>

                            <span>
                              {item.count.toLocaleString()} finding
                              {item.count === 1 ? "" : "s"}
                              {item.sampleWallet
                                ? ` • ${shortAddress(item.sampleWallet)}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="emptyIntel">
                      {analysisData
                        ? "No suspicious transaction patterns detected."
                        : "Pattern analysis pending."}
                    </div>
                  )}
                </div>

                <div className="intelCard">
                  <div className="intelTitle">
                    <Bell size={18} />

                    <div>
                      <strong>
                        Investigator Alert
                      </strong>

                      <span>
                        Generated automatically
                      </span>
                    </div>
                  </div>
     {analysisData?.alert ? (
                    <>
                      <InfoRow
                        label="Severity"
                        value={
                          analysisData
                            .alert
                            .severity
                        }
                      />

                      <InfoRow
                        label="Alert Type"
                        value={
                          analysisData
                            .alert
                            .alert_type
                        }
                      />

                      <InfoRow
                        label="Risk"
                        value={
                          analysisData
                            .alert
                            .risk_level
                        }
                      />

                      <InfoRow
                        label="Score"
                        value={`${analysisData.alert.risk_score}/100`}
                      />

                      <InfoRow
                        label="Generated"
                        value={
                          analysisData
                            .alert
                            .generated_at
                            ? new Date(
                                analysisData
                                  .alert
                                  .generated_at
                              ).toLocaleString()
                            : "—"
                        }
                      />

                      {analysisData.alert
                        .reasons
                        ?.length > 0 && (
                        <div className="alertReasons">
                          {analysisData.alert.reasons.map(
                            (reason, index) => (
                              <div key={index}>
                                • {reason}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="emptyIntel">
                      Alert generation pending.
                    </div>
                  )}
                </div>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Nav({
  icon,
  label,
  active,
  onClick,
}) {
  return (
    <button
      className={`navButton ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {icon}

      <span>
        {label}
      </span>

      {active && (
        <ChevronRight size={15} />
      )}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="statCard">
      <div className="statIcon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="infoRow">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

export default App;
