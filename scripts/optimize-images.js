import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dirs = ['assets/images', 'public/assets/images'];

async function optimizeDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) continue;

        const ext = path.extname(file).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;

        const originalSize = stat.size;
        try {
            const inputBuffer = fs.readFileSync(filePath);
            const image = sharp(inputBuffer);
            const metadata = await image.metadata();

            let pipeline = sharp(inputBuffer);
            // Resize if ridiculously large
            if (metadata.width > 900 || metadata.height > 900) {
                pipeline = pipeline.resize(900, 900, { fit: 'inside', withoutEnlargement: true });
            }

            let optimizedBuffer;
            if (metadata.hasAlpha || ext === '.png' && (file.includes('logo') || metadata.format === 'png')) {
                optimizedBuffer = await pipeline.png({ quality: 80, compressionLevel: 9, effort: 8 }).toBuffer();
            } else if (ext === '.png') {
                // If it's a photo misnamed as png or jpeg content, compress as highly optimized png or jpeg
                optimizedBuffer = await pipeline.png({ quality: 80, compressionLevel: 9, palette: true }).toBuffer();
            } else {
                optimizedBuffer = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
            }

            // Only overwrite if actually smaller
            if (optimizedBuffer.length < originalSize) {
                fs.writeFileSync(filePath, optimizedBuffer);
                console.log(`✅ [${dir}] ${file}: ${(originalSize / 1024).toFixed(1)} KB -> ${(optimizedBuffer.length / 1024).toFixed(1)} KB (-${Math.round((1 - optimizedBuffer.length / originalSize) * 100)}%)`);
            } else {
                console.log(`ℹ️ [${dir}] ${file}: Already optimal (${(originalSize / 1024).toFixed(1)} KB)`);
            }
        } catch (err) {
            console.error(`❌ Failed optimizing ${filePath}:`, err.message);
        }
    }
}

async function run() {
    console.log('🚀 Optimizing static image assets...');
    for (const dir of dirs) {
        await optimizeDir(dir);
    }
    console.log('✨ Image optimization completed!');
}

run();
