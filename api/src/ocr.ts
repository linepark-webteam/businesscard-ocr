// api/src/ocr.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import vision from '@google-cloud/vision';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = process.env.BUCKET_NAME!;
const storage = new Storage();
const visionClient = new vision.ImageAnnotatorClient();

/**
 * Multer の file プロパティを含むリクエスト
 */
interface MulterRequest extends Request {
  file: Express.Multer.File;
}

router.post(
  '/',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      // 型アサーションで file を取り出し
      const file = (req as MulterRequest).file!;
      const { originalname, buffer, mimetype } = file;

      // 一意のファイル名を作成
      const timestamp = Date.now();
      const gcsName = `${timestamp}_${originalname}`;

      // 1) Cloud Storage へアップロード
      await storage
        .bucket(BUCKET)
        .file(gcsName)
        .save(buffer, {
          resumable: false,
          contentType: mimetype,
        });

      // 2) Vision API で OCR
      const [result] = await visionClient.documentTextDetection(
        `gs://${BUCKET}/${gcsName}`
      );

      // 3) クライアントへ返却
      res.json({
        file: gcsName,
        text: result.fullTextAnnotation?.text ?? '',
        pages: result.fullTextAnnotation?.pages ?? [],
      });
    } catch (err: any) {
      // エラーログをコンソール出力
      console.error(err);
      // デバッグ用にメッセージとスタックトレースを返す
      res
        .status(500)
        .json({ error: err.message, stack: err.stack });
    }
  }
);

export default router;
