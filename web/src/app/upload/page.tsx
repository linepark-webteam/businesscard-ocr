// src/app/upload/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface OcrResult {
  file: string;
  text: string;
  pages: any[];
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newPreviews = accepted.map((file) => URL.createObjectURL(file));
    setFiles((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL が設定されていません');

      const resps = await Promise.all(
        files.map(async (file) => {
          const form = new FormData();
          form.append('image', file);
          const res = await fetch(`${API_URL}/ocr`, {
            method: 'POST',
            body: form,
          });
          if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
          return (await res.json()) as OcrResult;
        })
      );
      setResults(resps);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">名刺画像アップロード</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center mb-6 cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>ここにドロップしてください</p>
        ) : (
          <p>クリックまたはドラッグ＆ドロップで複数画像を選択</p>
        )}
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {previews.map((src, i) => (
            <div key={i} className="relative w-full h-48 bg-gray-100">
              <Image
                src={src}
                alt={`preview ${i}`}
                fill
                style={{ objectFit: 'contain' }}
              />
              <span className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                {(files[i].size / 1024).toFixed(0)} KB
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded mb-8"
      >
        {loading ? 'アップロード中...' : 'アップロード開始'}
      </button>

      {results.map((r, idx) => (
        <div key={idx} className="mb-8">
          <h2 className="font-semibold mb-2">{r.file}</h2>
          <pre
            className="
              bg-white dark:bg-gray-800
              text-black dark:text-gray-100
              p-4 rounded whitespace-pre-wrap
            "
          >
            {r.text}
          </pre>
        </div>
      ))}
    </div>
  );
}
