import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { AdminLogin, AdminShell } from "@/components/admin/shell";
import { getAdminSession } from "@/lib/server/session";
import { supabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

function migrationSql(file: string) {
  try {
    return readFileSync(path.join(process.cwd(), "supabase/migrations", file), "utf8");
  } catch {
    return "-- Migration file not found. See supabase/migrations in the repository.";
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = supabaseConfigured ? await getAdminSession() : null;
  if (!admin) return <AdminLogin configured={supabaseConfigured} />;
  return (
    <AdminShell email={admin.email} sql={migrationSql("20261121120000_marketplace_schema.sql")} authSql={migrationSql("20261123090000_email_auth.sql")}>
      {children}
    </AdminShell>
  );
}
