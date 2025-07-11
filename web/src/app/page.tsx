// web/src/app/page.tsx
import UploadClient from './upload/UploadClient';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">名刺OCR デモアプリ</h1>
      <p className="mb-8">
        このアプリでは名刺画像をドラッグ＆ドロップでアップロードし、OCR 結果を確認できます。
      </p>
      <UploadClient />
    </main>
  );
}