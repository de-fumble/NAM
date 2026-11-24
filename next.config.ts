import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js dev-mode badge.
  devIndicators: false,
  experimental: {
    // The dev-only MCP endpoint writes every browser console line to .next/dev/logs/next-development.log.
    // In this project that write triggers a Turbopack rebuild → "HMR hash mismatch" → full page reload → another
    // log line, so the page reloaded forever. Nothing here uses the endpoint, so it stays off.
    mcpServer: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // The admin setup screen reads the migration so it can be copied into the SQL editor.
  outputFileTracingIncludes: { "/admin": ["./supabase/migrations/*.sql"], "/admin/[section]": ["./supabase/migrations/*.sql"] },
};

export default nextConfig;
