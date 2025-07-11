/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // /api/ocr へのリクエストを外部 API の /ocr にプロキシ
      {
        source: '/api/ocr',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr`,
      },
      // /api/ocr 以下のサブパスも全て外部 API に転送
      {
        source: '/api/ocr/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
