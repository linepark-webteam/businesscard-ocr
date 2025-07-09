// C:\Users\Lenovo\shusei-bizcard-web\api\src\ocr.ts
import { Router } from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import vision from '@google-cloud/vision';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = process.env.BUCKET_NAME!;
const storage = new Storage();
const visionClient = new vision.ImageAnnotatorClient();

/**
 * Multer の file プロパティを含むように型アサーション
 */
interface MulterRequest extends Express.Request {
  file: Express.Multer.File;
}

router.post(
    '/',
  upload.single('image'),
  async (req, res) => {
    try {
      // 型アサーションして file にアクセス
      const file = (req as MulterRequest).file!;
      const { originalname, buffer, mimetype } = file;

      const timestamp = Date.now();
      const gcsName = `${timestamp}_${originalname}`;

      // 1) Cloud Storage へ保存
      await storage
        .bucket(BUCKET)
        .file(gcsName)
        .save(buffer, { resumable: false, contentType: mimetype });

      // 2) Vision API OCR
      const [result] = await visionClient.documentTextDetection(
        `gs://${BUCKET}/${gcsName}`
      );

      // 3) レスポンス
      res.json({
        file: gcsName,
        text: result.fullTextAnnotation?.text ?? '',
        pages: result.fullTextAnnotation?.pages ?? [],
      });
    } catch (err: any) {
      console.error(err);
      res
    .status(500)
    .json({ error: err.message, stack: err.stack });
    }
  }
);

export default router;
