'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface OcrResult {
  file: string;
  text: string;
  pages: unknown[];
}

export default function UploadClient() {
  const [files, setFiles]   = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(false);

  /* … ここに元の onDrop / handleUpload / JSX をそのまま移動 … */
}
