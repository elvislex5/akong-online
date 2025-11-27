import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Images to optimize
const imagesToOptimize = [
  'public/akong.png',
  'public/multiplayer-icon.png',
  'public/online-icon.png',
  'public/boards/futuriste.png',
  'public/boards/classic.png',
  'public/avatars/avatar_male_black.png',
  'public/avatars/avatar_male_white.png',
  'public/avatars/avatar_female_white.png',
  'public/avatars/avatar_female_black.png'
];

async function optimizeImages() {
  console.log('🖼️  Optimizing images...\n');

  for (const imagePath of imagesToOptimize) {
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  Skipping (not found): ${imagePath}`);
      continue;
    }

    try {
      // Get original file size
      const stats = fs.statSync(imagePath);
      const originalSize = stats.size;

      // Create backup
      const backupPath = imagePath.replace(/\.png$/, '.original.png');
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(imagePath, backupPath);
      }

      // Optimize image
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      // Resize if too large (max 2048px)
      let pipeline = image;
      if (metadata.width > 2048 || metadata.height > 2048) {
        pipeline = pipeline.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Compress and save
      await pipeline
        .png({
          quality: 80,
          compressionLevel: 9,
          palette: true
        })
        .toFile(imagePath + '.tmp');

      // Replace original with optimized
      fs.renameSync(imagePath + '.tmp', imagePath);

      // Get new file size
      const newStats = fs.statSync(imagePath);
      const newSize = newStats.size;
      const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

      console.log(`✅ ${imagePath}`);
      console.log(`   ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB (${savings}% reduction)`);
    } catch (error) {
      console.error(`❌ Error optimizing ${imagePath}:`, error.message);
    }
  }

  console.log('\n🎉 Image optimization complete!');
  console.log('💡 Original images backed up with .original.png extension');
}

optimizeImages();
