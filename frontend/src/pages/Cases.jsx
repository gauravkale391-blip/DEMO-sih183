import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  RefreshCw,
  Search,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

import {
  getCases,
} from "../services/api";

function Cases({
  onOpenCase,
}) {
  const [cases, setCases] =
    useState([]);

  const [search, setSearch] =
    useState("");

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
          "Failed to load cases."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredCases =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return cases;
      }

      return cases.filter(
        (item) => {
          return [
            item.case_id,
            item.complaint_id,
            item.wallet_address,
            item.chain,
            item.fraud_type,
            item.status,
            item.risk_level,
            item.currency,
          ].some((value) =>
            String(
              value || ""
            )
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      cases,
      search,
    ]);

  return (
    <div className="pageContainer">
      <div className="pageHeading">
        <div>
          <div className="eyebrow">
            CASE MANAGEMENT
          </div>

          <h2>
            Investigation Cases
          </h2>

          <p>
            Search and open existing
            cryptocurrency investigation
            cases.
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

      <div className="caseSearch">
        <Search size={17} />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search by Case ID, wallet, chain, fraud type, risk or status..."
        />
      </div>

      <div className="casesTableCard">
        {loading ? (
          <div className="emptyPanel">
            Loading cases...
          </div>
        ) : filteredCases.length ===
          0 ? (
          <div className="emptyPanel">
            <FolderOpen
              size={22}
            />

            <span>
              No matching cases found.
            </span>
          </div>
        ) : (
          <div className="casesTableWrapper">
            <table className="casesTable">
              <thead>
                <tr>
                  <th>
                    Case ID
                  </th>

                  <th>
                    Wallet Address
                  </th>

                  <th>
                    Chain
                  </th>

                  <th>
                    Fraud Type
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Risk
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Open
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCases.map(
                  (item) => {
                    const risk =
                      (
                        item.risk_level ||
                        "UNKNOWN"
                      ).toUpperCase();

                    return (
                      <tr
                        key={
                          item.case_id
                        }
                        className="clickableCaseRow"
                        onClick={() =>
                          onOpenCase?.(
                            item
                          )
                        }
                        title={`Open ${item.case_id}`}
                      >
                        <td>
                          <strong>
                            {
                              item.case_id
                            }
                          </strong>

                          {item.complaint_id && (
                            <small className="caseComplaint">
                              {
                                item.complaint_id
                              }
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
                          {item.fraud_type ||
                            "—"}
                        </td>

                        <td>
                          {formatAmount(
                            item.amount,
                            item.currency
                          )}
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
                            className="openCaseButton"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              onOpenCase?.(
                                item
                              );
                            }}
                          >
                            Open

                            <ChevronRight
                              size={13}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="casesFooter">
        Showing{" "}
        <strong>
          {filteredCases.length}
        </strong>{" "}
        of{" "}
        <strong>
          {cases.length}
        </strong>{" "}
        cases
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

function formatAmount(
  amount,
  currency
) {
  if (
    amount === null ||
    amount === undefined
  ) {
    return "—";
  }

  const number =
    Number(amount);

  if (
    Number.isNaN(number)
  ) {
    return `${amount} ${
      currency || ""
    }`;
  }

  try {
    if (currency) {
      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency,
          maximumFractionDigits:
            2,
        }
      ).format(number);
    }
  } catch {
    // unsupported currency fallback
  }

  return `${number.toLocaleString(
    "en-IN"
  )} ${currency || ""}`;
}

export default Cases;
