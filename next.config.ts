import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The pairing engine binary is spawned at runtime, so it must ship with the server functions.
  outputFileTracingIncludes: {
    "/dashboard/**": ["./bin/bbpPairings"],
    "/api/health": ["./bin/bbpPairings"],
  },
};

export default withNextIntl(nextConfig);
