import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputImage = 'public/akong.png';
const outputDir = 'public/icons';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  try {
    // Check if input image exists
    if (!fs.existsSync(inputImage)) {
      console.error(`❌ Input image not found: ${inputImage}`);
      process.exit(1);
    }

    // Generate standard icons
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate maskable icons (with padding for safe zone)
    for (const size of [192, 512]) {
      const outputPath = path.join(outputDir, `icon-maskable-${size}x${size}.png`);
      const iconSize = Math.floor(size * 0.8); // 80% of total size for safe zone
      const padding = Math.floor((size - iconSize) / 2);

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 215, b: 0, alpha: 1 } // Gold background
        }
      })
      .composite([{
        input: await sharp(inputImage)
          .resize(iconSize, iconSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .toBuffer(),
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath);
      console.log(`✅ Generated: icon-maskable-${size}x${size}.png`);
    }

    // Generate favicon
    await sharp(inputImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('public/favicon.ico');
    console.log('✅ Generated: favicon.ico');

    // Generate apple-touch-icon
    await sharp(inputImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('public/apple-touch-icon.png');
    console.log('✅ Generated: apple-touch-icon.png');

    console.log('\n🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
