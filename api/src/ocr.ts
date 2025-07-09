// api/src/ocr.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import vision from '@google-cloud/vision';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 環境変数から JSON を直接読み込む
const keyJson = JSON.parse(process.env.VISION_SERVICE_ACCOUNT_KEY!);
const projectId = keyJson.project_id;

// Storage/Vision クライアントを明示的に認証情報付きで初期化
const storage = new Storage({ credentials: keyJson, projectId });
const visionClient = new vision.ImageAnnotatorClient({ credentials: keyJson, projectId });

const BUCKET = process.env.BUCKET_NAME!;

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
      const timestamp = Date.now();
      const gcsName = `${timestamp}_${originalname}`;

      // 1) Cloud Storage にアップロード
      await storage
        .bucket(BUCKET)
        .file(gcsName)
        .save(buffer, { resumable: false, contentType: mimetype });

      // 2) Vision API OCR
      const [result] = await visionClient.documentTextDetection(`gs://${BUCKET}/${gcsName}`);

      // 3) レスポンス
      res.json({
        file: gcsName,
        text: result.fullTextAnnotation?.text ?? '',
        pages: result.fullTextAnnotation?.pages ?? [],
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  }
);

export default router;
