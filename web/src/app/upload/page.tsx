// src/app/upload/page.tsx
export const runtime = 'edge'; // or dynamic='force-dynamic'

import UploadClient from './UploadClient';

export default function UploadPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">名刺画像アップロード</h1>
      <UploadClient />
    </main>
  );
}
