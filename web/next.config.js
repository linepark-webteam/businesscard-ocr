// web/next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/ocr/:path*',
        destination: `${process.env.NEXT_PUBLIC_OCR_API_URL}/ocr/:path*`,
      },
    ]
  },
}