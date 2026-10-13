import { query, pool } from '../server/db.js';
import sharp from 'sharp';

async function compressDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return dataUrl;
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;

    const mime = match[1];
    const b64 = match[2];
    const inputBuf = Buffer.from(b64, 'base64');

    // Only compress if larger than 25KB
    if (inputBuf.length <= 25 * 1024) return dataUrl;

    try {
        const compressed = await sharp(inputBuf)
            .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 })
            .toBuffer();

        if (compressed.length < inputBuf.length) {
            return `data:image/webp;base64,${compressed.toString('base64')}`;
        }
    } catch (e) {
        console.warn('Could not compress image buffer:', e.message);
    }
    return dataUrl;
}

async function run() {
    console.log('🔄 Compressing existing base64 images in Supabase database...');
    const res = await query('SELECT id, name, img, images FROM menu_items');
    console.log(`Found ${res.rows.length} items to inspect.`);

    let beforeTotal = 0;
    let afterTotal = 0;
    let updatedCount = 0;

    for (const item of res.rows) {
        let changed = false;
        const origImgLen = item.img ? item.img.length : 0;
        let origImgsLen = 0;

        let imgs = [];
        if (Array.isArray(item.images)) {
            imgs = item.images;
        } else if (typeof item.images === 'string') {
            try { imgs = JSON.parse(item.images); } catch(e) { imgs = []; }
        }
        origImgsLen = JSON.stringify(imgs).length;
        beforeTotal += origImgLen + origImgsLen;

        let newImg = item.img;
        if (item.img && item.img.startsWith('data:')) {
            newImg = await compressDataUrl(item.img);
            if (newImg !== item.img) changed = true;
        }

        let newImgs = [];
        for (const imgItem of imgs) {
            if (imgItem && imgItem.startsWith('data:')) {
                const comp = await compressDataUrl(imgItem);
                newImgs.push(comp);
                if (comp !== imgItem) changed = true;
            } else {
                newImgs.push(imgItem);
            }
        }

        // Deduplicate: if images array is empty, default to [newImg]
        if (newImgs.length === 0 && newImg) {
            newImgs = [newImg];
            changed = true;
        }

        const newImgLen = newImg ? newImg.length : 0;
        const newImgsLen = JSON.stringify(newImgs).length;
        afterTotal += newImgLen + newImgsLen;

        if (changed) {
            await query(`
                UPDATE menu_items
                SET img = $1, images = $2, updated_at = NOW()
                WHERE id = $3
            `, [newImg, JSON.stringify(newImgs), item.id]);
            updatedCount++;
            console.log(`✅ [${item.id}] ${item.name}: Reduced from ${((origImgLen + origImgsLen) / 1024).toFixed(1)} KB to ${((newImgLen + newImgsLen) / 1024).toFixed(1)} KB`);
        }
    }

    console.log('==============================================');
    console.log(`🎉 DB Compression complete! Updated ${updatedCount} items.`);
    console.log(`Total DB image text size: ${(beforeTotal / 1024 / 1024).toFixed(2)} MB -> ${(afterTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved: ${((beforeTotal - afterTotal) / 1024 / 1024).toFixed(2)} MB (-${Math.round((1 - afterTotal / beforeTotal) * 100)}%)`);
    await pool.end();
}

run().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
