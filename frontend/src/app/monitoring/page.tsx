"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Database,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import GlassCard from "@/components/ui/GlassCard";
import StatusBadge from "@/components/ui/StatusBadge";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AuthGuard from "@/components/layout/AuthGuard";
import { getScanHistory, triggerScan, getCompanyRecords } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MonitoringPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [scanRes, recRes] = await Promise.all([
        getScanHistory(20),
        getCompanyRecords(),
      ]);
      setScans(scanRes.data.scans || []);
      setRecords(recRes.data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await triggerScan();
      setScanResult(res.data);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  };

  return (
    <AuthGuard>
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px]">
        <Topbar onScanComplete={fetchData} />
        <div className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Autonomous Monitoring
            </h1>
            <p className="text-gray-400 text-sm">
              Scheduled compliance scans and database monitoring
            </p>
          </motion.div>

          {/* Scan Control */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <GlassCard animate={false}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <Activity size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Compliance Scanner</h3>
                    <p className="text-xs text-gray-400">
                      Scans all company records against active compliance rules
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Auto-scan every</p>
                    <p className="text-sm text-gray-500 font-medium">30 minutes</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleScan}
                    disabled={scanning}
                    className="glass-button flex items-center gap-2 px-6 py-3"
                  >
                    {scanning ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Scanning...
                      </>
                    ) : (
                      <>
                        <Play size={16} /> Run Scan Now
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Scan Result */}
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6"
                >
                  <LoadingSpinner text="Scanning database records against compliance rules..." />
                </motion.div>
              )}
              {scanResult && !scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 grid grid-cols-4 gap-4"
                >
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      <AnimatedCounter value={scanResult.records_scanned || 0} />
                    </p>
                    <p className="text-xs text-gray-400">Records Scanned</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      <AnimatedCounter value={scanResult.rules_applied || 0} />
                    </p>
                    <p className="text-xs text-gray-400">Rules Applied</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      <AnimatedCounter value={scanResult.violations_found || 0} />
                    </p>
                    <p className="text-xs text-gray-400">Violations Found</p>
                  </div>
                  <div className="glass-card !p-4 text-center">
                    <StatusBadge status={scanResult.status || "completed"} />
                    <p className="text-xs text-gray-400 mt-2">Status</p>
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scan History */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard animate={false}>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-blue-400" />
                  Scan History
                </h3>
                {loading ? (
                  <LoadingSpinner text="Loading..." />
                ) : scans.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No scans recorded yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {scans.map((scan, i) => (
                      <motion.div
                        key={scan.scan_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">
                              {scan.scan_id}
                            </span>
                            <StatusBadge status={scan.status} />
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatDate(scan.started_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {scan.violations_found} violations
                          </p>
                          <p className="text-xs text-gray-400">
                            {scan.records_scanned} records
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Monitored Records */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard animate={false}>
                <h3 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <Database size={16} className="text-purple-400" />
                  Monitored Company Records
                </h3>
                {loading ? (
                  <LoadingSpinner text="Loading..." />
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {records.map((rec, i) => (
                      <motion.div
                        key={rec.record_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-500 font-medium">
                              {rec.record_id}
                            </span>
                            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                              {rec.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{rec.department}</p>
                        </div>
                        <div className="text-xs text-gray-400">
                          {Object.keys(rec.data || {}).length} fields
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
