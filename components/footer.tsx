"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

const COLS: [string, [string, string][]][] = [
  ["Shop", [["Buy a car", "/cars"], ["Brand new", "/cars?condition=Brand+New"], ["Foreign used (Tokunbo)", "/cars?condition=Foreign+Used"], ["Nigerian used", "/cars?condition=Nigerian+Used"], ["Spare parts", "/parts"], ["Car rentals", "/rentals"]]],
  ["For business", [["Sell on Naija Auto", "/business"], ["Car dealers", "/business#dealer"], ["Rental companies", "/business#rental"], ["Parts dealers", "/business#parts"], ["Business dashboard", "/dashboard"]]],
  ["Services", [["Find a mechanic", "/services?c=Mechanic"], ["Pre-purchase inspection", "/services?c=Inspection"], ["Clearing agents", "/services?c=Clearing+Agent"], ["Papers & plates", "/services?c=Paperwork"]]],
  ["Money & safety", [["Car loans", "/finance"], ["Insurance", "/finance?tab=insurance"], ["Import duty estimator", "/finance?tab=duty"], ["VIN check", "/verify"]]],
];

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  return (
    <footer className="mt-24 border-t border-hair bg-mist/60 pb-24 pt-12 text-[12px] text-mute sm:pb-10">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-8 border-b border-line/60 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo size={88} />
          <p className="max-w-xl leading-relaxed">
            Prices are set by sellers and may be negotiable. Always inspect a vehicle and verify its papers before payment. Financing is subject to lender approval.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 py-8 sm:grid-cols-4">
          {COLS.map(([h, links]) => (
            <div key={h}>
              <h4 className="mb-3 font-semibold text-ink">{h}</h4>
              <ul className="space-y-2.5">
                {links.map(([l, href]) => (
                  <li key={l}>
                    <Link href={href} className="transition-colors hover:text-ink hover:underline">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © {new Date().getFullYear()} Naija Auto Market. Made in Lagos for all 36 states + FCT.</p>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Nigeria · English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
