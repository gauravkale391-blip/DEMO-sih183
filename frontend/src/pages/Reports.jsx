import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileText,
  Download,
  RefreshCw,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import {
  getCases,
  analyzeCase,
  API_BASE,
} from "../services/api";


function Reports() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionCase, setActionCase] = useState(null);
  const [downloadingCase, setDownloadingCase] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCases();
  }, []);


  async function loadCases() {
    setLoading(true);
    setError("");

    try {
      const data = await getCases();

      setCases(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to load investigation cases."
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleAnalyze(item) {
    setActionCase(item.case_id);
    setError("");
    setMessage("");

    try {
      const result = await analyzeCase(
        item.case_id
      );

      const risk =
        result?.analysis?.risk?.risk_level ||
        "UNKNOWN";

      const score =
        result?.analysis?.risk?.risk_score ??
        0;

      setMessage(
        `${item.case_id} analyzed successfully • Risk ${risk} (${score}/100)`
      );

      await loadCases();
    } catch (err) {
      setError(
        err.message ||
          `Failed to analyze ${item.case_id}.`
      );
    } finally {
      setActionCase(null);
    }
  }


  async function handleDownload(item) {
    setDownloadingCase(item.case_id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/api/reports/${item.case_id}/pdf`
      );

      if (!response.ok) {
        let detail =
          `PDF generation failed (${response.status})`;

        try {
          const data = await response.json();

          detail =
            data?.detail ||
            detail;
        } catch {
          // Response was not JSON.
        }

        throw new Error(detail);
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `ShadowTrace_${item.case_id}_Investigation_Report.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      setMessage(
        `${item.case_id} investigation report generated successfully.`
      );

      await loadCases();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          `Failed to generate report for ${item.case_id}.`
      );
    } finally {
      setDownloadingCase(null);
    }
  }


  const analyzedCases =
    useMemo(() => {
      return cases.filter(
        (item) =>
          item.status === "ANALYZED"
      ).length;
    }, [cases]);


  const pendingCases =
    useMemo(() => {
      return cases.filter(
        (item) =>
          item.status !== "ANALYZED"
      ).length;
    }, [cases]);


  return (
    <div className="pageContainer">

      <div className="pageHeading">

        <div>
          <div className="eyebrow">
            INVESTIGATION EVIDENCE
          </div>

          <h2>
            Investigation Reports
          </h2>

          <p>
            Analyze cryptocurrency fraud cases
            and generate investigator-ready
            ShadowTrace PDF reports.
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
          <AlertTriangle size={17} />
          {error}
        </div>
      )}


      {message && (
        <div className="statusBanner">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}


      <div className="dashboardStats">

        <ReportStat
          icon={<FileText />}
          label="Total Cases"
          value={cases.length}
        />

        <ReportStat
          icon={<CheckCircle2 />}
          label="Analyzed"
          value={analyzedCases}
        />

        <ReportStat
          icon={<Clock />}
          label="Pending"
          value={pendingCases}
        />

        <ReportStat
          icon={<Download />}
          label="PDF Reports"
          value="Ready"
        />

      </div>


      <div className="casesTableCard">

        {loading ? (

          <div className="emptyPanel">
            <Loader2
              size={18}
              className="spin"
            />

            Loading investigation cases...
          </div>

        ) : cases.length === 0 ? (

          <div className="emptyPanel">
            <FileText size={22} />

            No investigation cases available.
          </div>

        ) : (

          <div className="casesTableWrapper">

            <table className="casesTable">

              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Wallet</th>
                  <th>Chain</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Analysis</th>
                  <th>Report</th>
                </tr>
              </thead>


              <tbody>

                {cases.map((item) => {

                  const risk =
                    (
                      item.risk_level ||
                      "UNKNOWN"
                    ).toUpperCase();

                  const isAnalyzing =
                    actionCase ===
                    item.case_id;

                  const isDownloading =
                    downloadingCase ===
                    item.case_id;

                  return (

                    <tr key={item.case_id}>

                      <td>
                        <strong>
                          {item.case_id}
                        </strong>

                        {item.complaint_id && (
                          <small className="caseComplaint">
                            {item.complaint_id}
                          </small>
                        )}
                      </td>


                      <td className="walletTableCell">
                        {shortAddress(
                          item.wallet_address
                        )}
                      </td>


                      <td>
                        <span className="chainBadge">
                          {item.chain ||
                            "UNKNOWN"}
                        </span>
                      </td>


                      <td>
                        <span
                          className={`riskBadge risk-${risk.toLowerCase()}`}
                        >
                          {risk}
                        </span>
                      </td>


                      <td>
                        <span className="statusBadge">
                          {item.status ||
                            "UNKNOWN"}
                        </span>
                      </td>


                      <td>

                        <button
                          type="button"
                          className="reportAnalyzeButton"
                          onClick={() =>
                            handleAnalyze(item)
                          }
                          disabled={
                            isAnalyzing ||
                            isDownloading
                          }
                        >

                          {isAnalyzing ? (
                            <>
                              <Loader2
                                size={13}
                                className="spin"
                              />

                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Activity size={13} />

                              {item.status ===
                              "ANALYZED"
                                ? "Re-analyze"
                                : "Analyze"}
                            </>
                          )}

                        </button>

                      </td>


                      <td>

                        <button
                          type="button"
                          className="reportDownloadButton"
                          onClick={() =>
                            handleDownload(item)
                          }
                          disabled={
                            isDownloading ||
                            isAnalyzing
                          }
                        >

                          {isDownloading ? (
                            <>
                              <Loader2
                                size={13}
                                className="spin"
                              />

                              Generating...
                            </>
                          ) : (
                            <>
                              <Download size={13} />

                              Download PDF
                            </>
                          )}

                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}


function ReportStat({
  icon,
  label,
  value,
}) {
  return (
    <div className="dashboardCard">

      <div className="dashboardCardIcon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

    </div>
  );
}


function shortAddress(address) {
  if (!address) {
    return "Unknown";
  }

  if (address.length <= 24) {
    return address;
  }

  return `${address.slice(
    0,
    12
  )}...${address.slice(-10)}`;
}


export default Reports;
