import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(
  cloudName &&
    apiKey &&
    apiSecret &&
    cloudName !== 'your_cloud_name' &&
    apiKey !== 'your_cloudinary_api_key' &&
    apiSecret !== 'your_cloudinary_api_secret'
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimetype: string,
  folder = 'sim-asrama'
): Promise<{ url: string; provider: 'cloudinary' | 'local-data-url' }> {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Gagal mengunggah ke Cloudinary'));
          }
          resolve({ url: result.secure_url, provider: 'cloudinary' });
        }
      );
      stream.end(buffer);
    });
  }

  // Fallback for preview environment when Cloudinary credentials are not set in .env
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64}`;
  return {
    url: dataUrl,
    provider: 'local-data-url',
  };
}

export default cloudinary;
