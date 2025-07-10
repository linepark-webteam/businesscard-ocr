/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  // export モードでは Next が自動で `out/` に書き出す
  // → distDir は触らない！
  async rewrites() {
    return [
      {
        source: '/api/ocr/:path*',
        destination: `${process.env.NEXT_PUBLIC_OCR_API_URL}/ocr/:path*`,
      },
    ];
  },
};
