import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import vision from '@google-cloud/vision';
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from 'openai';
import axios from 'axios';

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
const visionClient = new vision.ImageAnnotatorClient({ credentials: keyJson, projectId });

// OpenAI クライアント初期化
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

interface MulterRequest extends Request {
  file: Express.Multer.File;
}

router.post(
  '/',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const file = (req as MulterRequest).file!;
      const { originalname, buffer, mimetype } = file;
      const timestamp = new Date().toISOString();
      const gcsName = `${Date.now()}_${originalname}`;

      // 1) Cloud Storage にアップロード
      await storage.bucket(BUCKET).file(gcsName)
        .save(buffer, { resumable: false, contentType: mimetype });

      // 2) Vision API OCR
      const [result] = await visionClient.documentTextDetection(`gs://${BUCKET}/${gcsName}`);
      const text = result.fullTextAnnotation?.text?.trim() || '';

      // 3) GPT で構造化
      const messages: ChatCompletionRequestMessage[] = [
        {
          role: 'system',
          content: `You are a parser that extracts business card information from OCR text.\n
Extract the following fields:\n` +
                   `name (Kanji), kana (Katakana), position, company, address, tel, fax, email, website.\n` +
                   `Respond with JSON only, with keys: name, kana, position, company, address, tel, fax, email, website.`
        },
        { role: 'user', content: text }
      ];

      const gptRes = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.0
      });
      const structured = JSON.parse(gptRes.data.choices[0].message!.content);

      // 4) Stein に保存
      // Sheet の各カラムに合わせ、timestamp など追記
      const record = { timestamp, ...structured, raw_json: JSON.stringify({ file: gcsName, text }) };
      await axios.post(
        STEIN_ENDPOINT,
        [record],
        { headers: { Authorization: `Bearer ${STEIN_API_KEY}` } }
      );

      // 5) クライアントに返却
      res.json({ file: gcsName, structured, stein: 'ok' });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  }
);

export default router;
