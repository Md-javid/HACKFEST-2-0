"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  FileText,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthGuard from "@/components/layout/AuthGuard";
import { generateReport, resetDemo } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateReport(true);
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemo();
      setReport(null);
      alert("All data reset successfully. Sample records re-seeded.");
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthGuard>
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px]">
        <Topbar />
        <div className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit Reports</h1>
            <p className="text-gray-400 text-sm">
              Generate and download compliance audit reports
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              disabled={loading}
              className="glass-button flex items-center gap-2 px-6 py-3"
            >
              <ClipboardList size={16} />
              {loading ? "Generating..." : "Generate Report"}
            </motion.button>
            {report && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                className="px-6 py-3 rounded-xl bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Download size={16} /> Download JSON
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              disabled={resetting}
              className="ml-auto px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Trash2 size={16} />
              {resetting ? "Resetting..." : "Reset Demo Data"}
            </motion.button>
          </motion.div>

          {/* Report Content */}
          {loading && <LoadingSpinner text="Generating compliance report..." />}

          {report && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Report Header */}
              <GlassCard animate={false}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {report.report_title}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Generated: {new Date(report.generated_at).toLocaleString()}
                    </p>
                  </div>
                  <Shield size={32} className="text-blue-400/30" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {report.summary.total_policies}
                    </p>
                    <p className="text-xs text-gray-400">Policies</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {report.summary.total_rules}
                    </p>
                    <p className="text-xs text-gray-400">Rules</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {report.summary.total_violations}
                    </p>
                    <p className="text-xs text-gray-400">Violations</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-cyan-400">
                      {report.summary.records_monitored}
                    </p>
                    <p className="text-xs text-gray-400">Records</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {Object.entries(report.summary.severity_breakdown || {}).map(
                        ([sev, count]: [string, any]) => (
                          <div key={sev} className="text-center px-2">
                            <p className={`text-lg font-bold severity-${sev}`}>{count}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{sev}</p>
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">By Severity</p>
                  </div>
                </div>
              </GlassCard>

              {/* Violations List */}
              <GlassCard animate={false}>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  Violation Details ({report.violations?.length || 0})
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {report.violations?.map((v: any, i: number) => (
                    <motion.div
                      key={v.violation_id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-400">
                          {v.violation_id}
                        </span>
                        <SeverityBadge severity={v.severity} />
                        <span className="text-xs text-gray-400">
                          Record: {v.record_id} | Rule: {v.rule_id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{v.violated_rule}</p>
                      <p className="text-xs text-gray-400">{v.explanation}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-green-400/60">
                          Remediation: {v.suggested_remediation}
                        </p>
                        <span className="text-xs text-gray-400">
                          Confidence: {((v.confidence_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {(!report.violations || report.violations.length === 0) && (
                    <p className="text-center text-gray-400 py-6">No violations in report</p>
                  )}
                </div>
              </GlassCard>

              {/* Rules Summary */}
              <GlassCard animate={false}>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" />
                  Active Rules ({report.rules?.length || 0})
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {report.rules?.map((r: any, i: number) => (
                    <div
                      key={r.rule_id || i}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs font-mono text-gray-400 shrink-0">
                          {r.rule_id}
                        </span>
                        <SeverityBadge severity={r.severity} />
                        <span className="text-sm text-gray-500 truncate">
                          {r.condition}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {r.category}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Empty State */}
          {!report && !loading && (
            <GlassCard className="text-center py-16">
              <ClipboardList size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No report generated yet</p>
              <p className="text-gray-400 text-sm">
                Click &quot;Generate Report&quot; to create a compliance audit report
              </p>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
