/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
    unoptimized: true
  },
  serverExternalPackages: ['@supabase/supabase-js'],
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig