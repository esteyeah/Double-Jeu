import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Les paquets du monorepo sont publiés en TypeScript source.
  transpilePackages: [
    '@arcade/game-sdk',
    '@arcade/protocol',
    '@arcade/reactor',
    '@arcade/interrogation',
    '@arcade/throne',
    '@arcade/plunder',
    '@arcade/expedition',
    '@arcade/court',
    '@arcade/cauldron',
    '@arcade/cups',
    '@arcade/compass',
    '@arcade/tabletop',
  ],
};

export default config;
