"use client";

import { MotionConfig } from "framer-motion";
import { IconContext } from "@phosphor-icons/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ weight: "light", size: 18 }}>{children}</IconContext.Provider>
    </MotionConfig>
  );
}
