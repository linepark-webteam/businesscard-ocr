// src/app/upload/UploadClient.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface OcrResult {
  file: string;
  text: string;
  pages: unknown[];
}

export default function UploadClient() {
  /* ---------- state ---------- */
  const [files, setFiles]     = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------- drop ---------- */
  const onDrop = useCallback((accepted: File[]) => {
    const urls = accepted.map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...accepted]);
    setPreviews(prev => [...prev, ...urls]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  /* ---------- upload ---------- */
  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      if (!API) throw new Error('NEXT_PUBLIC_API_URL が未設定です');

      const resArr = await Promise.all(
        files.map(async f => {
          const fd = new FormData();
          fd.append('image', f);
          const r  = await fetch(`${API}/ocr`, { method: 'POST', body: fd });
          if (!r.ok) throw new Error(`failed: ${f.name}`);
          return (await r.json()) as OcrResult;
        })
      );
      setResults(resArr);
} catch (e: unknown) {                 // ← any → unknown
  if (e instanceof Error) {
    alert(e.message);
    console.error(e);
  } else {
    alert('予期しないエラーが発生しました');
    console.error(e);
  }
} finally {
  setLoading(false);
}
  };

  /* ---------- UI ---------- */
  return (
    <>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center mb-6 cursor-pointer ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? 'ここにドロップしてください' : 'クリックまたはドラッグ＆ドロップで画像を選択'}
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {previews.map((src, i) => (
            <div key={i} className="relative w-full h-48 bg-gray-100">
              <Image src={src} alt={`preview ${i}`} fill style={{ objectFit: 'contain' }} />
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1 rounded">
                {(files[i].size / 1024).toFixed()} KB
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading || !files.length}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded mb-8"
      >
        {loading ? 'アップロード中…' : 'アップロード開始'}
      </button>

      {results.map((r, idx) => (
        <div key={idx} className="mb-8">
          <h2 className="font-semibold mb-2">{r.file}</h2>
          <pre className="bg-white dark:bg-gray-800 text-black dark:text-gray-100 p-4 rounded whitespace-pre-wrap">
            {r.text}
          </pre>
        </div>
      ))}
    </>
  );
}
