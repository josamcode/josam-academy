import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // BR-923 — route groups are code-split so a learner bundle never contains admin code.
  // The enforcing check is a PH-0.16 fitness function; this only keeps the default intact.
  typedRoutes: true,
};

export default nextConfig;
