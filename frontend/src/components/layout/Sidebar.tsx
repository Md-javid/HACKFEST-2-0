import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  FileText,
  Activity,
  ClipboardList,
  Users,
  Database,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/violations", label: "Violations", icon: AlertTriangle },
  { href: "/policies", label: "Policies", icon: FileText },
  { href: "/records", label: "Records", icon: Database },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/users", label: "Users", icon: Users },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="light-sidebar fixed left-0 top-0 bottom-0 w-[240px] z-40 flex flex-col"
      style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <Shield size={20} className="text-white" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2"
            style={{ borderColor: "var(--bg-sidebar)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>PolicyPulse</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <Zap size={9} style={{ color: "var(--accent)" }} />
            <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              AI Compliance
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: "var(--text-muted)" }}>
          Navigation
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <motion.div
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
                  style={isActive
                    ? { background: "rgba(129,140,248,0.18)", color: "#a5b4fc" }
                    : { color: "var(--text-secondary)" }
                  }
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", backdropFilter: "blur(8px)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon
                    size={17}
                    className="relative z-10 shrink-0"
                    style={{ color: isActive ? "#a5b4fc" : "var(--text-muted)" }}
                  />
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                      style={{ background: "linear-gradient(180deg, #818cf8, #a78bfa)", boxShadow: "0 0 8px rgba(129,140,248,0.6)" }}
                      layoutId="sidebar-indicator"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer badge */}
      <div className="mx-3 mb-4 p-3.5 rounded-2xl" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#34d399", boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
          <span className="text-xs font-semibold" style={{ color: "#34d399" }}>System Active</span>
        </div>
        <p className="text-[10px]" style={{ color: "rgba(52,211,153,0.7)" }}>Autonomous monitoring enabled</p>
      </div>
    </motion.aside>
  );
}
