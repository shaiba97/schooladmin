import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // NOTE: cacheComponents off (matches student/teacher/guardian): cookie-read
  // layouts forbid static prerendering under that paradigm, and
  // partialPrefetching requires it. See guardian/DECISIONS.md.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
