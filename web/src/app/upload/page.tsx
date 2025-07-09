// web/src/app/upload/page.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

type UploadFile = {
  file: File;
  preview: string;
};

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
      }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    let done = 0;

    for (const { file } of files) {
      const form = new FormData();
      // ファイル名に UUID + front/back を付与
      const id = crypto.randomUUID();
      const isBack = /back/i.test(file.name);
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${id}_${isBack ? 'back' : 'front'}.${ext}`;
      form.append('image', file, fileName);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/ocr`,
          {
            method: 'POST',
            body: form,
          }
        );
        if (!res.ok) {
          console.error(`Upload failed for ${file.name}`);
        }
      } catch (err) {
        console.error(err);
      }

      done += 1;
      setProgress(Math.round((done / files.length) * 100));
    }

    setUploading(false);
  };

  return (
    <main className="mx-auto max-w-4xl py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">名刺画像アップロード</h1>

      {/* ドロップゾーン */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          isDragActive ? 'bg-blue-50 border-blue-400' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive
          ? 'ここにドロップしてください…'
          : 'クリックまたはドラッグ＆ドロップで複数画像を選択'}
      </div>

      {/* プレビュー */}
      {files.length > 0 && (
        <section className="mt-6 grid grid-cols-3 gap-4">
          {files.map(({ file, preview }) => (
            <div key={preview} className="relative group">
              <img
                src={preview}
                alt={file.name}
                className="object-cover w-full h-32 rounded-lg shadow-sm"
              />
              <span className="absolute bottom-1 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                {Math.round(file.size / 1024)} KB
              </span>
            </div>
          ))}
        </section>
      )}

      {/* アップロードボタン & プログレスバー */}
      {files.length > 0 && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow disabled:opacity-50"
          >
            {uploading ? `アップロード中… (${progress}%)` : 'アップロード開始'}
          </button>

          {uploading && (
            <div className="w-full h-3 bg-gray-200 rounded mt-4">
              <div
                className="h-full bg-blue-600 rounded transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
