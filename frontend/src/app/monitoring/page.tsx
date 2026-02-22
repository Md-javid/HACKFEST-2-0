"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Shield,
  Lock,
  Handshake,
  Settings2,
  Brain,
  Zap,
  TrendingUp,
  FileSearch,
  Activity,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  BarChart3,
  Lightbulb,
  AlertCircle,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthGuard from "@/components/layout/AuthGuard";
import {
  agentSystemStatus,
  agentOrchestrateBatch,
  agentPredictRisks,
  agentSuggestPolicies,
  agentLog,
  triggerScan,
} from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

const AGENT_ICONS: Record<string, any> = {
  security: Shield,
  privacy: Lock,
  vendor: Handshake,
  operations: Settings2,
};

const AGENT_COLORS: Record<string, string> = {
  security: "from-red-500/20 to-orange-500/20 border-red-500/30",
  privacy: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  vendor: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  operations: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
};

const AGENT_TEXT: Record<string, string> = {
  security: "text-red-400",
  privacy: "text-blue-400",
  vendor: "text-green-400",
  operations: "text-purple-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-green-400 bg-green-500/10 border-green-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-green-400",
  info: "text-blue-400",
};

const HEALTH_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  critical: { color: "text-red-400", icon: XCircle, label: "Critical" },
  warning: { color: "text-orange-400", icon: AlertTriangle, label: "Warning" },
  fair: { color: "text-yellow-400", icon: AlertCircle, label: "Fair" },
  good: { color: "text-green-400", icon: CheckCircle2, label: "Good" },
};

function SeverityDot({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${SEVERITY_COLORS[severity] || "text-gray-400"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
      {severity}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[priority] || "text-gray-400 bg-gray-500/10 border-gray-500/20"}`}>
      {priority}
    </span>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const Icon = AGENT_ICONS[agent.type] || Bot;
  const colorClass = AGENT_COLORS[agent.type] || "from-gray-500/20 to-gray-400/20 border-gray-500/30";
  const textClass = AGENT_TEXT[agent.type] || "text-gray-400";
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      className={`glass-card !p-5 bg-gradient-to-br ${colorClass} border`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          <Icon size={20} className={textClass} />
        </div>
        <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Active</span>
      </div>
      <h3 className={`font-semibold text-sm mb-1 ${textClass}`}>{agent.name}</h3>
      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{agent.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{agent.actions_taken} actions</span>
        <div className="flex flex-col gap-0.5">
          {agent.capabilities?.slice(0, 2).map((c: string, i: number) => (
            <span key={i} className="text-xs text-gray-500 text-right truncate max-w-[140px]"> {c}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RiskPredictionPanel({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!data || data.status !== "success") {
    return <div className="text-center py-8 text-gray-400 text-sm">{data?.message || "Run the Risk Predictor to see results here."}</div>;
  }
  const { summary, predictions } = data;
  const bySev = summary?.by_severity || {};
  const byType = summary?.by_type || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {(["critical","high","medium","low","info"] as const).map((sev) => (
          <div key={sev} className="glass-card !p-3 text-center">
            <p className={`text-xl font-bold ${SEVERITY_COLORS[sev]}`}><AnimatedCounter value={bySev[sev] || 0} /></p>
            <p className="text-xs text-gray-400 capitalize">{sev}</p>
          </div>
        ))}
      </div>
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType).map(([type, count]) => (
            <span key={type} className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {type.replace(/_/g, " ")}: <span className="text-gray-300 font-medium">{count as number}</span>
            </span>
          ))}
        </div>
      )}
      {summary?.top_risk_departments?.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500">Top risk depts:</span>
          {summary.top_risk_departments.map((d: any) => (
            <span key={d.department} className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">{d.department} ({d.predictions})</span>
          ))}
        </div>
      )}
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {predictions.slice(0, 20).map((pred: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
            className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors text-left">
              <div className="flex items-center gap-3 min-w-0">
                <SeverityDot severity={pred.predicted_severity} />
                <span className="text-xs font-mono text-gray-400 shrink-0">{pred.record_id}</span>
                <span className="text-xs text-gray-300 truncate">{pred.rule_name || pred.field}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500 hidden sm:block">{pred.risk_type?.replace(/_/g," ")}</span>
                {expanded === i ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
              </div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-3 space-y-2 border-t border-white/5">
                  <p className="text-xs text-gray-400 pt-2">{pred.reason}</p>
                  <div className="flex items-start gap-2">
                    <ArrowRight size={12} className="text-cyan-400 mt-0.5 shrink-0"/>
                    <p className="text-xs text-cyan-400">{pred.recommendation}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>Dept: {pred.department || "—"}</span>
                    <span>Field: <code className="text-gray-300">{pred.field}</code></span>
                    <span>Value: <code className="text-yellow-400">{pred.current_value}</code></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PolicyAdvisorPanel({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!data || data.status !== "success") {
    return <div className="text-center py-8 text-gray-400 text-sm">{data?.message || "Run the Policy Advisor to see recommendations here."}</div>;
  }
  const { policy_health, policy_health_message, summary, recommendations } = data;
  const healthCfg = HEALTH_CONFIG[policy_health] || HEALTH_CONFIG.good;
  const HealthIcon = healthCfg.icon;
  const byType = summary?.by_type || {};
  const TYPE_LABELS: Record<string, string> = {
    severity_upgrade: "Severity Upgrades", repeat_offender: "Repeat Offenders",
    coverage_gap: "Coverage Gaps", new_rule_suggestion: "New Rules", frequent_violation: "Frequent Violations",
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
        <HealthIcon size={20} className={healthCfg.color} />
        <div>
          <p className={`text-sm font-semibold ${healthCfg.color}`}>Policy Health: {healthCfg.label}</p>
          <p className="text-xs text-gray-400">{policy_health_message}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(byType).map(([type, count]) => (
          <span key={type} className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {TYPE_LABELS[type] || type}: <span className="text-gray-300 font-medium">{count as number}</span>
          </span>
        ))}
      </div>
      <div className="space-y-2 max-h-[360px] overflow-y-auto">
        {recommendations.map((rec: any, i: number) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
            className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors text-left">
              <div className="flex items-center gap-3 min-w-0">
                <PriorityBadge priority={rec.priority} />
                <span className="text-xs text-gray-300 font-medium truncate">{rec.rule_name || rec.suggested_name || rec.field || "Recommendation"}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500 hidden sm:block">{TYPE_LABELS[rec.type] || rec.type}</span>
                {expanded === i ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
              </div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-3 space-y-2 border-t border-white/5">
                  <p className="text-xs text-gray-400 pt-2">{rec.analysis}</p>
                  <div className="flex items-start gap-2">
                    <Lightbulb size={12} className="text-yellow-400 mt-0.5 shrink-0"/>
                    <p className="text-xs text-yellow-400">{rec.action}</p>
                  </div>
                  {rec.violation_count && <p className="text-xs text-gray-500">Violations in past 30d: {rec.violation_count}</p>}
                  {rec.repeat_count && <p className="text-xs text-gray-500">Repeat count: {rec.repeat_count}</p>}
                  {rec.observed_in_records && <p className="text-xs text-gray-500">In {rec.observed_in_records} records</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AgentLogPanel({ logs }: { logs: any[] }) {
  const ACTION_ICONS: Record<string, any> = {
    resolve: CheckCircle2, escalate: AlertTriangle, update_field: Database,
    policy_advisor: Lightbulb, specialist_security: Shield, specialist_privacy: Lock,
    specialist_vendor: Handshake, specialist_operations: Settings2,
  };
  const ACTION_COLORS: Record<string, string> = {
    resolve: "text-green-400", escalate: "text-orange-400", update_field: "text-blue-400",
    policy_advisor: "text-yellow-400", specialist_security: "text-red-400",
    specialist_privacy: "text-blue-400", specialist_vendor: "text-green-400", specialist_operations: "text-purple-400",
  };
  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto">
      {logs.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">No agent activity yet. Run an agent to see logs here.</p>
      ) : logs.map((log, i) => {
        const Icon = ACTION_ICONS[log.action] || Bot;
        const color = ACTION_COLORS[log.action] || "text-gray-400";
        return (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
            <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-medium ${color}`}>{log.action?.replace(/_/g," ")}</span>
                <span className="text-xs font-mono text-gray-500 truncate">{log.entity_id}</span>
              </div>
              <p className="text-xs text-gray-400 truncate">{log.reason}</p>
            </div>
            <div className="text-xs text-gray-500 shrink-0">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function OrchestratorResultPanel({ data }: { data: any }) {
  if (!data) return null;
  const { total_processed, agent_stats, final_compliance_score, results } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card !p-4 text-center">
          <p className="text-2xl font-bold text-gray-900"><AnimatedCounter value={total_processed || 0} /></p>
          <p className="text-xs text-gray-400">Processed</p>
        </div>
        {Object.entries(agent_stats || {}).map(([type, stats]: any) => {
          const Icon = AGENT_ICONS[type] || Bot;
          const textClass = AGENT_TEXT[type] || "text-gray-400";
          return (
            <div key={type} className={`glass-card !p-4 bg-gradient-to-br ${AGENT_COLORS[type]} border`}>
              <div className="flex items-center gap-1 mb-2"><Icon size={12} className={textClass}/><span className={`text-xs font-medium ${textClass}`}>{type}</span></div>
              <p className="text-xs text-gray-400"> {stats.resolved} resolved</p>
              <p className="text-xs text-gray-400"> {stats.escalated} escalated</p>
              {stats.errors > 0 && <p className="text-xs text-red-400"> {stats.errors} errors</p>}
            </div>
          );
        })}
        <div className="glass-card !p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{final_compliance_score}%</p>
          <p className="text-xs text-gray-400">Compliance</p>
        </div>
      </div>
      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {(results || []).slice(0, 20).map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-400">{r.violation_id}</span>
              <span className="text-gray-500"></span>
              <span className={`${AGENT_TEXT[r.routed_to || "security"]} flex items-center gap-1`}>{r.agent_icon} {r.agent_name}</span>
            </div>
            <div className="flex items-center gap-2">
              {r.status === "resolved" ? <CheckCircle2 size={12} className="text-green-400"/> : r.status === "escalated" ? <AlertTriangle size={12} className="text-orange-400"/> : <XCircle size={12} className="text-red-400"/>}
              <span className={r.status==="resolved"?"text-green-400":r.status==="escalated"?"text-orange-400":"text-red-400"}>{r.status}</span>
              {r.confidence != null && <span className="text-gray-500">{(r.confidence*100).toFixed(0)}% conf</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ActivePanel = "orchestrator" | "risks" | "policies" | "log" | null;

export default function MonitoringPage() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>("log");

  const [orchRunning, setOrchRunning] = useState(false);
  const [orchResult, setOrchResult] = useState<any>(null);
  const [riskRunning, setRiskRunning] = useState(false);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [policyRunning, setPolicyRunning] = useState(false);
  const [policyResult, setPolicyResult] = useState<any>(null);
  const [scanRunning, setScanRunning] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, logRes] = await Promise.all([agentSystemStatus(), agentLog(30)]);
      setSystemStatus(statusRes.data);
      setLogs(logRes.data.logs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); const t = setInterval(fetchStatus, 30000); return () => clearInterval(t); }, [fetchStatus]);

  const handleOrchestrateAll = async () => {
    setOrchRunning(true); setActivePanel("orchestrator");
    try { const res = await agentOrchestrateBatch("all"); setOrchResult(res.data); fetchStatus(); }
    catch (e) { console.error(e); } finally { setOrchRunning(false); }
  };

  const handlePredictRisks = async () => {
    setRiskRunning(true); setActivePanel("risks");
    try { const res = await agentPredictRisks({ min_risk_score: 2 }); setRiskResult(res.data); }
    catch (e) { console.error(e); } finally { setRiskRunning(false); }
  };

  const handleSuggestPolicies = async () => {
    setPolicyRunning(true); setActivePanel("policies");
    try { const res = await agentSuggestPolicies(); setPolicyResult(res.data); fetchStatus(); }
    catch (e) { console.error(e); } finally { setPolicyRunning(false); }
  };

  const handleScan = async () => {
    setScanRunning(true);
    try { await triggerScan(); fetchStatus(); }
    catch (e) { console.error(e); } finally { setScanRunning(false); }
  };

  const status = systemStatus;
  const agents = status?.agents || [];
  const violations = status?.violations || {};
  const agentLogStats = status?.agent_log || {};

  const panelTitles: Record<string, string> = {
    orchestrator: "Orchestrator Results", risks: "Risk Predictions",
    policies: "Policy Advisor", log: "Agent Activity Log",
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[240px]">
          <Topbar onScanComplete={fetchStatus} />
          <div className="p-6 space-y-6">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <Brain size={22} className="text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      Agent Control Center <Sparkles size={16} className="text-violet-400" />
                    </h1>
                    <p className="text-gray-400 text-sm">Multi-agent AI  4 specialists  Orchestrator  Risk Predictor  Policy Advisor</p>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={fetchStatus}
                  className="glass-button flex items-center gap-2 px-4 py-2" disabled={loading}>
                  <RefreshCw size={14} className={loading?"animate-spin":""} /> Refresh
                </motion.button>
              </div>
            </motion.div>

            {loading ? <LoadingSpinner text="Loading agent system..." /> : (
              <>
                {/* Status Bar */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <GlassCard animate={false}>
                    <div className="flex items-center gap-3"><BarChart3 size={18} className="text-cyan-400"/>
                      <div><p className="text-xs text-gray-400">Compliance Score</p><p className="text-xl font-bold text-cyan-400"><AnimatedCounter value={status?.compliance_score||0}/>%</p></div>
                    </div>
                  </GlassCard>
                  <GlassCard animate={false}>
                    <div className="flex items-center gap-3"><AlertCircle size={18} className="text-red-400"/>
                      <div><p className="text-xs text-gray-400">Open Violations</p><p className="text-xl font-bold text-red-400"><AnimatedCounter value={violations.open||0}/></p></div>
                    </div>
                  </GlassCard>
                  <GlassCard animate={false}>
                    <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-green-400"/>
                      <div><p className="text-xs text-gray-400">Agent Resolves</p><p className="text-xl font-bold text-green-400"><AnimatedCounter value={agentLogStats.resolves||0}/></p></div>
                    </div>
                  </GlassCard>
                  <GlassCard animate={false}>
                    <div className="flex items-center gap-3"><Activity size={18} className="text-purple-400"/>
                      <div><p className="text-xs text-gray-400">Total Actions</p><p className="text-xl font-bold text-purple-400"><AnimatedCounter value={agentLogStats.total_entries||0}/></p></div>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Specialist Agents */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2"><Bot size={14} className="text-violet-400"/>Specialist Agents</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {agents.length > 0 ? agents.map((agent: any) => <AgentCard key={agent.type} agent={agent}/>) :
                      ["security","privacy","vendor","operations"].map((type) => (
                        <AgentCard key={type} agent={{ type, name: type.charAt(0).toUpperCase()+type.slice(1)+"Agent", description:"Specialist for "+type+" compliance", actions_taken:0, capabilities:[] }}/>
                      ))}
                  </div>
                </motion.div>

                {/* Agent Commands */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <GlassCard animate={false}>
                    <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2"><Zap size={14} className="text-yellow-400"/>Agent Commands</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleOrchestrateAll} disabled={orchRunning}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all disabled:opacity-60">
                        <div className="flex items-center justify-between w-full">
                          {orchRunning ? <Loader2 size={18} className="text-violet-400 animate-spin"/> : <Brain size={18} className="text-violet-400"/>}
                          <ArrowRight size={14} className="text-violet-400/50"/>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-violet-300">{orchRunning?"Routing...":"Orchestrate All"}</p>
                          <p className="text-xs text-gray-400">Route all violations to specialists</p>
                        </div>
                      </motion.button>

                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handlePredictRisks} disabled={riskRunning}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all disabled:opacity-60">
                        <div className="flex items-center justify-between w-full">
                          {riskRunning ? <Loader2 size={18} className="text-orange-400 animate-spin"/> : <TrendingUp size={18} className="text-orange-400"/>}
                          <ArrowRight size={14} className="text-orange-400/50"/>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-orange-300">{riskRunning?"Scanning...":"Predict Risks"}</p>
                          <p className="text-xs text-gray-400">Catch violations before they trigger</p>
                        </div>
                      </motion.button>

                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSuggestPolicies} disabled={policyRunning}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-all disabled:opacity-60">
                        <div className="flex items-center justify-between w-full">
                          {policyRunning ? <Loader2 size={18} className="text-yellow-400 animate-spin"/> : <Lightbulb size={18} className="text-yellow-400"/>}
                          <ArrowRight size={14} className="text-yellow-400/50"/>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-yellow-300">{policyRunning?"Analyzing...":"Policy Advisor"}</p>
                          <p className="text-xs text-gray-400">Get policy improvement recommendations</p>
                        </div>
                      </motion.button>

                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleScan} disabled={scanRunning}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all disabled:opacity-60">
                        <div className="flex items-center justify-between w-full">
                          {scanRunning ? <Loader2 size={18} className="text-cyan-400 animate-spin"/> : <FileSearch size={18} className="text-cyan-400"/>}
                          <ArrowRight size={14} className="text-cyan-400/50"/>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-cyan-300">{scanRunning?"Scanning...":"Run Scan"}</p>
                          <p className="text-xs text-gray-400">Scan all records vs all rules</p>
                        </div>
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>

                {/* Results Panel with Tabs */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <GlassCard animate={false}>
                    <div className="flex gap-1 mb-4 border-b border-white/10 pb-3 flex-wrap">
                      {(["log","orchestrator","risks","policies"] as ActivePanel[]).map((panel) => (
                        <button key={panel} onClick={() => setActivePanel(panel)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activePanel===panel?"bg-white/10 text-gray-200 border border-white/20":"text-gray-400 hover:text-gray-300 hover:bg-white/5"}`}>
                          {panel==="log"&&<Clock size={12}/>}{panel==="orchestrator"&&<Brain size={12}/>}
                          {panel==="risks"&&<TrendingUp size={12}/>}{panel==="policies"&&<Lightbulb size={12}/>}
                          {panelTitles[panel!]}
                          {panel==="orchestrator"&&orchRunning&&<Loader2 size={10} className="animate-spin"/>}
                          {panel==="risks"&&riskRunning&&<Loader2 size={10} className="animate-spin"/>}
                          {panel==="policies"&&policyRunning&&<Loader2 size={10} className="animate-spin"/>}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={activePanel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                        {activePanel==="log" && <AgentLogPanel logs={logs}/>}
                        {activePanel==="orchestrator" && (orchRunning ? <LoadingSpinner text="Orchestrating through specialist agents..."/> : orchResult ? <OrchestratorResultPanel data={orchResult}/> : (
                          <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center gap-3"><Brain size={32} className="text-violet-400/40"/>Click "Orchestrate All" to begin.</div>
                        ))}
                        {activePanel==="risks" && (riskRunning ? <LoadingSpinner text="Risk Prediction Agent scanning records..."/> : <RiskPredictionPanel data={riskResult}/>)}
                        {activePanel==="policies" && (policyRunning ? <LoadingSpinner text="Policy Advisor analyzing patterns..."/> : <PolicyAdvisorPanel data={policyResult}/>)}
                      </motion.div>
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>

                {/* Recent Activity */}
                {status?.recent_activity?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <GlassCard animate={false}>
                      <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2"><Activity size={14} className="text-cyan-400"/>Recent Agent Activity</h3>
                      <div className="space-y-1">
                        {status.recent_activity.slice(0,5).map((a: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 text-xs py-1.5">
                            <span className="text-gray-500 shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "—"}</span>
                            <span className="text-cyan-400 font-medium">{a.action?.replace(/_/g," ")}</span>
                            <span className="font-mono text-gray-400">{a.entity_id}</span>
                            <span className="text-gray-500 truncate">{a.reason?.slice(0,60)}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
