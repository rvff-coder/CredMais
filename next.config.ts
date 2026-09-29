import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Comprovante de até 4 MB + a sobra do multipart. Não passar de 4,5 MB:
      // é o teto de corpo de requisição das funções da Vercel.
      bodySizeLimit: '4.4mb',
    },
  },
}

export default nextConfig
