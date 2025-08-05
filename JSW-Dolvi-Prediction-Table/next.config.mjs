/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // <-- Add this line to enable static export
  basePath: '/predictionTable',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Required for static export when using <Image>
  },
}

export default nextConfig
