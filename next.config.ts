import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aggregator.walrus-mainnet.walrus.space',
        pathname: '/v1/**',
      },
      {
        protocol: 'https',
        hostname: '*.walrus.space',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Enable WebAssembly for Walrus SDK
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream', '@mysten/walrus'],
};

export default nextConfig;
