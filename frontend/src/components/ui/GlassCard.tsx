"use client";
import { motion } from "framer-motion";
import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  onClick,
  animate = true,
}: GlassCardProps) {
  if (!animate) {
    return (
      <div
        className={`card p-6 ${onClick ? "cursor-pointer" : ""} ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
      whileHover={{ scale: 1.005, y: -1 }}
      className={`card p-6 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
