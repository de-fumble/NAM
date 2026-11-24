"use client";

import { useEffect } from "react";
import { useEngine } from "@/lib/db";
import { fmtWhen } from "@/lib/engines";
import { Logo } from "./ui";

/**
 * Admin → Engines → Maintenance mode. Covers the public site while it's running (the server refuses
 * every change at the same time). The admin console isn't affected.
 */
export function Maintenance() {
  const { running, state, message } = useEngine("maintenance");
  useEffect(() => {
    if (!running) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, [running]);
  if (!running) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="maintenance-title" className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-paper px-5 py-16">
      <div className="max-w-md text-center">
        <Logo size={88} href={null} className="mx-auto" />
        <h1 id="maintenance-title" className="headline mt-8 text-balance text-[36px] sm:text-[48px]">We&apos;ll be right back.</h1>
        <p className="mt-3 text-balance text-[17px] text-mute">{message}</p>
        {state.until && <p className="mt-4 text-[14px] text-faint">Expected back {fmtWhen(state.until)} (Lagos time).</p>}
      </div>
    </div>
  );
}
