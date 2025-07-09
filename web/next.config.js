// web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // ブラウザからの /api/ocr リクエストを Cloud Run 側の本番 URL に転送する
  async rewrites() {
    return [
      {
        source: '/api/ocr/:path*',
        destination: `${process.env.NEXT_PUBLIC_OCR_API_URL}/ocr/:path*`
      }
    ]
  }
}

module.exports = nextConfig
