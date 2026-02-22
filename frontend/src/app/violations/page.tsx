"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  ArrowUpRight,
  XCircle,
  Eye,
  Filter,
  Bot,
  Zap,
  Loader2,
  TrendingUp,
  ListChecks,
  ChevronRight,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import AuthGuard from "@/components/layout/AuthGuard";
import { listViolations, violationAction, getViolation, agentRemediate, agentRemediateBatch } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ViolationsPage() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState({ status: "", severity: "" });
  // Agent state
  const [agentLoading, setAgentLoading] = useState<string | null>(null); // violation_id being processed
  const [agentResult, setAgentResult] = useState<any>(null);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (filter.status) params.status = filter.status;
      if (filter.severity) params.severity = filter.severity;
      const res = await listViolations(params);
      setViolations(res.data.violations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [filter]);

  const handleAction = async (violationId: string, action: string) => {
    try {
      await violationAction(violationId, action);
      fetchViolations();
      if (modalOpen) setModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAgentRemediate = async (violationId: string) => {
    setAgentLoading(violationId);
    try {
      const res = await agentRemediate(violationId);
      setAgentResult(res.data);
      setAgentModalOpen(true);
      fetchViolations();
    } catch (e: any) {
      setAgentResult({ status: "error", final_answer: e?.response?.data?.detail || String(e), violation_id: violationId, actions_taken: [], steps: [], score_before: 0, score_after: 0 });
      setAgentModalOpen(true);
    } finally {
      setAgentLoading(null);
    }
  };

  const handleBatchRemediate = async () => {
    setBatchRunning(true);
    try {
      const res = await agentRemediateBatch("critical");
      setBatchResult(res.data);
      setBatchModalOpen(true);
      fetchViolations();
    } catch (e: any) {
      setBatchResult({ error: e?.response?.data?.detail || String(e) });
      setBatchModalOpen(true);
    } finally {
      setBatchRunning(false);
    }
  };

  const openDetail = async (v: any) => {
    setSelectedViolation(v);
    try {
      const res = await getViolation(v.violation_id);
      setDetailData(res.data);
    } catch {
      setDetailData({ violation: v, rule: null, record: null });
    }
    setModalOpen(true);
  };

  return (
    <AuthGuard>
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px]">
        <Topbar onScanComplete={fetchViolations} />
        <div className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Violations</h1>
            <p className="text-gray-400 text-sm">
              Review and manage detected compliance violations
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-sm text-gray-400">Filter:</span>
            </div>
            <select
              value={filter.severity}
              onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))}
              className="glass-input px-3 py-2 text-sm"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filter.status}
              onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
              className="glass-input px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="escalated">Escalated</option>
              <option value="approved">Approved</option>
              <option value="resolved">Resolved</option>
            </select>
            <span className="text-xs text-gray-400 ml-2">
              {violations.length} violation{violations.length !== 1 ? "s" : ""}
            </span>
            {/* Batch Agent Button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleBatchRemediate}
              disabled={batchRunning}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              {batchRunning
                ? <><Loader2 size={14} className="animate-spin" /> Running Agent...</>
                : <><Zap size={14} /> Run Agent on All Critical</>
              }
            </motion.button>
          </motion.div>

          {/* Violations List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse flex items-center gap-4">
                  <div className="w-16 h-5 rounded-full bg-white/10" />
                  <div className="flex-1 h-4 rounded bg-white/10" />
                  <div className="w-24 h-4 rounded bg-white/10" />
                  <div className="w-20 h-5 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          ) : violations.length === 0 ? (
            <GlassCard className="text-center py-12">
              <AlertTriangle size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-gray-400">No violations found</p>
              <p className="text-gray-400 text-sm mt-1">
                Upload a policy, then run a scan to detect violations.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {violations.map((v, i) => (
                  <motion.div
                    key={v.violation_id || i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard className="!p-0 overflow-hidden" animate={false}>
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {/* Top row: badges */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs font-mono text-gray-400">
                                {v.violation_id}
                              </span>
                              <SeverityBadge severity={v.severity} />
                              <StatusBadge status={v.status} />
                              {v.needs_human_review && (
                                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                  Needs Review
                                </span>
                              )}
                            </div>
                            {/* Human-readable explanation as main headline */}
                            <p className="text-sm text-white/85 font-medium mb-1 leading-snug">
                              {v.explanation || v.violated_rule || "Compliance violation detected"}
                            </p>
                            {/* Rule as sub-text */}
                            <p className="text-xs line-clamp-1" style={{ color: "rgba(165,180,252,0.55)" }}>
                              Rule: {v.violated_rule}
                            </p>
                            {/* Meta */}
                            <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                              <span>Record: {v.record_id}</span>
                              <span>Rule: {v.rule_id}</span>
                              <span>Dept: {v.department}</span>
                              <span>
                                Confidence:{" "}
                                <span className="text-gray-500 font-medium">
                                  {(v.confidence_score * 100).toFixed(0)}%
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openDetail(v)}
                              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-blue-400 transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </motion.button>
                            {v.status === "open" && (
                              <>
                                {/* AI Agent Remediate */}
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAgentRemediate(v.violation_id)}
                                  disabled={agentLoading === v.violation_id}
                                  className="p-2 rounded-xl hover:bg-purple-500/10 text-gray-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                                  title="AI Auto-Remediate"
                                >
                                  {agentLoading === v.violation_id
                                    ? <Loader2 size={16} className="animate-spin text-purple-400" />
                                    : <Bot size={16} />}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAction(v.violation_id, "approve")}
                                  className="p-2 rounded-xl hover:bg-green-500/10 text-gray-400 hover:text-green-400 transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle size={16} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAction(v.violation_id, "escalate")}
                                  className="p-2 rounded-xl hover:bg-purple-500/10 text-gray-400 hover:text-purple-400 transition-colors"
                                  title="Escalate"
                                >
                                  <ArrowUpRight size={16} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleAction(v.violation_id, "resolve")}
                                  className="p-2 rounded-xl hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors"
                                  title="Resolve"
                                >
                                  <XCircle size={16} />
                                </motion.button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Confidence bar */}
                      <div className="h-1 bg-white/[0.03]">
                        <motion.div
                          className="h-full"
                          style={{
                            background:
                              v.confidence_score >= 0.8
                                ? "#ef4444"
                                : v.confidence_score >= 0.6
                                ? "#f59e0b"
                                : "#3b82f6",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${v.confidence_score * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Violation Details"
          maxWidth="max-w-3xl"
        >
          {detailData ? (
            <div className="space-y-4">
              {/* ── Header Row ── */}
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={detailData.violation?.severity} />
                <StatusBadge status={detailData.violation?.status} />
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  {detailData.violation?.violation_id}
                </span>
                {detailData.violation?.detected_at && (
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                    Detected: {new Date(detailData.violation.detected_at).toLocaleString()}
                  </span>
                )}
              </div>

              {/* ── Rule Violated ── */}
              <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#f87171" }}>
                  Rule Violated
                </p>
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {detailData.violation?.violated_rule || detailData.violation?.rule_condition || "Compliance rule not satisfied"}
                </p>
                {detailData.violation?.policy_reference && (
                  <p className="text-xs mt-1" style={{ color: "rgba(165,180,252,0.7)" }}>
                    Reference: {detailData.violation.policy_reference}
                  </p>
                )}
              </div>

              {/* ── What Happened ── */}
              <div className="p-4 rounded-xl" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🚨</span>
                  <h4 className="text-sm font-bold" style={{ color: "#fbbf24" }}>What Happened?</h4>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
                  {detailData.violation?.explanation || "This record does not satisfy the required compliance rule. Review the record details below."}
                </p>
              </div>

              {/* ── Why it Matters ── */}
              {detailData.violation?.risk_assessment && (
                <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">⚠️</span>
                    <h4 className="text-sm font-bold" style={{ color: "#f87171" }}>Why Does This Matter?</h4>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {detailData.violation.risk_assessment}
                  </p>
                </div>
              )}

              {/* ── How to Fix It ── */}
              {detailData.violation?.suggested_remediation && (
                <div className="p-4 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.18)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">✅</span>
                    <h4 className="text-sm font-bold" style={{ color: "#34d399" }}>How to Fix It</h4>
                  </div>
                  <div className="space-y-2">
                    {detailData.violation.suggested_remediation
                      .split(/\n+/)
                      .map((s: string) => s.trim())
                      .filter((s: string) => s.length > 0)
                      .map((step: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm">
                          <span
                            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                            style={{ background: "rgba(52,211,153,0.2)", color: "#34d399" }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ color: "rgba(255,255,255,0.78)" }}>{step}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── AI Confidence ── */}
              <div className="flex items-center gap-4 px-1">
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>AI Confidence</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        (detailData.violation?.confidence_score ?? 0) >= 0.8
                          ? "#ef4444"
                          : (detailData.violation?.confidence_score ?? 0) >= 0.6
                          ? "#f59e0b"
                          : "#3b82f6",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((detailData.violation?.confidence_score || 0) * 100)}%` }}
                    transition={{ duration: 0.9 }}
                  />
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-primary)" }}>
                  {((detailData.violation?.confidence_score || 0) * 100).toFixed(0)}% certain
                </span>
              </div>

              {/* ── Record Data (collapsible) ── */}
              {detailData.record && (
                <details>
                  <summary
                    className="text-xs cursor-pointer flex items-center gap-1.5 py-2 px-3 rounded-xl select-none"
                    style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
                  >
                    <span className="font-semibold">▶ Record Details — {detailData.record.record_id}</span>
                  </summary>
                  <pre
                    className="mt-2 p-3 rounded-xl text-xs overflow-x-auto"
                    style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", border: "1px solid var(--border)" }}
                  >
                    {JSON.stringify(detailData.record.data, null, 2)}
                  </pre>
                </details>
              )}

              {/* ── Action Buttons ── */}
              {detailData.violation?.status === "open" && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => handleAction(detailData.violation.violation_id, "approve")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleAction(detailData.violation.violation_id, "escalate")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(168,85,247,0.12)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.2)" }}
                  >
                    ↑ Escalate
                  </button>
                  <button
                    onClick={() => handleAction(detailData.violation.violation_id, "resolve")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    ✓ Resolve
                  </button>
                </div>
              )}
            </div>
          ) : (
            <LoadingSpinner text="Loading details..." />
          )}
        </Modal>
      </main>
    </div>

    {/* ─── Agent Single Result Modal ─── */}
    <Modal isOpen={agentModalOpen} onClose={() => setAgentModalOpen(false)} title="" maxWidth="max-w-2xl">
      {agentResult && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              agentResult.status === "success" ? "bg-green-500/20" :
              agentResult.status === "escalated" ? "bg-amber-500/20" : "bg-red-500/20"
            }`}>
              <Bot size={20} className={agentResult.status === "success" ? "text-green-400" : agentResult.status === "escalated" ? "text-amber-400" : "text-red-400"} />
            </div>
            <div>
              <p className="text-white font-semibold">Agent Remediation Complete</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{agentResult.violation_id}</p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
              agentResult.status === "success" ? "bg-green-500/20 text-green-400" :
              agentResult.status === "escalated" ? "bg-amber-500/20 text-amber-400" :
              "bg-red-500/20 text-red-400"
            }`}>
              {agentResult.status?.toUpperCase()}
            </span>
          </div>

          {/* Score Delta */}
          {agentResult.score_before !== undefined && (
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <TrendingUp size={16} className="text-indigo-400 shrink-0" />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Compliance Score</span>
              <span className="text-sm font-mono text-gray-400">{agentResult.score_before}%</span>
              <ChevronRight size={14} className="text-gray-500" />
              <span className="text-sm font-mono font-bold text-white">{agentResult.score_after}%</span>
              {agentResult.score_delta > 0 && (
                <span className="text-xs font-bold text-green-400 ml-auto">+{agentResult.score_delta}%</span>
              )}
            </div>
          )}

          {/* Final Answer */}
          <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Agent Summary</p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>{agentResult.final_answer}</p>
          </div>

          {/* Actions taken */}
          {agentResult.actions_taken?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <ListChecks size={13} /> Actions Taken
              </p>
              <div className="space-y-1.5">
                {agentResult.actions_taken.map((a: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2.5 rounded-xl" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(52,211,153,0.2)", color: "#34d399" }}>{i + 1}</span>
                    <span style={{ color: "rgba(255,255,255,0.78)" }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ReAct Trace (collapsible) */}
          {agentResult.steps?.filter((s: any) => s.thought).length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs flex items-center gap-2 py-2 px-3 rounded-xl select-none" style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <Bot size={12} /> ▶ Agent Reasoning Trace ({agentResult.steps.filter((s: any) => s.thought).length} steps)
              </summary>
              <div className="mt-2 space-y-2">
                {agentResult.steps.filter((s: any) => s.thought).map((step: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl text-xs space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    {step.thought && <p><span className="text-purple-400 font-semibold">Thought:</span> <span style={{ color: "rgba(255,255,255,0.7)" }}>{step.thought}</span></p>}
                    {step.action && step.action !== "done" && <p><span className="text-blue-400 font-semibold">Action:</span> <span className="font-mono text-blue-300">{step.action}</span></p>}
                    {step.observation && <p><span className="text-green-400 font-semibold">Observation:</span> <span style={{ color: "rgba(255,255,255,0.6)" }}>{step.observation.slice(0, 200)}</span></p>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Modal>

    {/* ─── Batch Agent Result Modal ─── */}
    <Modal isOpen={batchModalOpen} onClose={() => setBatchModalOpen(false)} title="" maxWidth="max-w-2xl">
      {batchResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Zap size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Batch Agent Run Complete</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Processed {batchResult.total_processed || 0} violations</p>
            </div>
          </div>

          {batchResult.error ? (
            <p className="text-red-400 text-sm p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>{batchResult.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[{label: "Resolved", val: batchResult.resolved, color: "#34d399", bg: "rgba(52,211,153,0.1)"},
                  {label: "Escalated", val: batchResult.escalated, color: "#fbbf24", bg: "rgba(251,191,36,0.1)"},
                  {label: "Errors", val: batchResult.errors, color: "#f87171", bg: "rgba(239,68,68,0.1)"}].map(({ label, val, color, bg }) => (
                  <div key={label} className="p-3 rounded-xl text-center" style={{ background: bg }}>
                    <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <TrendingUp size={16} className="text-indigo-400" />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Final Compliance Score:</span>
                <span className="text-lg font-bold text-white ml-auto">{batchResult.final_compliance_score}%</span>
              </div>

              {batchResult.results?.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs flex items-center gap-2 py-2 px-3 rounded-xl select-none" style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    ▶ Full Results ({batchResult.results.length} violations)
                  </summary>
                  <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                    {batchResult.results.map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold ${
                          r.status === "success" ? "bg-green-500/20 text-green-400" :
                          r.status === "escalated" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                        }`}>{r.status}</span>
                        <span className="font-mono text-gray-400 shrink-0">{r.violation_id}</span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }} className="truncate">{r.summary}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
    </AuthGuard>
  );
}
