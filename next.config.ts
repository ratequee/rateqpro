import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: [
    "@prisma/client",
    "pg",
    "@prisma/adapter-pg",
    "@supabase/supabase-js",
    "unpdf",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default withNextIntl(nextConfig);
