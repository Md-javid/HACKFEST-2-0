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
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import AuthGuard from "@/components/layout/AuthGuard";
import { listViolations, violationAction, getViolation } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ViolationsPage() {
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState({ status: "", severity: "" });

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
                            {/* Rule */}
                            <p className="text-sm text-white/80 font-medium mb-1">
                              {v.violated_rule}
                            </p>
                            {/* Explanation */}
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {v.explanation}
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
            <div className="space-y-6">
              {/* Violation Info */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <SeverityBadge severity={detailData.violation?.severity} />
                  <StatusBadge status={detailData.violation?.status} />
                  <span className="text-xs font-mono text-gray-400">
                    {detailData.violation?.violation_id}
                  </span>
                </div>
                <h3 className="font-semibold mb-2">
                  {detailData.violation?.violated_rule}
                </h3>
                <p className="text-sm text-gray-500">{detailData.violation?.explanation}</p>
              </div>

              {/* Confidence */}
              <div className="glass-card !p-4">
                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  AI Confidence Score
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background:
                          detailData.violation?.confidence_score >= 0.8
                            ? "#ef4444"
                            : detailData.violation?.confidence_score >= 0.6
                            ? "#f59e0b"
                            : "#3b82f6",
                      }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(detailData.violation?.confidence_score || 0) * 100}%`,
                      }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <span className="font-bold">
                    {((detailData.violation?.confidence_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Suggested Remediation */}
              <div className="glass-card !p-4">
                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Suggested Remediation
                </h4>
                <p className="text-sm text-green-300/80">
                  {detailData.violation?.suggested_remediation}
                </p>
              </div>

              {/* Policy Reference */}
              {detailData.violation?.policy_reference && (
                <div className="glass-card !p-4">
                  <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Policy Reference
                  </h4>
                  <p className="text-sm text-blue-300/80">
                    {detailData.violation.policy_reference}
                  </p>
                </div>
              )}

              {/* Record Data */}
              {detailData.record && (
                <div className="glass-card !p-4">
                  <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Record Data ({detailData.record.record_id})
                  </h4>
                  <pre className="text-xs text-gray-500 overflow-x-auto">
                    {JSON.stringify(detailData.record.data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Actions */}
              {detailData.violation?.status === "open" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(detailData.violation.violation_id, "approve")}
                    className="flex-1 py-3 rounded-xl bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(detailData.violation.violation_id, "escalate")}
                    className="flex-1 py-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25 transition-colors text-sm font-medium"
                  >
                    Escalate
                  </button>
                  <button
                    onClick={() => handleAction(detailData.violation.violation_id, "resolve")}
                    className="flex-1 py-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-colors text-sm font-medium"
                  >
                    Resolve
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
    </AuthGuard>
  );
}
