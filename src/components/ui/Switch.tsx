"use client";

import { motion } from "framer-motion";
import { SPRING_SNAPPY } from "@/lib/motion";

export default function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative flex h-8 w-[3.4rem] shrink-0 items-center rounded-full p-1 transition-colors duration-300 ${
        on ? "justify-end bg-success" : "justify-start bg-map-land"
      }`}
    >
      <motion.span
        layout
        transition={SPRING_SNAPPY}
        className="h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)]"
      />
    </button>
  );
}
