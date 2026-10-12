import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["pdfjs-dist", "mammoth", "tar-stream"],
  experimental: { proxyClientMaxBodySize: "90mb" },
};
export default config;
