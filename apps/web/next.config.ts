import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Les paquets du monorepo sont publiés en TypeScript source.
  transpilePackages: [
    '@arcade/game-sdk',
    '@arcade/protocol',
    '@arcade/reactor',
    '@arcade/interrogation',
  ],
};

export default config;
