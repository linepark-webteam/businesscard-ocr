// api/src/ocr.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";
import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessage,
} from "openai";
import axios from "axios";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------- env ---------- */
const keyJson = JSON.parse(process.env.VISION_SERVICE_ACCOUNT_KEY!);
const projectId = keyJson.project_id;
const BUCKET = process.env.BUCKET_NAME!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const STEIN_ENDPOINT = process.env.STEIN_ENDPOINT!;
const STEIN_API_KEY = process.env.STEIN_API_KEY!;

/* ---------- clients ---------- */
const storage = new Storage({ credentials: keyJson, projectId });
const visionClient = new vision.ImageAnnotatorClient({
  credentials: keyJson,
  projectId,
});
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

/* ---------- 型 ---------- */
interface MulterRequest extends Request {
  file: Express.Multer.File;
}
type FieldKey =
  | "name"
  | "furigana"
  | "company"
  | "address"
  | "tel"
  | "email"
  | "industry";
const FIELD_KEYS: FieldKey[] = [
  "name",
  "furigana",
  "company",
  "address",
  "tel",
  "email",
  "industry",
];

/* ---------- route ---------- */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    /* ----- 0. prepare ----- */
    const file = (req as MulterRequest).file!;
    const { originalname, buffer, mimetype } = file;
    const timestamp = new Date().toISOString();
    const gcsName = `${Date.now()}_${originalname}`;

    /* ----- 1. Upload to Cloud Storage ----- */
    await storage
      .bucket(BUCKET)
      .file(gcsName)
      .save(buffer, { resumable: false, contentType: mimetype });

    /* ----- 2. OCR via Vision API ----- */
    const [result] = await visionClient.documentTextDetection(
      `gs://${BUCKET}/${gcsName}`,
    );
    const text = result.fullTextAnnotation?.text?.trim() ?? "";

    /* ----- 3. Structure via GPT ----- */
    const systemPrompt = `次のテキストは日本語の名刺情報です。\
以下 7 項目を抽出し、**必ず**次の英語キーで JSON オブジェクトを返してください。\
キーは順序どおり・全て含めること。値が無い場合は空文字列 "" とします。

${FIELD_KEYS.join(", ")}

### 出力フォーマット（例）
{
  "name": "山田 太郎",
  "furigana": "ヤマダ タロウ",
  "company": "株式会社サンプル",
  "address": "東京都港区1-2-3 サンプルビル",
  "tel": "03-1234-5678",
  "email": "taro@example.jp",
  "industry": "ITサービス"
}`;

    const messages: ChatCompletionRequestMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ];

    const completion = await openai.createChatCompletion({
      model: process.env.OPENAI_MODEL_NAME || "gpt-4o-mini",
      messages,
      temperature: 0,
    });

    /* ----- 4. Parse / sanity-check ----- */
    const raw = completion.data.choices[0].message?.content ?? "{}";
    let structured: Record<FieldKey, string>;
    try {
      structured = JSON.parse(raw);
    } catch {
      structured = Object.fromEntries(FIELD_KEYS.map(k => [k, ""])) as Record<
        FieldKey,
        string
      >;
    }
    // 欠損キーを補完
    FIELD_KEYS.forEach(k => {
      if (structured[k] === undefined) structured[k] = "";
    });

    /* ----- 5. Save to Stein ----- */
    const record = {
      timestamp,
      ...structured,
      raw_json: JSON.stringify({ file: gcsName, text }),
    };
    await axios.post(STEIN_ENDPOINT, [record], {
      headers: { Authorization: `Bearer ${STEIN_API_KEY}` },
    });

    /* ----- 6. response ----- */
    res.json({ file: gcsName, structured, stein: "ok" });
  } catch (err: any) {
    console.error("OCR→GPT→Stein エラー:", err);
    res
      .status(err.isAxiosError ? err.response?.status || 502 : 500)
      .json({ error: err.message });
  }
});

export default router;
