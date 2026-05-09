import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function isCloudinaryConfigured(): boolean {
  return !!(config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET);
}

router.post('/receipt', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  if (!isCloudinaryConfigured()) {
    res.status(503).json({ error: { code: 'UPLOAD_NOT_CONFIGURED', message: 'Receipt upload not configured' } });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file provided' } });
    return;
  }

  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'split/receipts', resource_type: 'image' },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Upload failed'));
          else resolve(result as { secure_url: string });
        }
      );
      stream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url });
  } catch {
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Upload failed' } });
  }
});

export default router;
