// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: '名刺OCRアプリ',
  description: '名刺画像をアップロードしてOCRするデモアプリ',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      {/* suppressHydrationWarning を入れることで
          サーバーHTMLとクライアント描画の差分警告を抑制 */}
      <body
        suppressHydrationWarning
        className="bg-black text-white antialiased"
      >
        {children}
      </body>
    </html>
  );
}
