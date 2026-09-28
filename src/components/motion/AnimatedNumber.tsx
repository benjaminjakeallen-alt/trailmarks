"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, useSpring } from "framer-motion";

/** Spring-counts to `value`, writing straight to the DOM so it never re-renders. */
export default function AnimatedNumber({
  value,
  decimals = 0,
  pad = 0,
  className,
}: {
  value: number;
  decimals?: number;
  pad?: number;
  className?: string;
}) {
  const spring = useSpring(0, { stiffness: 90, damping: 20, mass: 0.8 });
  const ref = useRef<HTMLSpanElement>(null);

  const format = (n: number) => {
    const fixed = n.toFixed(decimals);
    return pad ? fixed.padStart(pad + (decimals ? decimals + 1 : 0), "0") : fixed;
  };

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useMotionValueEvent(spring, "change", (latest) => {
    if (ref.current) ref.current.textContent = format(latest);
  });

  return (
    <span ref={ref} className={`tabular ${className ?? ""}`}>
      {format(0)}
    </span>
  );
}
