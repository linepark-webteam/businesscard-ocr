// app/upload/page.tsx
export const runtime = 'edge';        // 必ず Edge/Lambda 関数を生成
import UploadClient from './UploadClient';

export default function UploadPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <UploadClient />
    </div>
  );
}
