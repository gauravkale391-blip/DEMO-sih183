import { useMemo, useState } from "react";
import Papa from "papaparse";
import {
  Shield,
  LayoutDashboard,
  Search,
  FolderOpen,
  Bell,
  FileText,
  Settings,
  Upload,
  Activity,
  AlertTriangle,
  Database,
  ChevronRight,
  Download,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock3,
  ArrowUpRight,
  Wallet,
  Building2,
  RefreshCw,
  X,
} from "lucide-react";

import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const initialNodes = [
  {
    id: "suspect",
    x: 330,
    y: 230,
    type: "suspect",
    label: "SUSPECT WALLET",
    address: "0x1234...7890",
  },
  {
    id: "w1",
    x: 520,
    y: 130,
    type: "wallet",
    label: "WALLET",
    address: "0xe8b0...466f",
  },
  {
    id: "w2",
    x: 550,
    y: 330,
    type: "wallet",
    label: "WALLET",
    address: "0x6284...2afe",
  },
  {
    id: "w3",
    x: 750,
    y: 160,
    type: "risk",
    label: "HIGH RISK",
    address: "0xa708...c2eb",
  },
  {
    id: "w4",
    x: 770,
    y: 350,
    type: "wallet",
    label: "WALLET",
    address: "0x1ced...49d6",
  },
  {
    id: "exchange",
    x: 970,
    y: 250,
    type: "exchange",
    label: "EXCHANGE",
    address: "EXCHANGE_A",
  },
];

function App() {
  const [page, setPage] = useState("Investigate");

  const [file, setFile] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [nodes, setNodes] = useState(initialNodes);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [analysis, setAnalysis] = useState(null);

  const [zoom, setZoom] = useState(1);
  const [showFilter, setShowFilter] = useState(false);

  const [caseId, setCaseId] = useState("CASE-001");

  const [filter, setFilter] = useState("ALL");

  const stats = useMemo(() => {
    return {
      wallets: nodes.length,
      transactions: transactions.length || 14,
      hops: analysis?.trace?.max_hops || 2,
    };
  }, [nodes, transactions, analysis]);

  // -----------------------------
  // NAVIGATION
  // -----------------------------

  const navigate = (nextPage) => {
    setPage(nextPage);
    setMessage("");

    if (nextPage !== "Investigate") {
      setShowFilter(false);
    }
  };

  // -----------------------------
  // CSV IMPORT
  // -----------------------------

  const handleFile = (e) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    setFile(selected);
    setMessage("Reading transaction CSV...");

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,

      complete: (result) => {
        const cleaned = result.data
          .map((row) => ({
            from: row.from || row.sender || row.From || "",
            to: row.to || row.receiver || row.To || "",
            value: row.value || row.amount || "0",
            timestamp:
              row.timestamp ||
              row.time ||
              row.date ||
              new Date().toISOString(),
            tx_hash:
              row.tx_hash ||
              row.hash ||
              row.transaction_hash ||
              "",
          }))
          .filter((tx) => tx.from && tx.to);

        setTransactions(cleaned);

        if (cleaned.length > 0) {
          buildGraphFromCSV(cleaned);

          setMessage(
            `✓ ${cleaned.length} transactions imported successfully`
          );
        } else {
          setMessage(
            "CSV loaded, but no valid from → to transactions were found."
          );
        }
      },

      error: (error) => {
        setMessage(`CSV error: ${error.message}`);
      },
    });
  };

  // -----------------------------
  // BUILD GRAPH FROM CSV
  // -----------------------------

  const shorten = (address) => {
    if (!address) return "UNKNOWN";

    if (address.length <= 14) return address;

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const buildGraphFromCSV = (txs) => {
    const walletMap = new Map();

    txs.forEach((tx) => {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();

      if (!walletMap.has(from)) {
        walletMap.set(from, {
          id: from,
          address: shorten(from),
          fullAddress: from,
          type: "wallet",
        });
      }

      if (!walletMap.has(to)) {
        walletMap.set(to, {
          id: to,
          address: shorten(to),
          fullAddress: to,
          type: "wallet",
        });
      }
    });

    const walletArray = Array.from(walletMap.values());

    const suspectAddress = walletArray[0]?.fullAddress;

    const generated = walletArray.slice(0, 10).map((wallet, index) => {
      let type = "wallet";

      if (index === 0) {
        type = "suspect";
      } else if (index === walletArray.length - 1) {
        type = "exchange";
      }

      return {
        id: wallet.id,
        x: 120 + (index % 3) * 230,
        y: 80 + Math.floor(index / 3) * 150,
        type,
        label:
          type === "suspect"
            ? "SUSPECT WALLET"
            : type === "exchange"
            ? "EXCHANGE"
            : "WALLET",
        address: wallet.address,
        fullAddress: wallet.fullAddress,
      };
    });

    if (suspectAddress) {
      setCaseId("CASE-CSV");

      setNodes(generated);
    }
  };

  // -----------------------------
  // RUN ANALYSIS
  // -----------------------------

  const runAnalysis = async () => {
    setLoading(true);
    setMessage("Running blockchain intelligence analysis...");

    try {
      /*
       * First try the existing CASE-001.
       * Your FastAPI backend already exposes:
       * POST /api/cases/{case_id}/analyze
       */

      const response = await fetch(
        `${API_BASE}/api/cases/${caseId}/analyze`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || `Analysis failed (${response.status})`
        );
      }

      setAnalysis(data);

      /*
       * Convert backend graph into frontend nodes
       */

      if (data.trace?.graph) {
        buildGraphFromBackend(data.trace.graph);
      }

      setMessage("✓ Analysis completed successfully");
    } catch (error) {
      console.error(error);

      setMessage(
        `Backend analysis failed: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // BACKEND GRAPH
  // -----------------------------

  const buildGraphFromBackend = (graph) => {
    const walletIds = new Set();

    Object.entries(graph).forEach(([wallet, info]) => {
      walletIds.add(wallet);

      (info.connected_wallets || []).forEach((connected) => {
        walletIds.add(connected);
      });
    });

    const wallets = Array.from(walletIds);

    const generated = wallets.slice(0, 30).map((wallet, index) => {
      const root =
        Object.keys(graph)[0]?.toLowerCase() === wallet.toLowerCase();

      return {
        id: wallet,
        x: 70 + (index % 4) * 220,
        y: 70 + Math.floor(index / 4) * 135,
        type: root ? "suspect" : "wallet",
        label: root ? "SUSPECT WALLET" : "WALLET",
        address: shorten(wallet),
        fullAddress: wallet,
      };
    });

    setNodes(generated);
  };

  // -----------------------------
  // EXPORT REPORT
  // -----------------------------

  const exportReport = () => {
    const report = {
      platform: "BLOCKTRACE FORENSIC INTELLIGENCE",
      case_id: caseId,
      generated_at: new Date().toISOString(),
      transactions,
      analysis,
    };

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${caseId}-blocktrace-report.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setMessage("✓ Investigation report exported");
  };

  // -----------------------------
  // GRAPH CONTROLS
  // -----------------------------

  const zoomIn = () => {
    setZoom((value) => Math.min(value + 0.15, 1.8));
  };

  const zoomOut = () => {
    setZoom((value) => Math.max(value - 0.15, 0.55));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const fullscreenGraph = () => {
    const graph = document.querySelector(".graphPanel");

    if (graph?.requestFullscreen) {
      graph.requestFullscreen();
    }
  };

  // -----------------------------
  // RISK DATA
  // -----------------------------

  const riskScore =
    analysis?.analysis?.risk?.risk_score ?? 87;

  const riskLevel =
    analysis?.analysis?.risk?.risk_level ?? "HIGH";

  const patterns =
    analysis?.analysis?.pattern_findings || [];

  const exchangeMatches =
    analysis?.analysis?.exchange_matches || [];

  const reasons =
    analysis?.analysis?.risk?.reasons || [
      "Layering detected (+20)",
      "Peeling chain (+20)",
      "Round-trip activity (+25)",
      "Known exchange address matched (+30)",
    ];

  return (
    <div className="app">

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brandIcon">
            <Shield size={22} />
          </div>

          <div>
            <div className="brandName">
              BLOCKTRACE
            </div>

            <div className="brandSub">
              FORENSIC INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="menuTitle">
          WORKSPACE
        </div>

        <Nav
          icon={<LayoutDashboard />}
          text="Dashboard"
          active={page === "Dashboard"}
          onClick={() => navigate("Dashboard")}
        />

        <Nav
          icon={<Search />}
          text="Investigate"
          active={page === "Investigate"}
          onClick={() => navigate("Investigate")}
        />

        <Nav
          icon={<FolderOpen />}
          text="Cases"
          active={page === "Cases"}
          onClick={() => navigate("Cases")}
        />

        <Nav
          icon={<Bell />}
          text="Alerts"
          active={page === "Alerts"}
          onClick={() => navigate("Alerts")}
        />

        <Nav
          icon={<FileText />}
          text="Reports"
          active={page === "Reports"}
          onClick={() => navigate("Reports")}
        />

        <div className="menuTitle second">
          SYSTEM
        </div>

        <Nav
          icon={<Settings />}
          text="Settings"
          active={page === "Settings"}
          onClick={() => navigate("Settings")}
        />

        <div className="sidebarBottom">

          <div className="systemStatus">
            <span className="pulse"></span>

            <div>
              <b>SYSTEM ONLINE</b>
              <small>
                All services operational
              </small>
            </div>
          </div>

          <div className="version">
            BLOCKTRACE v1.0.0
          </div>

        </div>
      </aside>

      {/* ================= MAIN ================= */}

      <main className="main">

        {/* TOPBAR */}

        <header className="topbar">

          <div>
            <div className="breadcrumb">
              CASE MANAGEMENT / {page.toUpperCase()}
            </div>

            <h1>
              {page === "Investigate"
                ? "Investigation Workspace"
                : page}
            </h1>
          </div>

          <div className="topActions">

            <div className="chainBadge">
              <span className="greenDot"></span>
              ETHEREUM NETWORK
            </div>

            <button
              className="iconButton"
              onClick={() => navigate("Alerts")}
              title="Alerts"
            >
              <Bell size={18} />
            </button>

            <div className="profile">

              <div className="avatar">
                IN
              </div>

              <div>
                <b>Investigator</b>
                <small>Analyst</small>
              </div>

            </div>

          </div>

        </header>

        {/* ================= OTHER PAGES ================= */}

        {page !== "Investigate" ? (

          <section className="panel pagePlaceholder">

            <div className="panelHeader">

              <div>
                <h3>
                  {page} Module
                </h3>

                <p>
                  BLOCKTRACE forensic intelligence workspace
                </p>
              </div>

            </div>

            <div className="placeholderContent">

              <Activity size={42} />

              <h2>
                {page}
              </h2>

              <p>
                Module initialized successfully.
              </p>

              {page === "Reports" && (
                <button
                  className="primaryBtn"
                  onClick={exportReport}
                >
                  <Download size={16} />
                  EXPORT CURRENT REPORT
                </button>
              )}

            </div>

          </section>

        ) : (

          <>

            {/* ================= CASE HEADER ================= */}

            <section className="caseHeader">

              <div>

                <div className="caseLabel">
                  ACTIVE INVESTIGATION
                </div>

                <h2>
                  {caseId}
                  <span>•</span>
                  Cryptocurrency Investment Fraud
                </h2>

                <div className="caseMeta">

                  <span>
                    <Clock3 size={14} />
                    Updated just now
                  </span>

                  <span>
                    <Database size={14} />
                    Ethereum
                  </span>

                  <span>
                    <Activity size={14} />
                    {analysis?.trace?.max_hops || 2}
                    -hop analysis
                  </span>

                </div>

              </div>

              <div className="caseButtons">

                <button
                  className="secondaryBtn"
                  onClick={exportReport}
                >
                  <Download size={16} />
                  Export Report
                </button>

                <button
                  className="primaryBtn"
                  onClick={runAnalysis}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw
                      size={16}
                      className="spin"
                    />
                  ) : (
                    <Activity size={16} />
                  )}

                  {loading
                    ? "Running..."
                    : "Run Analysis"}
                </button>

              </div>

            </section>

            {/* STATUS MESSAGE */}

            {message && (
              <div className="statusMessage">
                {message}
                <button
                  onClick={() => setMessage("")}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ================= WORKSPACE ================= */}

            <div className="workspace">

              {/* GRAPH */}

              <section className="graphPanel panel">

                <div className="panelHeader">

                  <div>

                    <h3>
                      Transaction Intelligence Graph
                    </h3>

                    <p>
                      Fund flow visualization •{" "}
                      {stats.wallets} wallets analyzed
                    </p>

                  </div>

                  <div className="graphTools">

                    <button
                      onClick={() =>
                        setShowFilter(!showFilter)
                      }
                      title="Filter"
                    >
                      <Filter size={16} />
                    </button>

                    <button
                      onClick={zoomIn}
                      title="Zoom in"
                    >
                      <ZoomIn size={16} />
                    </button>

                    <button
                      onClick={zoomOut}
                      title="Zoom out"
                    >
                      <ZoomOut size={16} />
                    </button>

                    <button
                      onClick={resetZoom}
                      title="Reset zoom"
                    >
                      <RefreshCw size={16} />
                    </button>

                    <button
                      onClick={fullscreenGraph}
                      title="Fullscreen"
                    >
                      <Maximize2 size={16} />
                    </button>

                  </div>

                </div>

                {/* FILTER */}

                {showFilter && (
                  <div className="graphFilter">

                    <button
                      className={
                        filter === "ALL"
                          ? "filterActive"
                          : ""
                      }
                      onClick={() =>
                        setFilter("ALL")
                      }
                    >
                      All
                    </button>

                    <button
                      className={
                        filter === "SUSPECT"
                          ? "filterActive"
                          : ""
                      }
                      onClick={() =>
                        setFilter("SUSPECT")
                      }
                    >
                      Suspect
                    </button>

                    <button
                      className={
                        filter === "WALLET"
                          ? "filterActive"
                          : ""
                      }
                      onClick={() =>
                        setFilter("WALLET")
                      }
                    >
                      Wallets
                    </button>

                    <button
                      className={
                        filter === "EXCHANGE"
                          ? "filterActive"
                          : ""
                      }
                      onClick={() =>
                        setFilter("EXCHANGE")
                      }
                    >
                      Exchanges
                    </button>

                  </div>
                )}

                <div className="graph">

                  <div className="graphGrid"></div>

                  <div
                    className="graphCanvas"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "center center",
                    }}
                  >

                    {/* EDGES */}

                    <svg className="edges">

                      {nodes.slice(1).map(
                        (node, index) => {

                          const source =
                            nodes[0];

                          return (
                            <line
                              key={`${source.id}-${node.id}-${index}`}
                              x1={source.x + 70}
                              y1={source.y + 45}
                              x2={node.x + 70}
                              y2={node.y + 45}
                            />
                          );
                        }
                      )}

                    </svg>

                    {/* NODES */}

                    {nodes
                      .filter((node) => {
                        if (filter === "ALL")
                          return true;

                        return (
                          node.type ===
                          filter.toLowerCase()
                        );
                      })
                      .map((node) => (
                        <GraphNode
                          key={node.id}
                          {...node}
                        />
                      ))}

                  </div>

                  <div className="graphLegend">

                    <div>
                      <i className="legendSuspect"></i>
                      Suspect
                    </div>

                    <div>
                      <i className="legendWallet"></i>
                      Wallet
                    </div>

                    <div>
                      <i className="legendRisk"></i>
                      High Risk
                    </div>

                    <div>
                      <i className="legendExchange"></i>
                      Exchange
                    </div>

                  </div>

                  <div className="graphStats">

                    <div>
                      <b>{stats.wallets}</b>
                      <span>WALLETS</span>
                    </div>

                    <div>
                      <b>{stats.transactions}</b>
                      <span>TRANSACTIONS</span>
                    </div>

                    <div>
                      <b>{stats.hops}</b>
                      <span>HOPS</span>
                    </div>

                  </div>

                </div>

              </section>

              {/* ================= RIGHT PANEL ================= */}

              <aside className="rightColumn">

                {/* RISK */}

                <section className="panel riskPanel">

                  <div className="panelHeader">

                    <div>
                      <h3>
                        Threat Assessment
                      </h3>

                      <p>
                        Automated risk analysis
                      </p>
                    </div>

                    <AlertTriangle
                      size={19}
                      className="warningIcon"
                    />

                  </div>

                  <div className="riskScore">

                    <div className="scoreCircle">

                      <strong>
                        {riskScore}
                      </strong>

                      <span>/100</span>

                    </div>

                    <div>

                      <div className="critical">
                        {riskLevel === "HIGH"
                          ? "CRITICAL RISK"
                          : riskLevel}
                      </div>

                      <small>
                        Immediate investigation required
                      </small>

                    </div>

                  </div>

                  <div className="riskBar">
                    <div
                      style={{
                        width: `${riskScore}%`,
                      }}
                    />
                  </div>

                  <div className="riskReasons">

                    {reasons.map(
                      (reason, index) => {

                        const parts =
                          reason.match(
                            /(.+?)\s*\(\+(\d+)\)/
                          );

                        return (
                          <div key={index}>

                            <span>
                              {parts
                                ? parts[1]
                                : reason}
                            </span>

                            <b>
                              {parts
                                ? `+${parts[2]}`
                                : ""}
                            </b>

                          </div>
                        );
                      }
                    )}

                  </div>

                </section>

                {/* EXCHANGE */}

                <section className="panel exchangePanel">

                  <div className="panelHeader">

                    <div>
                      <h3>
                        Exchange Intelligence
                      </h3>

                      <p>
                        Known VASP address match
                      </p>
                    </div>

                    <Building2 size={19} />

                  </div>

                  <div className="exchangeBox">

                    <div className="exchangeIcon">
                      <Building2 size={22} />
                    </div>

                    <div>

                      <b>
                        {exchangeMatches[0]?.exchange ||
                          "Exchange_A"}
                      </b>

                      <span>
                        {exchangeMatches[0]?.type ||
                          "Centralized Exchange"}
                      </span>

                      <small>
                        {exchangeMatches[0]
                          ?.matched_address ||
                          "0x1111...1111"}
                      </small>

                    </div>

                    <div className="matched">
                      {exchangeMatches.length > 0
                        ? "MATCHED"
                        : "DEMO"}
                    </div>

                  </div>

                </section>

                {/* PATTERNS */}

                <section className="panel patternsPanel">

                  <div className="panelHeader">

                    <div>
                      <h3>
                        Detected Patterns
                      </h3>

                      <p>
                        Suspicious behavioral indicators
                      </p>
                    </div>

                  </div>

                  {patterns.length > 0
                    ? patterns
                        .slice(0, 8)
                        .map((item, index) => (
                          <Pattern
                            key={index}
                            name={
                              item.pattern ||
                              "SUSPICIOUS ACTIVITY"
                            }
                            score=""
                          />
                        ))
                    : (
                      <>
                        <Pattern
                          name="LAYERING"
                          score="+20"
                        />

                        <Pattern
                          name="PEELING CHAIN"
                          score="+20"
                        />

                        <Pattern
                          name="ROUND TRIP"
                          score="+25"
                        />

                        <Pattern
                          name="FAN-OUT"
                          score="+15"
                        />
                      </>
                    )}

                </section>

              </aside>

            </div>

            {/* ================= CSV ================= */}

            <section className="importPanel panel">

              <div>

                <div className="importTitle">

                  <Upload size={20} />

                  <div>
                    <h3>
                      Import Transaction Intelligence
                    </h3>

                    <p>
                      Upload blockchain transaction data
                      in CSV format
                    </p>
                  </div>

                </div>

              </div>

              <label className="dropZone">

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFile}
                />

                <Upload size={26} />

                {file ? (
                  <>
                    <b>{file.name}</b>

                    <span>
                      {transactions.length} transactions
                      imported • Ready for analysis
                    </span>
                  </>
                ) : (
                  <>
                    <b>
                      Drop transaction CSV here
                    </b>

                    <span>
                      or click to browse files
                    </span>
                  </>
                )}

              </label>

              <button
                className="analyzeBtn"
                onClick={runAnalysis}
                disabled={loading}
              >

                {loading ? (
                  <RefreshCw
                    size={17}
                    className="spin"
                  />
                ) : (
                  <Search size={17} />
                )}

                {loading
                  ? "ANALYZING..."
                  : "START INVESTIGATION"}

                <ArrowUpRight size={16} />

              </button>

            </section>

          </>
        )}

        <footer>

          <span>
            BLOCKTRACE FORENSIC INTELLIGENCE PLATFORM
          </span>

          <span>
            SECURE • AUDITABLE • REAL-TIME
          </span>

        </footer>

      </main>
    </div>
  );
}

// =====================================================
// NAV
// =====================================================

function Nav({
  icon,
  text,
  active,
  onClick,
}) {
  return (
    <button
      className={`navItem ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {icon}

      <span>{text}</span>

      {active && (
        <ChevronRight size={15} />
      )}
    </button>
  );
}

// =====================================================
// GRAPH NODE
// =====================================================

function GraphNode({
  x,
  y,
  type,
  label,
  address,
}) {
  return (
    <div
      className={`graphNode ${type}`}
      style={{
        left: x,
        top: y,
      }}
    >

      <div className="nodeIcon">

        {type === "exchange" ? (
          <Building2 size={20} />
        ) : (
          <Wallet size={20} />
        )}

      </div>

      <div className="nodeText">

        <b>{label}</b>

        <span>{address}</span>

      </div>

    </div>
  );
}

// =====================================================
// PATTERN
// =====================================================

function Pattern({
  name,
  score,
}) {
  return (
    <div className="pattern">

      <div className="patternIcon">
        !
      </div>

      <span>
        {name}
      </span>

      <b>
        {score}
      </b>

    </div>
  );
}

export default App;
