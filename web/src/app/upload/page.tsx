// web/src/app/upload/page.tsx
export const runtime = 'edge'; // 域外 (Edge) 実行環境を指定したい場合

import UploadClient from './UploadClient';

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-4xl py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">名刺画像アップロード</h1>
      <UploadClient />
    </main>
  );
}
