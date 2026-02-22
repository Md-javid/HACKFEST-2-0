import axios from "axios";

// In dev: defaults to http://localhost:8000 (direct backend)
// In Docker: VITE_API_URL="" → "/api" → proxied by nginx to backend:8000
const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────
export const listUsers = () => api.get("/auth/users");
export const updateUserRole = (userId: string, role: string) =>
  api.patch(`/auth/users/${userId}/role`, null, { params: { role } });
export const deleteUser = (userId: string) => api.delete(`/auth/users/${userId}`);

export interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
  created_at?: string;
  last_login?: string;
}

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardStats = () => api.get("/dashboard/stats");
export const getRules = (policyId?: string) =>
  api.get("/dashboard/rules", { params: policyId ? { policy_id: policyId } : {} });
export const getCompanyRecords = (type?: string, department?: string) =>
  api.get("/dashboard/records", { params: { record_type: type, department } });
export const getScanHistory = (limit = 20) =>
  api.get("/dashboard/scan-history", { params: { limit } });
export const generateReport = (includeResolved = false) =>
  api.get("/dashboard/report", { params: { include_resolved: includeResolved } });
export const resetDemo = () => api.post("/dashboard/reset");

// ── Policies ──────────────────────────────────────────────────
export const uploadPolicy = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/policies/upload", form, { timeout: 30000 });
};
export const demoUpload = () => api.post("/policies/demo-upload");
export const listPolicies = () => api.get("/policies/");
export const getPolicy = (id: string) => api.get(`/policies/${id}`);
export const deletePolicy = (id: string) => api.delete(`/policies/${id}`);
export const reanalyzePolicy = (id: string) => api.post(`/policies/${id}/analyze`);

// ── Violations ────────────────────────────────────────────────
export const listViolations = (params?: Record<string, unknown>) =>
  api.get("/violations/", { params });
export const getViolation = (id: string) => api.get(`/violations/${id}`);
export const violationAction = (id: string, action: string, reviewer?: string) =>
  api.patch(`/violations/${id}/action`, null, {
    params: { action, reviewer: reviewer || "System Admin" },
  });
export const triggerScan = () => api.post("/violations/scan");
export const clearViolations = () => api.delete("/violations/clear");
export const getViolationsSummary = () => api.get("/violations/summary");

// ── Records ───────────────────────────────────────────────────
export const uploadRecordsFile = (file: File, recordType?: string, department?: string) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/records/upload-file", form, {
    params: { record_type: recordType, department },
  });
};
export const addManualRecord = (body: unknown) => api.post("/records/manual", body);
export const importBulkJson = (body: unknown) => api.post("/records/bulk-json", body);
export const uploadJsonFile = (
  file: File,
  recordType = "employee",
  department = "General"
) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/records/upload-json", form, {
    params: { record_type: recordType, department },
  });
};
export const connectExternalDatabase = (body: unknown) =>
  api.post("/records/connect-database", body);
export const listRecords = (params?: Record<string, unknown>) =>
  api.get("/records/", { params });
export const deleteRecord = (id: string) => api.delete(`/records/${id}`);

// ── AI / Agentic ──────────────────────────────────────────────
export const aiChat = (question: string) =>
  api.post("/ai/chat", { question, include_context: true }, { timeout: 30000 });
export const aiOverview = () => api.get("/ai/overview", { timeout: 30000 });
export const aiPredefinedQuestions = () => api.get("/ai/questions");
export const aiAnalyzeText = (text: string) =>
  api.post("/ai/analyze-text", { text }, { timeout: 20000 });

// ── Agent (ReAct) ─────────────────────────────────────────────
export const agentRemediate = (violationId: string) =>
  api.post(`/agent/remediate/${violationId}`, null, { timeout: 60000 });
export const agentRemediateBatch = (severity = "critical") =>
  api.post("/agent/remediate-batch", null, { params: { severity }, timeout: 120000 });
export const agentLog = (limit = 50) =>
  api.get("/agent/log", { params: { limit } });

// ── Multi-Agent Orchestrator ──────────────────────────────────
export const agentOrchestrate = (violationId: string) =>
  api.post(`/agent/orchestrate/${violationId}`, null, { timeout: 60000 });
export const agentOrchestrateBatch = (severity = "all") =>
  api.post("/agent/orchestrate-batch", null, { params: { severity }, timeout: 180000 });

// ── Proactive Intelligence ────────────────────────────────────
export const agentPredictRisks = (params?: {
  record_type?: string;
  department?: string;
  min_risk_score?: number;
}) => api.post("/agent/predict-risks", null, { params, timeout: 60000 });
export const agentSuggestPolicies = () =>
  api.post("/agent/suggest-policies", null, { timeout: 60000 });
export const agentSystemStatus = () =>
  api.get("/agent/status", { timeout: 15000 });

export default api;
