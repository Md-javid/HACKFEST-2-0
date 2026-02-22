"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  FileText,
  Trash2,
  Brain,
  Sparkles,
  TrendingUp,
  Database,
  BarChart3,
  CheckCircle2,
  Clock,
  Printer,
  AlertCircle,
  Zap,
  ChevronRight,
  Lightbulb,
  Bot,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import ComplianceDial from "@/components/ui/ComplianceDial";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import SeverityBadge from "@/components/ui/SeverityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthGuard from "@/components/layout/AuthGuard";
import { generateReport, resetDemo, getDashboardStats, aiOverview, agentSystemStatus } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#16a34a",
};

const PIE_COLORS = ["#dc2626", "#ea580c", "#d97706", "#16a34a"];

function SeverityBar({ severity, count, total }: { severity: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <SeverityBadge severity={severity} />
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{count}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: SEVERITY_COLORS[severity] }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  // --- State ---
  const [report, setReport] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [agentStatusData, setAgentStatusData] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "violations" | "rules" | "policies">("overview");
  const [severityFilter, setSeverityFilter] = useState("");
  const _printRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching ---
  const fetchAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [reportRes, statsRes, agentRes] = await Promise.all([
        generateReport(includeResolved),
        getDashboardStats(),
        agentSystemStatus().catch(() => null),
      ]);
      setReport(reportRes.data);
      setStats(statsRes.data);
      setAgentStatusData(agentRes?.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [includeResolved]);

  const fetchAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await aiOverview();
      setAiData(res.data);
    } catch {
      setAiData({ status: "error" });
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Handlers ---
  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob(
      [JSON.stringify({ report, stats, generated_at: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const handleReset = async () => {
    if (!confirm("Reset all data and re-seed sample records?")) return;
    setResetting(true);
    try {
      await resetDemo();
      setReport(null);
      setStats(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  // --- Derived ---
  const violations: any[] = report?.violations || [];
  const rules: any[] = report?.rules || [];
  const policies: any[] = report?.policies || [];
  const summary = report?.summary || {};
  const trendData = stats?.violations_trend || [];

  const severityItems = [
    { key: "critical", label: "Critical", count: summary.severity_breakdown?.critical || 0 },
    { key: "high",     label: "High",     count: summary.severity_breakdown?.high     || 0 },
    { key: "medium",   label: "Medium",   count: summary.severity_breakdown?.medium   || 0 },
    { key: "low",      label: "Low",      count: summary.severity_breakdown?.low      || 0 },
  ];
  const totalSeverity = severityItems.reduce((s, x) => s + x.count, 0) || 1;
  const pieData = severityItems.filter(x => x.count > 0).map(x => ({ name: x.label, value: x.count }));

  const violationsByPolicy: Record<string, number> = {};
  violations.forEach((v: any) => {
    const pid = v.policy_id || "Unknown";
    violationsByPolicy[pid] = (violationsByPolicy[pid] || 0) + 1;
  });
  const policyBreakdown = Object.entries(violationsByPolicy)
    .map(([pid, count]) => {
      const p = policies.find((x: any) => x.policy_id === pid);
      return { pid, name: p?.filename || p?.name || pid, count };
    })
    .sort((a, b) => b.count - a.count);

  const filteredViolations = severityFilter
    ? violations.filter((v: any) => v.severity === severityFilter)
    : violations;

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[240px]">
          <Topbar onScanComplete={() => fetchAll(false)} />
          <div className="p-6 space-y-5 max-w-[1400px]">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.2))", border: "1px solid rgba(129,140,248,0.3)" }}>
                  <ClipboardList size={20} style={{ color: "#a5b4fc" }} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Audit Reports</h1>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {report
                      ? `Generated ${new Date(report.generated_at || Date.now()).toLocaleString()}`
                      : "Compliance audit & analytics"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIncludeResolved(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: includeResolved ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)",
                    color: includeResolved ? "#34d399" : "var(--text-muted)",
                    border: `1px solid ${includeResolved ? "rgba(52,211,153,0.25)" : "var(--border)"}`,
                  }}
                >
                  {includeResolved ? <Eye size={13} /> : <EyeOff size={13} />}
                  {includeResolved ? "Incl. Resolved" : "Open Only"}
                </button>

                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => fetchAll(true)} disabled={loading}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <motion.div animate={loading ? { rotate: 360 } : {}}
                    transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: "linear" }}>
                    <RefreshCw size={13} />
                  </motion.div>
                  {loading ? "Loading" : "Refresh"}
                </motion.button>

                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
                  <Printer size={13} /> Print / PDF
                </motion.button>

                {report && (
                  <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDownload}
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
                    <Download size={13} /> Export JSON
                  </motion.button>
                )}

                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleReset} disabled={resetting}
                  className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <Trash2 size={13} />
                  {resetting ? "Resetting" : "Reset Demo"}
                </motion.button>
              </div>
            </motion.div>

            {loading ? (
              <LoadingSpinner text="Compiling compliance audit report" />
            ) : report ? (
              <>
                {/* Executive Summary Strip */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-3 card p-6 flex flex-col items-center justify-center" style={{ minHeight: 220 }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                      Compliance Score
                    </p>
                    <ComplianceDial score={stats?.compliance_score ?? 0} size={140} />
                    <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)" }}>
                      {(stats?.compliance_score ?? 0) >= 80 ? " Good standing"
                        : (stats?.compliance_score ?? 0) >= 60 ? " Moderate risk"
                        : " High risk � act now"}
                    </p>
                  </div>

                  <div className="col-span-12 md:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Policies",    value: summary.total_policies   || 0, icon: FileText,      iconColor: "#4f46e5", bg: "#eef2ff" },
                      { label: "Active Rules", value: summary.total_rules      || 0, icon: Shield,        iconColor: "#7c3aed", bg: "rgba(124,58,237,0.15)" },
                      { label: "Violations",  value: summary.total_violations || 0, icon: AlertTriangle, iconColor: "#dc2626", bg: "rgba(239,68,68,0.15)" },
                      { label: "Records",     value: summary.records_monitored || 0, icon: Database,      iconColor: "#0369a1", bg: "rgba(3,105,161,0.15)" },
                    ].map((item, i) => (
                      <motion.div key={item.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }} className="card p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{item.label}</span>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: item.bg }}>
                            <item.icon size={15} style={{ color: item.iconColor }} />
                          </div>
                        </div>
                        <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                          <AnimatedCounter value={item.value} duration={1.2} />
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Tabs */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <div className="flex gap-1 border-b mb-5" style={{ borderColor: "var(--border)" }}>
                    {([
                      { id: "overview",    label: "Overview",                       icon: BarChart3      },
                      { id: "violations",  label: `Violations (${violations.length})`, icon: AlertTriangle  },
                      { id: "rules",       label: `Rules (${rules.length})`,        icon: Shield         },
                      { id: "policies",    label: `Policies (${policies.length})`,  icon: FileText       },
                    ] as const).map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px"
                        style={{
                          borderBottomColor: activeTab === tab.id ? "#818cf8" : "transparent",
                          color: activeTab === tab.id ? "#a5b4fc" : "var(--text-muted)",
                        }}>
                        <tab.icon size={13} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

                      {/* === OVERVIEW TAB === */}
                      {activeTab === "overview" && (
                        <div className="space-y-5">
                          {/* Charts Row */}
                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 lg:col-span-8 card p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Violation Trend</h3>
                                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Daily violations � last 7 days</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TrendingUp size={14} style={{ color: "#4f46e5" }} />
                                  <span className="text-xs font-semibold" style={{ color: "#818cf8" }}>{summary.total_violations || 0} total</span>
                                </div>
                              </div>
                              <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                  <defs>
                                    <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
                                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                                    tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                                    formatter={(v: any) => [v, "Violations"]} labelFormatter={(v) => `Date: ${v}`} />
                                  <Area type="monotone" dataKey="violations" stroke="#4f46e5" strokeWidth={2.5} fill="url(#reportGrad)"
                                    dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4f46e5" }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="col-span-12 lg:col-span-4 card p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={14} style={{ color: "var(--text-muted)" }} />
                                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>By Severity</h3>
                              </div>
                              {pieData.length > 0 && (
                                <div className="flex justify-center mb-4">
                                  <PieChart width={120} height={120}>
                                    <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                                      {pieData.map((_entry: any, i: number) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                      ))}
                                    </Pie>
                                  </PieChart>
                                </div>
                              )}
                              <div className="space-y-3">
                                {severityItems.map((item) => (
                                  <SeverityBar key={item.key} severity={item.key} count={item.count} total={totalSeverity} />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Gemini AI Summary */}
                          <div className="card p-6" style={{ border: "1px solid rgba(129,140,248,0.2)" }}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.7), rgba(124,58,237,0.7))", border: "1px solid rgba(129,140,248,0.3)" }}>
                                  <Brain size={15} color="white" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Executive Summary</h3>
                                  <p className="text-xs" style={{ color: "rgba(165,180,252,0.6)" }}>Gemini-powered compliance analysis</p>
                                </div>
                              </div>
                              <button onClick={fetchAI} disabled={aiLoading}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                                style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#a5b4fc" }}>
                                {aiLoading
                                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}><Sparkles size={12} /></motion.div> Analyzing</>
                                  : <><Sparkles size={12} /> {aiData ? "Refresh" : "Generate"}</>}
                              </button>
                            </div>

                            {aiLoading && (
                              <div className="flex items-center gap-3 py-4">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                                  <Brain size={18} style={{ color: "#818cf8" }} />
                                </motion.div>
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Gemini is analyzing your compliance posture</p>
                              </div>
                            )}

                            {!aiLoading && !aiData && (
                              <div className="flex flex-col items-center gap-3 py-6">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.3))", border: "1px solid rgba(129,140,248,0.25)" }}>
                                  <Brain size={22} style={{ color: "#a5b4fc" }} />
                                </div>
                                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                                  Generate an AI-powered executive summary of your current compliance posture.
                                </p>
                                <button onClick={fetchAI}
                                  className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-all hover:scale-105"
                                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.7), rgba(124,58,237,0.7))", border: "1px solid rgba(129,140,248,0.4)", color: "white" }}>
                                  <Sparkles size={14} /> Load AI Summary
                                </button>
                              </div>
                            )}

                            {!aiLoading && aiData?.status === "error" && (
                              <div className="flex items-center gap-3 py-3 px-4 rounded-xl"
                                style={{ background: "rgba(129,140,248,0.08)", border: "1px dashed rgba(129,140,248,0.2)" }}>
                                <Sparkles size={16} style={{ color: "#818cf8" }} />
                                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                  Gemini not responding. Check <code className="px-1 rounded text-indigo-400" style={{ background: "rgba(255,255,255,0.08)" }}>GEMINI_API_KEY</code> in backend/.env.
                                </p>
                              </div>
                            )}

                            {!aiLoading && aiData?.status === "success" && (
                              <div className="space-y-4">
                                {aiData.headline && (
                                  <div className="p-3.5 rounded-xl" style={{ background: "rgba(129,140,248,0.10)", border: "1px solid rgba(129,140,248,0.2)" }}>
                                    <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{aiData.headline}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {aiData.top_risks?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <AlertCircle size={13} style={{ color: "#f87171" }} />
                                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#f87171" }}>Top Risks</span>
                                      </div>
                                      <div className="space-y-2">
                                        {aiData.top_risks.map((risk: any, i: number) => (
                                          <div key={i} className="p-2.5 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                            <p className="font-semibold mb-0.5" style={{ color: "#fca5a5" }}>{risk.title}</p>
                                            <p style={{ color: "rgba(255,255,255,0.55)" }}>{risk.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {aiData.immediate_actions?.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <Zap size={13} style={{ color: "#fbbf24" }} />
                                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#fbbf24" }}>Act Now</span>
                                      </div>
                                      <div className="space-y-2">
                                        {aiData.immediate_actions.map((action: string, i: number) => (
                                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
                                            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
                                            <ChevronRight size={12} style={{ color: "#fbbf24", marginTop: 2 }} className="shrink-0" />
                                            <span style={{ color: "rgba(255,255,255,0.75)" }}>{action}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(aiData.positive_highlights?.length > 0 || aiData.trend_insight) && (
                                    <div>
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <Lightbulb size={13} style={{ color: "#34d399" }} />
                                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#34d399" }}>Insights</span>
                                      </div>
                                      <div className="space-y-2">
                                        {aiData.trend_insight && (
                                          <div className="p-2.5 rounded-xl text-xs" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                                            <p style={{ color: "rgba(255,255,255,0.75)" }}>{aiData.trend_insight}</p>
                                          </div>
                                        )}
                                        {aiData.positive_highlights?.map((h: string, i: number) => (
                                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
                                            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                                            <CheckCircle2 size={12} style={{ color: "#34d399", marginTop: 2 }} className="shrink-0" />
                                            <span style={{ color: "rgba(255,255,255,0.65)" }}>{h}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Agent Activity */}
                          {agentStatusData && (
                            <div className="card p-6">
                              <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                  <Bot size={16} className="text-purple-400" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Agent Remediation Summary</h3>
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Auto-remediations performed by AI agents</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                {[
                                  { label: "Total Actions", value: agentStatusData.agent_log?.total_entries || 0, color: "text-purple-400" },
                                  { label: "Auto-Resolved", value: agentStatusData.agent_log?.resolves || 0, color: "text-green-400" },
                                  { label: "Escalated",     value: agentStatusData.violations?.escalated || 0, color: "text-orange-400" },
                                  { label: "Fields Fixed",  value: agentStatusData.agent_log?.field_updates || 0, color: "text-blue-400" },
                                ].map((item) => (
                                  <div key={item.label} className="p-3 rounded-xl text-center"
                                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                                    <p className={`text-xl font-bold ${item.color}`}><AnimatedCounter value={item.value} /></p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                                  </div>
                                ))}
                                {(agentStatusData.agents || []).map((a: any) => (
                                  <div key={a.type} className="p-3 rounded-xl text-center"
                                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                                    <p className="text-lg mb-0.5">{a.icon}</p>
                                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{a.name?.replace("Agent", "")}</p>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.actions_taken}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Policy Breakdown */}
                          {policyBreakdown.length > 0 && (
                            <div className="card p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <FileText size={15} style={{ color: "var(--text-muted)" }} />
                                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Violations by Policy</h3>
                              </div>
                              <div className="space-y-3">
                                {policyBreakdown.map(({ pid, name, count }, i) => {
                                  const pct = violations.length > 0 ? Math.round((count / violations.length) * 100) : 0;
                                  return (
                                    <div key={pid}>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-medium truncate max-w-[60%]" style={{ color: "var(--text-primary)" }}>
                                          {name.length > 40 ? name.slice(0, 40) + "" : name}
                                        </span>
                                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{count} violations</span>
                                      </div>
                                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                                        <motion.div className="h-full rounded-full"
                                          style={{ background: `hsl(${230 + i * 30}, 70%, 60%)` }}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.8, delay: i * 0.1 }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* === VIOLATIONS TAB === */}
                      {activeTab === "violations" && (
                        <div className="card p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                              <AlertTriangle size={15} style={{ color: "#f87171" }} />
                              Violations ({filteredViolations.length})
                            </h3>
                            <div className="flex gap-1.5">
                              {(["", "critical", "high", "medium", "low"] as const).map((sev) => (
                                <button key={sev || "all"} onClick={() => setSeverityFilter(sev)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                                  style={{
                                    background: severityFilter === sev ? (sev ? `${SEVERITY_COLORS[sev]}20` : "rgba(255,255,255,0.08)") : "transparent",
                                    color: severityFilter === sev ? (sev ? SEVERITY_COLORS[sev] : "var(--text-primary)") : "var(--text-muted)",
                                    border: `1px solid ${severityFilter === sev ? (sev ? SEVERITY_COLORS[sev] + "40" : "var(--border)") : "transparent"}`,
                                  }}>
                                  {sev || "All"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {filteredViolations.length === 0 ? (
                              <div className="text-center py-12">
                                <CheckCircle2 size={36} className="mx-auto mb-3 text-green-400/40" />
                                <p className="text-gray-400 text-sm">No violations found</p>
                              </div>
                            ) : filteredViolations.map((v: any, i: number) => (
                              <motion.div key={v.violation_id || i}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                                className="p-4 rounded-xl hover:bg-white/[0.03] transition-colors"
                                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{v.violation_id}</span>
                                  <SeverityBadge severity={v.severity} />
                                  <StatusBadge status={v.status} />
                                  {v.detected_at && (
                                    <span className="text-xs ml-auto flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                      <Clock size={11} />
                                      {new Date(v.detected_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                                  {v.explanation || v.violation_description || v.violated_rule || "Compliance violation detected"}
                                </p>
                                <p className="text-xs mb-2" style={{ color: "rgba(165,180,252,0.55)" }}>
                                  Rule: {v.violated_rule || v.rule_condition || v.rule_id}
                                </p>
                                {v.suggested_remediation && (
                                  <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg"
                                    style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                                    <CheckCircle2 size={12} className="text-green-400 mt-0.5 shrink-0" />
                                    <p className="text-xs" style={{ color: "rgba(52,211,153,0.8)" }}>{v.suggested_remediation}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                  <span>Record: <code className="text-indigo-400">{v.record_id}</code></span>
                                  <span>Confidence: {((v.confidence_score || 0) * 100).toFixed(0)}%</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === RULES TAB === */}
                      {activeTab === "rules" && (
                        <div className="card p-6">
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                            <Shield size={15} style={{ color: "#818cf8" }} />
                            Active Rules ({rules.length})
                          </h3>
                          <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {rules.map((r: any, i: number) => (
                              <motion.div key={r.rule_id || i}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                                <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-muted)" }}>{r.rule_id}</span>
                                <SeverityBadge severity={r.severity} />
                                <span className="text-xs flex-1 min-w-0 truncate" style={{ color: "var(--text-primary)" }}>{r.condition || r.name}</span>
                                <span className="text-xs shrink-0 px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(129,140,248,0.1)", color: "#a5b4fc", border: "1px solid rgba(129,140,248,0.2)" }}>
                                  {r.category}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === POLICIES TAB === */}
                      {activeTab === "policies" && (
                        <div className="card p-6">
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
                            <FileText size={15} style={{ color: "#60a5fa" }} />
                            Monitored Policies ({policies.length})
                          </h3>
                          {policies.length === 0 ? (
                            <div className="text-center py-10">
                              <FileText size={36} className="mx-auto mb-3 opacity-20" />
                              <p className="text-gray-400 text-sm">No policies loaded. Upload a policy PDF to get started.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {policies.map((p: any, i: number) => {
                                const vCount = violationsByPolicy[p.policy_id] || 0;
                                return (
                                  <motion.div key={p.policy_id || i}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className="p-4 rounded-xl"
                                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                          {p.filename || p.name || p.policy_id}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                          <StatusBadge status={p.status || "active"} />
                                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.rule_count || 0} rules</span>
                                          {p.uploaded_at && (
                                            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                                              <Clock size={11} />
                                              {new Date(p.uploaded_at).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-xl font-bold" style={{ color: vCount > 0 ? "#f87171" : "#34d399" }}>{vCount}</p>
                                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>violations</p>
                                      </div>
                                    </div>
                                    {p.description && (
                                      <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>{p.description}</p>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </>
            ) : (
              /* Empty State */
              <GlassCard className="text-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.2))", border: "1px solid rgba(129,140,248,0.2)" }}>
                    <ClipboardList size={28} style={{ color: "#a5b4fc" }} />
                  </div>
                  <p className="text-gray-400 font-medium">No report data yet</p>
                  <p className="text-gray-500 text-sm max-w-xs">
                    Click Refresh to generate your compliance audit report.
                  </p>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => fetchAll(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.7), rgba(124,58,237,0.7))", color: "white", border: "1px solid rgba(129,140,248,0.4)" }}>
                    <RefreshCw size={14} /> Generate Report
                  </motion.button>
                </div>
              </GlassCard>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
