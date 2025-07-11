// /api/src/index.ts
import express from 'express';
import cors from 'cors';  // 追加
import ocrRouter from './ocr.js';

const app = express();

// CORS 設定（フロントのオリジンを環境変数等で絞ってください）
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));

app.use(express.json());
app.use('/ocr', ocrRouter);

const PORT = process.env.PORT ?? 8080;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
