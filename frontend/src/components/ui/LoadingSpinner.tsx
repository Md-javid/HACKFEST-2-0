"use client";
import { motion } from "framer-motion";

export default function LoadingSpinner({ text = "Processing..." }: { text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <div className="relative w-16 h-16 mb-4">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-1 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-400 rounded-full pulse-glow" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full loading-dot" />
        <div className="w-2 h-2 bg-purple-500 rounded-full loading-dot" />
        <div className="w-2 h-2 bg-cyan-500 rounded-full loading-dot" />
      </div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{text}</p>
    </motion.div>
  );
}
