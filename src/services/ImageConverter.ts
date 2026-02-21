import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function convertToWebP(
  base64: string,
  outputPath: string
): Promise<void> {
  const buffer = Buffer.from(base64, 'base64');
  const webpBuffer = await sharp(buffer)
    .webp({ quality: 85, effort: 6 })
    .toBuffer();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, webpBuffer);
}
