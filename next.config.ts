import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Comprovante de até 5 MB + a sobra do multipart.
      bodySizeLimit: '6mb',
    },
  },
}

export default nextConfig
