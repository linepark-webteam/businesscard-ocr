// web/next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,       // ← これだけでも OK
  // output: 'export',          // 静的 HTML にしたいならコメント解除
  // trailingSlash: true,       // ↑ を使う場合は true 推奨
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
