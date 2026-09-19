import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  getCases,
} from "../services/api";

function Alerts() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    setError("");

    try {
      const data = await getCases();

      setCases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const alerts = useMemo(() => {
    return cases.filter((item) => {
      const risk = (
        item.risk_level || "UNKNOWN"
      ).toUpperCase();

      return [
        "HIGH",
        "MEDIUM",
        "LOW",
      ].includes(risk);
    });
  }, [cases]);

  const highCount = alerts.filter(
    (item) =>
      item.risk_level?.toUpperCase() ===
      "HIGH"
  ).length;

  const mediumCount = alerts.filter(
    (item) =>
      item.risk_level?.toUpperCase() ===
      "MEDIUM"
  ).length;

  const lowCount = alerts.filter(
    (item) =>
      item.risk_level?.toUpperCase() ===
      "LOW"
  ).length;

  return (
    <div className="pageContainer">
      <div className="pageHeading">
        <div>
          <div className="eyebrow">
            THREAT INTELLIGENCE
          </div>

          <h2>
            Investigation Alerts
          </h2>

          <p>
            Risk alerts generated from analyzed
            cryptocurrency investigation cases.
          </p>
        </div>

        <button
          className="refreshButton"
          onClick={loadAlerts}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="dashboardStats">
        <AlertStat
          icon={<ShieldAlert />}
          title="High Risk"
          value={highCount}
          type="high"
        />

        <AlertStat
          icon={<AlertTriangle />}
          title="Medium Risk"
          value={mediumCount}
          type="medium"
        />

        <AlertStat
          icon={<ShieldCheck />}
          title="Low Risk"
          value={lowCount}
          type="low"
        />

        <AlertStat
          icon={<Activity />}
          title="Total Alerts"
          value={alerts.length}
          type="total"
        />
      </div>

      <div className="alertsPanel">
        <div className="panelHeader">
          <div>
            <span>
              GENERATED ALERTS
            </span>

            <h3>
              Risk Detection Feed
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="emptyPanel">
            Loading alerts...
          </div>
        ) : error ? (
          <div className="emptyPanel">
            {error}
          </div>
        ) : alerts.length === 0 ? (
          <div className="emptyPanel">
            No analyzed risk alerts available yet.
          </div>
        ) : (
          <div className="alertList">
            {alerts.map((item) => {
              const risk =
                item.risk_level?.toUpperCase();

              return (
                <div
                  className={`alertItem alertItem-${risk?.toLowerCase()}`}
                  key={item.case_id}
                >
                  <div
                    className={`alertIcon alertIcon-${risk?.toLowerCase()}`}
                  >
                    <AlertTriangle
                      size={18}
                    />
                  </div>

                  <div className="alertContent">
                    <div className="alertTop">
                      <strong>
                        {risk} Risk Investigation
                      </strong>

                      <span
                        className={`riskBadge risk-${risk?.toLowerCase()}`}
                      >
                        {risk}
                      </span>
                    </div>

                    <div className="alertCase">
                      {item.case_id}
                    </div>

                    <div className="alertWallet">
                      <Wallet size={13} />

                      {item.wallet_address}
                    </div>
                  </div>

                  <div className="alertSide">
                    <span>
                      {item.chain}
                    </span>

                    <strong>
                      {item.status}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertStat({
  icon,
  title,
  value,
  type,
}) {
  return (
    <div
      className={`dashboardCard alertStat-${type}`}
    >
      <div className="dashboardCardIcon">
        {icon}
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default Alerts;
