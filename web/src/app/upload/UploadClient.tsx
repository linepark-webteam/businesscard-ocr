// web/src/app/upload/UploadClient.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";

interface OcrResult {
  file: string;
  structured: {
    name: string;
    furigana: string;
    company: string;
    address: string;
    tel: string;
    mail: string;
    industry: string;
  };
}

export default function UploadClient() {
  /* ---------- state ---------- */
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------- drop ---------- */
  const onDrop = useCallback((accepted: File[]) => {
    const newUrls = accepted.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [...prev, ...newUrls]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  /* ---------- cleanup blob URLs on unmount or when previews change ---------- */
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  /* ---------- upload ---------- */
  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!API) throw new Error("NEXT_PUBLIC_API_BASE_URL が未設定です");

      const resArr = await Promise.all(
        files.map(async (f) => {
          const fd = new FormData();
          fd.append("image", f);
          const r = await fetch(`${API}/ocr`, { method: "POST", body: fd });
          if (!r.ok) throw new Error(`failed: ${f.name}`);
          const json = await r.json();
          // もともと { file, structured, stein } を返しているはずなので
          return {
            file: json.file,
            structured: json.structured,
          } as OcrResult;
        })
      );
      setResults(resArr);
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message);
        console.error(e);
      } else {
        alert("予期しないエラーが発生しました");
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
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive
          ? "ここにドロップしてください"
          : "クリックまたはドラッグ＆ドロップで画像を選択"}
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {previews.map((src, i) => (
            <div
              key={files[i].name}
              className="relative w-full h-48 bg-gray-100"
            >
              <img
                src={src}
                alt={`preview ${files[i].name}`}
                className="w-full h-full object-contain"
              />
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
        {loading ? "アップロード中…" : "アップロード開始"}
      </button>

      {results.map((r, idx) => (
        <div key={r.file + idx} className="mb-8">
          <h2 className="font-semibold mb-2">{r.file}</h2>
          <pre className="bg-white dark:bg-gray-800 text-black dark:text-gray-100 p-4 rounded whitespace-pre-wrap">
            <ul className="bg-white p-4 rounded">
              <li>氏名: {r.structured.name}</li>
              <li>フリガナ: {r.structured.furigana}</li>
              <li>会社名: {r.structured.company}</li>
              <li>住所: {r.structured.address}</li>
              <li>TEL: {r.structured.tel}</li>
              <li>Mail: {r.structured.mail}</li>
              <li>業種: {r.structured.industry}</li>
            </ul>
          </pre>
        </div>
      ))}
    </>
  );
}
