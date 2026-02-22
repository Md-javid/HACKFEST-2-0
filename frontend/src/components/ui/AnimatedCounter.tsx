"use client";
import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  duration = 1.5,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState(0);
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const rounded = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v)
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplayed(Number(v)));
    return unsubscribe;
  }, [rounded]);

  return (
    <motion.span className={className}>
      {prefix}
      {displayed}
      {suffix}
    </motion.span>
  );
}
