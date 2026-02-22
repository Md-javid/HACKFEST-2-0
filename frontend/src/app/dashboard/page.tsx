"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  FileText,
  Database,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  Zap,
  BarChart3,
  CheckCircle2,
  XCircle,
  Sparkles,
  Brain,
  AlertCircle,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import ComplianceDial from "@/components/ui/ComplianceDial";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import SeverityBadge from "@/components/ui/SeverityBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthGuard from "@/components/layout/AuthGuard";
import { getDashboardStats, aiOverview } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#c2410c",
  medium: "#a16207",
  low: "#15803d",
};

const TREND_COLOR = "#4f46e5";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  suffix?: string;
  delay?: number;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, suffix = "", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card p-5 card-hover"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
      </div>
      <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        <AnimatedCounter value={value} duration={1.2} />
        {suffix && <span className="text-lg ml-1" style={{ color: "var(--text-muted)" }}>{suffix}</span>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [aiOverviewData, setAiOverviewData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState(false);

  const fetchAIOverview = async () => {
    setAiRequested(true);
    setAiLoading(true);
    try {
      const res = await aiOverview();
      setAiOverviewData(res.data);
    } catch {
      // silently fail if gemini not configured
    } finally {
      setAiLoading(false);
    }
  };

  const fetchStats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await getDashboardStats();
      setStats(res.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleString();
  };

  const trendData = stats?.violations_trend ?? [];

  const severityItems = [
    { key: "critical", label: "Critical", count: stats?.critical_violations ?? 0 },
    { key: "high", label: "High", count: stats?.high_violations ?? 0 },
    { key: "medium", label: "Medium", count: stats?.medium_violations ?? 0 },
    { key: "low", label: "Low", count: stats?.low_violations ?? 0 },
  ];
  const totalSeverity = severityItems.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[240px]">
          <Topbar onScanComplete={() => fetchStats(true)} />
          <div className="p-6 max-w-[1400px]">

            {/* ── Page Header ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  Dashboard
                </h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Real-time compliance posture overview
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => fetchStats(true)}
                  disabled={refreshing}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    background: "var(--bg-card)",
                  }}
                >
                  <motion.div
                    animate={refreshing ? { rotate: 360 } : {}}
                    transition={{ duration: 0.7, repeat: refreshing ? Infinity : 0, ease: "linear" }}
                  >
                    <RefreshCw size={13} />
                  </motion.div>
                  {refreshing ? "Refreshing…" : "Refresh"}
                </motion.button>
              </div>
            </motion.div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* ── Row 1: Compliance Dial + Stat Cards ── */}
                <div className="grid grid-cols-12 gap-4 mb-4">

                  {/* Compliance Score */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="col-span-12 md:col-span-3 card p-6 flex flex-col items-center justify-center"
                    style={{ minHeight: 220 }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                      Compliance Score
                    </p>
                    <ComplianceDial score={stats?.compliance_score ?? 0} size={150} />
                    <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)" }}>
                      {stats?.compliance_score >= 80
                        ? "Good standing — keep monitoring"
                        : stats?.compliance_score >= 60
                        ? "Moderate risk — review violations"
                        : "High risk — immediate action needed"}
                    </p>
                  </motion.div>

                  {/* Stat Grid */}
                  <div className="col-span-12 md:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Policies"
                      value={stats?.total_policies ?? 0}
                      icon={FileText}
                      iconColor="#4f46e5"
                      iconBg="#eef2ff"
                      delay={0.05}
                    />
                    <StatCard
                      label="Rules"
                      value={stats?.total_rules ?? 0}
                      icon={Shield}
                      iconColor="#7c3aed"
                      iconBg="rgba(124,58,237,0.15)"
                      delay={0.1}
                    />
                    <StatCard
                      label="Open Violations"
                      value={stats?.open_violations ?? 0}
                      icon={AlertTriangle}
                      iconColor="#dc2626"
                      iconBg="rgba(239,68,68,0.15)"
                      delay={0.15}
                    />
                    <StatCard
                      label="Records Monitored"
                      value={stats?.records_monitored ?? 0}
                      icon={Database}
                      iconColor="#0369a1"
                      iconBg="rgba(3,105,161,0.15)"
                      delay={0.2}
                    />
                  </div>
                </div>

                {/* ── Row 2: Trend Chart + Severity Breakdown ── */}
                <div className="grid grid-cols-12 gap-4 mb-4">

                  {/* Violation Trend */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="col-span-12 lg:col-span-8 card p-6"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Violation Trend
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          Cumulative violations over the last 7 days
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} style={{ color: TREND_COLOR }} />
                        <span className="text-xs font-semibold" style={{ color: TREND_COLOR }}>
                          {stats?.total_violations ?? 0} total
                        </span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="violationGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={TREND_COLOR} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={TREND_COLOR} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                          tickFormatter={(v) => v.slice(5)}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            fontSize: 12,
                            boxShadow: "var(--shadow-md)",
                          }}
                          labelFormatter={(v) => `Date: ${v}`}
                          formatter={(v: any) => [v, "Violations"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="violations"
                          stroke={TREND_COLOR}
                          strokeWidth={2.5}
                          fill="url(#violationGrad)"
                          dot={{ r: 3, fill: TREND_COLOR, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: TREND_COLOR }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Severity Breakdown */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="col-span-12 lg:col-span-4 card p-6"
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 size={15} style={{ color: "var(--text-muted)" }} />
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        By Severity
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {severityItems.map((item) => {
                        const pct = Math.round((item.count / totalSeverity) * 100);
                        return (
                          <div key={item.key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <SeverityBadge severity={item.key} />
                              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                {item.count}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: SEVERITY_COLORS[item.key] }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Last Scan */}
                    <div
                      className="mt-6 pt-5 flex items-start gap-3"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}>
                        <Clock size={13} style={{ color: "#34d399" }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                          Last Scan
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {formatDate(stats?.last_scan)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ── Row 3: Gemini AI Overview ── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, duration: 0.4 }}
                  className="card p-6 mb-4"
                  style={{ border: "1px solid rgba(129,140,248,0.2)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.7), rgba(124,58,237,0.7))", border: "1px solid rgba(129,140,248,0.3)" }}>
                        <Brain size={15} color="white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          Gemini AI Overview
                        </h3>
                        <p className="text-[11px]" style={{ color: "rgba(165,180,252,0.6)" }}>
                          Autonomous compliance analysis
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={fetchAIOverview}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                      style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", color: "#a5b4fc" }}
                    >
                      {aiLoading
                        ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}><Sparkles size={12} /></motion.div> Analyzing…</>
                        : <><Sparkles size={12} /> Refresh AI</>
                      }
                    </button>
                  </div>

                  {aiLoading && (
                    <div className="flex items-center gap-3 py-4">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                        <Brain size={18} style={{ color: "#818cf8" }} />
                      </motion.div>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Gemini is analyzing your compliance data…
                      </p>
                    </div>
                  )}

                  {!aiLoading && !aiRequested && (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                        style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.3))", border: "1px solid rgba(129,140,248,0.25)" }}>
                        <Brain size={22} style={{ color: "#a5b4fc" }} />
                      </div>
                      <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                        Click below to generate a live AI compliance analysis using Gemini.
                      </p>
                      <button
                        onClick={fetchAIOverview}
                        className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.7), rgba(124,58,237,0.7))", border: "1px solid rgba(129,140,248,0.4)", color: "white" }}
                      >
                        <Sparkles size={14} /> Load AI Overview
                      </button>
                    </div>
                  )}

                  {!aiLoading && aiRequested && !aiOverviewData && (
                    <div className="flex items-center gap-3 py-3 px-4 rounded-xl"
                      style={{ background: "rgba(129,140,248,0.08)", border: "1px dashed rgba(129,140,248,0.2)" }}>
                      <Sparkles size={16} style={{ color: "#818cf8" }} />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Set <code className="px-1 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#a5b4fc" }}>GEMINI_API_KEY</code> in your <code className="px-1 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#a5b4fc" }}>backend/.env</code> to enable Gemini AI Overview.
                      </p>
                    </div>
                  )}

                  {!aiLoading && aiOverviewData?.status === "success" && (
                    <div className="space-y-4">
                      {/* Headline */}
                      {aiOverviewData.headline && (
                        <div className="p-3.5 rounded-xl" style={{ background: "rgba(129,140,248,0.10)", border: "1px solid rgba(129,140,248,0.2)" }}>
                          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                            {aiOverviewData.headline}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Top Risks */}
                        {aiOverviewData.top_risks?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <AlertCircle size={13} style={{ color: "#f87171" }} />
                              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#f87171" }}>Top Risks</span>
                            </div>
                            <div className="space-y-2">
                              {aiOverviewData.top_risks.map((risk: any, i: number) => (
                                <div key={i} className="p-2.5 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                  <p className="font-semibold mb-0.5" style={{ color: "#fca5a5" }}>{risk.title}</p>
                                  <p style={{ color: "rgba(255,255,255,0.55)" }}>{risk.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Immediate Actions */}
                        {aiOverviewData.immediate_actions?.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Zap size={13} style={{ color: "#fbbf24" }} />
                              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#fbbf24" }}>Act Now</span>
                            </div>
                            <div className="space-y-2">
                              {aiOverviewData.immediate_actions.map((action: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl text-xs" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
                                  <ChevronRight size={12} style={{ color: "#fbbf24", marginTop: 2 }} className="shrink-0" />
                                  <span style={{ color: "rgba(255,255,255,0.75)" }}>{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Positives */}
                        {(aiOverviewData.positive_highlights?.length > 0 || aiOverviewData.trend_insight) && (
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Lightbulb size={13} style={{ color: "#34d399" }} />
                              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#34d399" }}>Insights</span>
                            </div>
                            <div className="space-y-2">
                              {aiOverviewData.trend_insight && (
                                <div className="p-2.5 rounded-xl text-xs" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                                  <p style={{ color: "rgba(255,255,255,0.75)" }}>{aiOverviewData.trend_insight}</p>
                                </div>
                              )}
                              {aiOverviewData.positive_highlights?.map((h: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl text-xs" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
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
                </motion.div>

                {/* ── Row 4: Recent Violations ── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="card p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Activity size={15} style={{ color: "var(--text-muted)" }} />
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Recent Violations
                      </h3>
                    </div>
                    <a
                      href="/violations"
                      className="text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      style={{ color: "var(--accent)" }}
                    >
                      View all
                      <Zap size={11} />
                    </a>
                  </div>

                  {!stats?.recent_violations?.length ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <CheckCircle2 size={32} style={{ color: "var(--success)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        No recent violations
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {stats.recent_violations.map((v: any, i: number) => (
                        <motion.div
                          key={v.violation_id ?? i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="py-3 flex items-center gap-4"
                        >
                          <div className="shrink-0">
                            {v.status === "resolved" ? (
                              <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                            ) : (
                              <XCircle size={16} style={{ color: "var(--danger)" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                              {v.violation_description ?? v.condition ?? "Compliance violation detected"}
                            </p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                              Record: {v.record_id} &middot; Rule: {v.rule_id}
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-3">
                            <SeverityBadge severity={v.severity} />
                            <span className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>
                              {v.detected_at ? new Date(v.detected_at).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>

              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
