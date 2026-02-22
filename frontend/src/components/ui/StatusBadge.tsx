"use client";
import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  open:       "bg-red-500/15 text-red-300 border-red-500/30",
  reviewed:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  escalated:  "bg-purple-500/15 text-purple-300 border-purple-500/30",
  resolved:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  active:     "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  processing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  running:    "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  completed:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed:     "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-gray-500/15 text-gray-400 border-gray-500/30";
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </motion.span>
  );
}
