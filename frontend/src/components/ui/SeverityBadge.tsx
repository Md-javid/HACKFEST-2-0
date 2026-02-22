"use client";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

const severityConfig: Record<string, { label: string; class: string }> = {
  critical: { label: "Critical", class: "badge-critical" },
  high: { label: "High", class: "badge-high" },
  medium: { label: "Medium", class: "badge-medium" },
  low: { label: "Low", class: "badge-low" },
  info: { label: "Info", class: "badge-info" },
};

export default function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const cfg = severityConfig[severity] || severityConfig.info;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.class} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
