// api/src/ocr.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";
import axios from "axios";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 環境変数チェック
const keyJson = JSON.parse(process.env.VISION_SERVICE_ACCOUNT_KEY!);
const projectId = keyJson.project_id;
const BUCKET = process.env.BUCKET_NAME!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const STEIN_ENDPOINT = process.env.STEIN_ENDPOINT!;
const STEIN_API_KEY = process.env.STEIN_API_KEY!;

// Storage/Vision クライアント初期化
const storage = new Storage({ credentials: keyJson, projectId });
const visionClient = new vision.ImageAnnotatorClient({
  credentials: keyJson,
  projectId,
});

// OpenAI クライアント
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

interface MulterRequest extends Request {
  file: Express.Multer.File;
}

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const file = (req as MulterRequest).file!;
    const { originalname, buffer, mimetype } = file;
    const timestamp = new Date().toISOString();
    const gcsName = `${Date.now()}_${originalname}`;

    // 1) Cloud Storage にアップロード
    await storage
      .bucket(BUCKET)
      .file(gcsName)
      .save(buffer, { resumable: false, contentType: mimetype });

    // 2) Vision API OCR
    const [result] = await visionClient.documentTextDetection(
      `gs://${BUCKET}/${gcsName}`
    );
    const text = result.fullTextAnnotation?.text?.trim() || "";

    // 3) GPT で構造化
    const messages: ChatCompletionRequestMessage[] = [
      {
        role: "system",
        content:
          `名刺からOCRで抽出したテキストを受け取り、必ず以下のJSONを返してください。` +
          `\n` +
          `{\n` +
          `  "name": "<氏名>",\n` +
          `  "furigana": "<フリガナ>",\n` +
          `  "company": "<会社名>",\n` +
          `  "address": "<住所>",\n` +
          `  "tel": "<電話番号>",\n` +
          `  "mail": "<メールアドレス>",\n` +
          `  "industry": "<業種>"\n` +
          `}`,
      },
      { role: "user", content: text },
    ];

    const completion = await openai.createChatCompletion({
      model: process.env.OPENAI_MODEL_NAME || "gpt-4.1-nano",
      messages,
      temperature: 0.2,
    });

    const structured = JSON.parse(
      completion.data.choices[0].message?.content ?? "{}"
    );

    // 4) Stein に保存
    const record = {
      timestamp,
      name: structured.name,
      furigana: structured.furigana,
      company: structured.company,
      address: structured.address,
      tel: structured.tel,
      mail: structured.mail,
      industry: structured.industry,
      raw_json: JSON.stringify({ file: gcsName, text }),
    };
    await axios.post(STEIN_ENDPOINT, [record], {
      headers: { Authorization: `Bearer ${STEIN_API_KEY}` },
    });

    // 5) クライアントに返却
    res.json({ file: gcsName, structured, stein: "ok" });
  } catch (err: any) {
    console.error("OCR→GPT→Stein エラー:", err);
    res
      .status(err.isAxiosError ? err.response?.status || 502 : 500)
      .json({ error: err.message });
  }
});

export default router;
