'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number>(0);

  const onDrop = useCallback((accepted: File[]) => {
    // 画像のみフィルタ
    const images = accepted.filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...images]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  /** アップロードを Cloud Run へ送信 */
  async function handleUpload() {
    let completed = 0;
    for (const file of files) {
      const form = new FormData();
      form.append('image', file);

      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/ocr`, {
        method: 'POST',
        body: form,
      });

      completed += 1;
      setProgress(Math.round((completed / files.length) * 100));
    }
  }

  return (
    <main className="mx-auto max-w-4xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">名刺画像アップロード</h1>

      {/* Dropzone */}
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

      {/* サムネイル表示 */}
      {files.length > 0 && (
        <section className="mt-6 grid grid-cols-3 gap-4">
          {files.map(file => (
            <div key={file.name} className="relative group">
              <img
                src={URL.createObjectURL(file)}
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

      {/* 進捗バー & アップロードボタン */}
      {files.length > 0 && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow disabled:opacity-50"
            disabled={progress > 0 && progress < 100}
          >
            {progress === 0 ? 'アップロード開始' : 'アップロード中…'}
          </button>

          {/* プログレス */}
          {progress > 0 && (
            <div className="w-full h-3 bg-gray-200 rounded mt-4">
              <div
                className="h-full bg-blue-600 rounded transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
