import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Only run ESLint on the following directories during production builds
    dirs: ['src/app', 'src/components', 'src/contexts', 'src/lib', 'src/middleware.ts'],
    // Ignore test files and other non-production files
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Only run TypeScript checks on the following directories during production builds
    tsconfigPath: './tsconfig.json',
    ignoreBuildErrors: false,
  },
  // Exclude test files from the build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'jest': 'jest',
        'jest-environment-jsdom': 'jest-environment-jsdom',
      });
    }
    return config;
  },
};

export default nextConfig;
