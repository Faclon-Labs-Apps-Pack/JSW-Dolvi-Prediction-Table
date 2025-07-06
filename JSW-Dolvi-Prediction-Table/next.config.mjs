/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/predictionTable',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig