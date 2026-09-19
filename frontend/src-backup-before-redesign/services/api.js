const API_BASE = "http://127.0.0.1:8000";

async function parseResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

export async function getCases() {
  const response = await fetch(
    `${API_BASE}/api/cases/`
  );

  return parseResponse(response);
}

export async function createCase(walletAddress) {
  const response = await fetch(
    `${API_BASE}/api/cases/`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        wallet_address: walletAddress,
        fraud_type: "Cryptocurrency Fraud",
      }),
    }
  );

  return parseResponse(response);
}

export async function traceCase(caseId) {
  const response = await fetch(
    `${API_BASE}/api/cases/${caseId}/trace`
  );

  return parseResponse(response);
}

export async function analyzeCase(caseId) {
  const response = await fetch(
    `${API_BASE}/api/cases/${caseId}/analyze`,
    {
      method: "POST",
    }
  );

  return parseResponse(response);
}

export async function getHealth() {
  const response = await fetch(
    `${API_BASE}/health`
  );

  return parseResponse(response);
}

export { API_BASE };
