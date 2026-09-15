import {
  useEffect,
  useState,
} from "react";

import {
  Server,
  Database,
  Network,
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import {
  API_BASE,
  getHealth,
} from "../services/api";

function SettingsPage() {
  const [health, setHealth] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getHealth();

      setHealth(result);
    } catch (err) {
      setHealth(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const online =
    health?.status === "healthy";

  return (
    <div className="pageContainer">
      <div className="pageHeading">
        <div>
          <div className="eyebrow">
            SYSTEM CONFIGURATION
          </div>

          <h2>
            ShadowTrace Settings
          </h2>

          <p>
            Backend connectivity and
            investigation system status.
          </p>
        </div>

        <button
          className="refreshButton"
          onClick={checkHealth}
        >
          <RefreshCw size={15} />
          Check System
        </button>
      </div>

      <div className="settingsGrid">
        <div className="settingsCard">
          <div className="settingsIcon">
            <Server />
          </div>

          <div>
            <span>
              FastAPI Backend
            </span>

            <strong>
              {loading
                ? "Checking..."
                : online
                ? "Operational"
                : "Offline"}
            </strong>
          </div>

          {online ? (
            <CheckCircle2
              className="settingsOk"
            />
          ) : (
            <XCircle
              className="settingsError"
            />
          )}
        </div>

        <div className="settingsCard">
          <div className="settingsIcon">
            <Database />
          </div>

          <div>
            <span>
              Case Database
            </span>

            <strong>
              PostgreSQL
            </strong>
          </div>
        </div>

        <div className="settingsCard">
          <div className="settingsIcon">
            <Network />
          </div>

          <div>
            <span>
              Blockchain Engine
            </span>

            <strong>
              EVM Tracing
            </strong>
          </div>
        </div>

        <div className="settingsCard">
          <div className="settingsIcon">
            <Shield />
          </div>

          <div>
            <span>
              Analysis Engine
            </span>

            <strong>
              Enabled
            </strong>
          </div>
        </div>
      </div>

      <div className="dashboardPanel settingsDetails">
        <div className="panelHeader">
          <div>
            <span>
              API CONFIGURATION
            </span>

            <h3>
              ShadowTrace Backend
            </h3>
          </div>
        </div>

        <SettingRow
          label="API Base URL"
          value={API_BASE}
        />

        <SettingRow
          label="Health Endpoint"
          value="/health"
        />

        <SettingRow
          label="Case API"
          value="/api/cases/"
        />

        <SettingRow
          label="Analysis API"
          value="/api/cases/{case_id}/analyze"
        />

        <SettingRow
          label="Trace Depth"
          value="2 Hops"
        />

        {error && (
          <div className="settingsErrorMessage">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
}) {
  return (
    <div className="settingRow">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

export default SettingsPage;
