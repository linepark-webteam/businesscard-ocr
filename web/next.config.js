// web/next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'export',      // ★ 追加
  trailingSlash: true,   // ★ 既に追加済み
  async rewrites() {
    return [
      {
        source: '/api/ocr/:path*',
        destination:
          `${process.env.NEXT_PUBLIC_OCR_API_URL}/ocr/:path*`,
      },
    ];
  },
};
