"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useEngine } from "@/lib/db";
import { cn } from "@/lib/utils";

const KEY = "nam-dismissed-announcement";

/** Site-wide notice set from Admin → Engines. Floats under the nav; dismissal is remembered per message. */
export function Announcement() {
  // Admin → Engines → Site announcement: on/off, scheduled window and daily hours all apply.
  const { running, params } = useEngine("announcement");
  const text = running ? String(params.text ?? "").trim() : "";
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(KEY));
    } catch {}
  }, []);
  const show = !!text && dismissed !== text;
  const warn = params.tone === "warning";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-none fixed inset-x-0 top-[72px] z-40 flex justify-center px-4"
          role="status"
        >
          <div className={cn("pointer-events-auto flex max-w-xl items-start gap-2.5 rounded-2xl py-2.5 pl-4 pr-2 text-[13px] shadow-float ring-1", warn ? "bg-[#fff4d6] text-[#5c3d00] ring-[#f0d48a]" : "bg-white text-ink ring-black/[0.06]")}>
            {warn ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-link" />}
            <span className="leading-snug">{text}</span>
            <button
              onClick={() => {
                setDismissed(text);
                try {
                  localStorage.setItem(KEY, text);
                } catch {}
              }}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-black/5"
              aria-label="Dismiss announcement"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
