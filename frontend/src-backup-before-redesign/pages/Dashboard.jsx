import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Database,
  FolderOpen,
  Network,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

import {
  getCases,
} from "../services/api";

function Dashboard({
  onOpenCase,
  onNavigate,
}) {
  const [cases, setCases] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    setError("");

    try {
      const data =
        await getCases();

      setCases(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeCases =
    useMemo(() => {
      return cases.filter(
        (item) =>
          item.status !==
          "ANALYZED"
      ).length;
    }, [cases]);

  const analyzedCases =
    useMemo(() => {
      return cases.filter(
        (item) =>
          item.status ===
          "ANALYZED"
      ).length;
    }, [cases]);

  const evmCases =
    useMemo(() => {
      return cases.filter(
        (item) => {
          const chain =
            (
              item.chain || ""
            ).toUpperCase();

          return (
            chain === "EVM" ||
            chain ===
              "ETHEREUM"
          );
        }
      ).length;
    }, [cases]);

  const recentCases =
    useMemo(() => {
      return cases.slice(0, 6);
    }, [cases]);

  return (
    <div className="pageContainer">
      <div className="pageHeading">
        <div>
          <div className="eyebrow">
            INVESTIGATION OVERVIEW
          </div>

          <h2>
            Intelligence Dashboard
          </h2>

          <p>
            Overview of cryptocurrency
            investigations, analyzed cases
            and blockchain activity.
          </p>
        </div>

        <button
          className="refreshButton"
          onClick={loadCases}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="errorBanner">
          {error}
        </div>
      )}

      <div className="dashboardStats">
        <div
          className="dashboardCard clickableDashboardCard"
          role="button"
          tabIndex={0}
          onClick={() =>
            onNavigate?.("Cases")
          }
          onKeyDown={(event) => {
            if (
              event.key ===
                "Enter" ||
              event.key === " "
            ) {
              onNavigate?.(
                "Cases"
              );
            }
          }}
        >
          <div className="dashboardCardIcon">
            <FolderOpen size={20} />
          </div>

          <div>
            <span>
              Total Cases
            </span>

            <strong>
              {cases.length}
            </strong>
          </div>
        </div>

        <div
          className="dashboardCard clickableDashboardCard"
          role="button"
          tabIndex={0}
          onClick={() =>
            onNavigate?.("Cases")
          }
          onKeyDown={(event) => {
            if (
              event.key ===
                "Enter" ||
              event.key === " "
            ) {
              onNavigate?.(
                "Cases"
              );
            }
          }}
        >
          <div className="dashboardCardIcon">
            <Activity size={20} />
          </div>

          <div>
            <span>
              Active Cases
            </span>

            <strong>
              {activeCases}
            </strong>
          </div>
        </div>

        <div
          className="dashboardCard clickableDashboardCard"
          role="button"
          tabIndex={0}
          onClick={() =>
            onNavigate?.("Cases")
          }
        >
          <div className="dashboardCardIcon">
            <Network size={20} />
          </div>

          <div>
            <span>
              EVM Cases
            </span>

            <strong>
              {evmCases}
            </strong>
          </div>
        </div>

        <div
          className="dashboardCard clickableDashboardCard"
          role="button"
          tabIndex={0}
          onClick={() =>
            onNavigate?.("Settings")
          }
        >
          <div className="dashboardCardIcon">
            <ShieldCheck
              size={20}
            />
          </div>

          <div>
            <span>
              System
            </span>

            <strong>
              Operational
            </strong>
          </div>
        </div>
      </div>

      <div className="dashboardGrid">
        <div className="dashboardPanel">
          <div className="panelHeader">
            <div>
              <span>
                RECENT ACTIVITY
              </span>

              <h3>
                Recent Investigations
              </h3>
            </div>

            <button
              className="dashboardTextButton"
              onClick={() =>
                onNavigate?.(
                  "Cases"
                )
              }
            >
              View All
              <ChevronRight
                size={14}
              />
            </button>
          </div>

          {loading ? (
            <div className="emptyPanel">
              Loading investigations...
            </div>
          ) : recentCases.length ===
            0 ? (
            <div className="emptyPanel">
              No investigations available.
            </div>
          ) : (
            <div className="recentCasesList">
              {recentCases.map(
                (item) => (
                  <div
                    key={
                      item.case_id
                    }
                    className="recentCase recentCaseClickable"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onOpenCase?.(
                        item
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key ===
                          " "
                      ) {
                        onOpenCase?.(
                          item
                        );
                      }
                    }}
                  >
                    <div className="recentCaseMain">
                      <div className="recentCaseIcon">
                        <Database
                          size={16}
                        />
                      </div>

                      <div>
                        <strong>
                          {
                            item.case_id
                          }
                        </strong>

                        <span>
                          {shortAddress(
                            item.wallet_address
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="recentCaseMeta">
                      <span
                        className={`riskBadge risk-${(
                          item.risk_level ||
                          "UNKNOWN"
                        ).toLowerCase()}`}
                      >
                        {item.risk_level ||
                          "UNKNOWN"}
                      </span>

                      <span className="statusBadge">
                        {item.status}
                      </span>

                      <ChevronRight
                        size={14}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="dashboardPanel">
          <div className="panelHeader">
            <div>
              <span>
                PLATFORM STATUS
              </span>

              <h3>
                System Status
              </h3>
            </div>
          </div>

          <StatusRow
            name="FastAPI Backend"
            value="Operational"
          />

          <StatusRow
            name="PostgreSQL"
            value="Connected"
          />

          <StatusRow
            name="Blockchain Tracing"
            value="Enabled"
          />

          <StatusRow
            name="Risk Analysis"
            value="Enabled"
          />

          <StatusRow
            name="Analyzed Cases"
            value={`${analyzedCases}`}
          />

          <button
            className="dashboardSystemButton"
            onClick={() =>
              onNavigate?.(
                "Settings"
              )
            }
          >
            Open System Settings
            <ChevronRight
              size={14}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  name,
  value,
}) {
  return (
    <div className="statusRow">
      <div>
        <span className="statusDot" />

        <span>
          {name}
        </span>
      </div>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function shortAddress(address) {
  if (!address) {
    return "Unknown";
  }

  if (address.length <= 20) {
    return address;
  }

  return `${address.slice(
    0,
    10
  )}...${address.slice(-8)}`;
}

export default Dashboard;
