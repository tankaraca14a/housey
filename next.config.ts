import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Allow next/image to optimize images served from Vercel Blob.
    // The hostname is the unique store ID, varies per Blob store —
    // wildcard everything under public.blob.vercel-storage.com.
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
};

export default nextConfig;
