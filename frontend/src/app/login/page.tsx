import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Brain,
  FileSearch,
  AlertTriangle,
  Activity,
  ClipboardCheck,
  Lock,
  Mail,
  User,
  Building2,
  ArrowRight,
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: FileSearch,
    title: "PDF Policy Ingestion",
    desc: "Upload compliance PDFs — AI extracts structured rules automatically.",
    color: "bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    desc: "Gemini & Claude analyze policies, detect violations, and explain findings.",
    color: "bg-violet-50 text-violet-600",
    dot: "bg-violet-500",
  },
  {
    icon: AlertTriangle,
    title: "Violation Detection",
    desc: "Autonomous scanning finds compliance gaps with confidence scoring.",
    color: "bg-orange-50 text-orange-600",
    dot: "bg-orange-500",
  },
  {
    icon: Activity,
    title: "Real-Time Monitoring",
    desc: "Scheduled scans continuously monitor your company data for risks.",
    color: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
  },
  {
    icon: ClipboardCheck,
    title: "Human Oversight",
    desc: "Review, approve, or escalate AI findings — full audit trail included.",
    color: "bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, email, password, organization: organization || undefined });
      }
      navigate("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          (mode === "login"
            ? "Invalid email or password"
            : "Registration failed. Email may already be in use.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* ── Left Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)", transform: "translate(40%, -40%)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", transform: "translate(-40%, 40%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">PolicyPulse AI</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Zap size={10} className="text-white/70" />
                <span className="text-[10px] text-white/70 font-medium tracking-widest uppercase">Autonomous Compliance</span>
              </div>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-6 max-w-sm leading-relaxed">
            An AI-powered platform that ingests compliance policies, extracts enforceable rules,
            and autonomously scans your company database for violations.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3 my-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <f.icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-[11px] text-white/55 leading-relaxed">{f.desc}</p>
              </div>
              <CheckCircle2 size={16} className="text-white/40 ml-auto shrink-0" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 text-[11px] text-white/30">
          Built for HACKFEST 2.0 — PolicyPulse AI v2.0
        </div>
      </motion.div>

      {/* ── Right Panel: Form ── */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
              <Shield size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>PolicyPulse AI</h1>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {mode === "login"
                ? "Sign in to your compliance dashboard"
                : "Start monitoring compliance today"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 mb-7 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(""); }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={mode === tab
                  ? { background: "rgba(129,140,248,0.20)", color: "#a5b4fc", boxShadow: "0 2px 8px rgba(129,140,248,0.25)", border: "1px solid rgba(129,140,248,0.30)" }
                  : { color: "var(--text-secondary)" }}
              >
                {tab === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                      <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe" required
                        className="light-input w-full pl-9 pr-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Organization <span style={{ color: "var(--text-muted)" }}>(optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                      <input
                        type="text" value={organization} onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Acme Corp"
                        className="light-input w-full pl-9 pr-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="light-input w-full pl-9 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="light-input w-full pl-9 pr-10 py-2.5 text-sm"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-2"
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <motion.div
                  className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo tip */}
          <div className="mt-6 p-4 rounded-xl" style={{ background: "#f0f4ff", border: "1px solid #c7d2fe" }}>
            <p className="text-xs text-center" style={{ color: "#4338ca" }}>
              <span className="font-semibold">Demo tip:</span>{" "}
              Register with any email. Use role{" "}
              <span className="font-mono font-bold">admin</span> field for full access.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
