// api/src/ocr.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import vision from "@google-cloud/vision";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";
import axios from "axios";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 環境変数読み込み
const keyJson = JSON.parse(process.env.VISION_SERVICE_ACCOUNT_KEY!);
const projectId = keyJson.project_id;
const BUCKET = process.env.BUCKET_NAME!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const STEIN_ENDPOINT = process.env.STEIN_ENDPOINT!;
const STEIN_KEY = process.env.STEIN_API_KEY!;

// GCS/Vision クライアント初期化
const storage = new Storage({ credentials: keyJson, projectId });
const visionClient = new vision.ImageAnnotatorClient({
  credentials: keyJson,
  projectId,
});

// OpenAI クライアント初期化
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

// GPT function calling 用スキーマ
const parseBusinessCard = {
  name: "parse_business_card",
  description: "名刺OCRの結果を構造化して返します",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "氏名" },
      kana: { type: "string", description: "フリガナ" },
      tel: {
        type: "array",
        items: { type: "string" },
        description: "電話番号リスト",
      },
      mail: {
        type: "array",
        items: { type: "string" },
        description: "メールアドレスリスト",
      },
      company: { type: "string", description: "会社名" },
      industry: { type: "string", description: "業種" },
      position: { type: "string", description: "役職" },
    },
    required: ["name"],
  },
};

router.post(
  "/",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      // --- 1) Cloud Storage にアップロード ---
      const file = req.file!;
      const timestamp = Date.now();
      const gcsName = `${timestamp}_${file.originalname}`;
      await storage
        .bucket(BUCKET)
        .file(gcsName)
        .save(file.buffer, { resumable: false, contentType: file.mimetype });

      // --- 2) Vision API で OCR ---
      const [visResp] = await visionClient.documentTextDetection(
        `gs://${BUCKET}/${gcsName}`
      );
      const rawText = visResp.fullTextAnnotation?.text || "";

      // --- 3) GPT 関数呼び出しで構造化 ---
      const messages: ChatCompletionRequestMessage[] = [
        {
          role: "system",
          content:
            "以下は名刺OCRの結果のテキストです。JSON 形式に構造化してください。",
        },
        { role: "user", content: rawText },
      ];
      const chat = await openai.createChatCompletion({
        model: "gpt-4o-mini",
        messages,
        functions: [parseBusinessCard],
        function_call: { name: parseBusinessCard.name },
      });
      const fnCall = chat.data.choices[0].message!.function_call!;
      const parsed = JSON.parse(fnCall.arguments!) as {
        name: string;
        kana?: string;
        tel?: string[];
        mail?: string[];
        company?: string;
        industry?: string;
        position?: string;
      };

      // --- 4) Stein API へ書き込み ---
      const record = {
        timestamp: new Date().toISOString(),
        name: parsed.name,
        kana: parsed.kana ?? "",
        tel: (parsed.tel ?? []).join(","),
        mail: (parsed.mail ?? []).join(","),
        company: parsed.company ?? "",
        industry: parsed.industry ?? "",
        position: parsed.position ?? "",
        raw_json: JSON.stringify(parsed),
      };
      await axios.post(process.env.STEIN_ENDPOINT!, record, {
        auth: {
          username: process.env.STEIN_AUTH_USERNAME!,
          password: process.env.STEIN_AUTH_PASSWORD!,
        },
      });

      // --- 5) クライアントに返却 ---
      res.json(parsed);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
