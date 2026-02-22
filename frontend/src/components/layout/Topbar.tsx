"use client";
import { Bell, Search, RefreshCw, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { triggerScan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

interface TopbarProps {
  onScanComplete?: () => void;
}

export default function Topbar({ onScanComplete }: TopbarProps) {
  const { user, logout } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      await triggerScan();
      onScanComplete?.();
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="light-topbar sticky top-0 z-30 h-14 flex items-center justify-between px-6"
      style={{ color: "var(--text-primary)" }}
    >
      {/* Search */}
      <div className="relative flex items-center flex-1 max-w-sm">
        <Search size={14} className="absolute left-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search policies, violations..."
          className="light-input w-full pl-8 pr-4 py-2 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Run Scan button */}
        <motion.button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
          style={{
            background: scanning
              ? "rgba(129,140,248,0.15)"
              : "linear-gradient(135deg, rgba(79,70,229,0.85), rgba(124,58,237,0.85))",
            color: scanning ? "#a5b4fc" : "#fff",
            border: scanning ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(12px)",
            boxShadow: scanning ? "none" : "0 4px 16px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
          whileHover={{ scale: scanning ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={scanning ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: scanning ? Infinity : 0, ease: "linear" }}
          >
            <RefreshCw size={13} />
          </motion.div>
          {scanning ? "Scanning..." : "Run Scan"}
        </motion.button>

        {/* Bell */}
        <motion.button
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.07)" }}
          whileHover={{ scale: 1.08, backgroundColor: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell size={17} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            3
          </span>
        </motion.button>

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer transition-shadow hover:shadow-md"
              style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.9), rgba(124,58,237,0.9))", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 2px 12px rgba(79,70,229,0.4)" }}
          >
            {user?.name?.charAt(0).toUpperCase() || "A"}
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl z-50 p-2 shadow-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="px-3 py-2.5 mb-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
                <span
                  className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-lg font-semibold"
                  style={{ background: "rgba(129,140,248,0.15)", color: "#a5b4fc", border: "1px solid rgba(129,140,248,0.25)" }}
                >
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ color: "#f87171" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
