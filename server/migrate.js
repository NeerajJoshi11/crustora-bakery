import { pool, query } from './db.js';
import { DEFAULT_CATEGORIES, DEFAULT_MENU_ITEMS, DEFAULT_USERS, DEFAULT_ORDERS, DEFAULT_SETTINGS } from '../assets/js/db.js';

export async function runMigrations() {
    console.log('🔄 Initializing Supabase PostgreSQL schema...');

    try {
        // 0. Categories Table
        await query(`
            CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                display_order INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Table "categories" verified/created.');

        // 1. Menu Items Table
        await query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT,
                price NUMERIC(10, 2) NOT NULL DEFAULT 0,
                img TEXT,
                images JSONB DEFAULT '[]',
                badge VARCHAR(100),
                is_available BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        // Ensure 'images' column exists if table was created previously
        await query(`
            ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
        `);
        // Backfill existing rows with images array containing their current img
        await query(`
            UPDATE menu_items
            SET images = json_build_array(img)
            WHERE (images IS NULL OR images = '[]'::jsonb) AND img IS NOT NULL;
        `);
        console.log('✅ Table "menu_items" verified/created (with multi-image support).');

        // 2. Users Table
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(50) DEFAULT 'customer',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_login TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Table "users" verified/created.');

        // 3. Orders Table
        await query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(100) PRIMARY KEY,
                customer_email VARCHAR(255),
                customer_name VARCHAR(255),
                order_text TEXT,
                items JSONB DEFAULT '[]',
                total NUMERIC(10, 2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Pending',
                channel VARCHAR(50) DEFAULT 'WhatsApp',
                reference_photo TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        // Ensure reference_photo column exists if table was created previously
        await query(`
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS reference_photo TEXT;
        `);
        console.log('✅ Table "orders" verified/created (with reference_photo support).');

        // 4. Settings Table
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(100) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Table "settings" verified/created.');

        // Seed Categories if empty
        const catCountRes = await query(`SELECT COUNT(*) FROM categories`);
        if (parseInt(catCountRes.rows[0].count, 10) === 0) {
            console.log('🌱 Seeding default categories into Supabase...');
            for (const cat of DEFAULT_CATEGORIES) {
                await query(`
                    INSERT INTO categories (id, name, description, display_order, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (id) DO NOTHING;
                `, [cat.id, cat.name, cat.desc || '', cat.displayOrder || 0]);
            }
            console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} categories.`);
        }

        // Seed Menu Items if empty
        const countRes = await query(`SELECT COUNT(*) FROM menu_items`);
        if (parseInt(countRes.rows[0].count, 10) === 0) {
            console.log('🌱 Seeding default menu items into Supabase...');
            for (const item of DEFAULT_MENU_ITEMS) {
                const itemImgs = Array.isArray(item.images) && item.images.length > 0
                    ? item.images
                    : (item.img ? [item.img] : ['assets/images/bento_cake.png']);
                await query(`
                    INSERT INTO menu_items (id, name, category, description, price, img, images, badge, is_available, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO NOTHING;
                `, [
                    item.id,
                    item.name,
                    item.category,
                    item.desc,
                    item.price,
                    itemImgs[0] || item.img || 'assets/images/bento_cake.png',
                    JSON.stringify(itemImgs),
                    item.badge || null,
                    item.isAvailable !== false,
                    item.createdAt || new Date()
                ]);
            }
            console.log(`✅ Seeded ${DEFAULT_MENU_ITEMS.length} bakery items.`);
        } else {
            console.log(`ℹ️ "menu_items" table already contains ${countRes.rows[0].count} items.`);
            // Update multi-images for default showcase items
            for (const item of DEFAULT_MENU_ITEMS) {
                if (item.images && item.images.length > 1) {
                    await query(`
                        UPDATE menu_items
                        SET images = $1
                        WHERE id = $2 AND (images IS NULL OR jsonb_array_length(images) <= 1);
                    `, [JSON.stringify(item.images), item.id]);
                }
            }
            console.log('✅ Synchronized multi-image collections for default bakery treats.');
        }

        // Seed Users if empty
        const userCount = await query(`SELECT COUNT(*) FROM users`);
        if (parseInt(userCount.rows[0].count, 10) === 0) {
            console.log('🌱 Seeding demo users into Supabase...');
            for (const user of DEFAULT_USERS) {
                await query(`
                    INSERT INTO users (id, name, email, role, status, created_at, last_login)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (email) DO NOTHING;
                `, [
                    user.id,
                    user.name,
                    user.email,
                    user.role,
                    user.status,
                    user.createdAt || new Date(),
                    user.lastLogin || new Date()
                ]);
            }
            console.log(`✅ Seeded ${DEFAULT_USERS.length} users.`);
        }

        // Seed Orders if empty
        const orderCount = await query(`SELECT COUNT(*) FROM orders`);
        if (parseInt(orderCount.rows[0].count, 10) === 0) {
            console.log('🌱 Seeding demo orders into Supabase...');
            for (const order of DEFAULT_ORDERS) {
                await query(`
                    INSERT INTO orders (id, customer_email, customer_name, order_text, items, total, status, channel, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO NOTHING;
                `, [
                    order.id,
                    order.customerEmail,
                    order.customerName,
                    order.orderText,
                    JSON.stringify(order.items || []),
                    order.total,
                    order.status,
                    order.channel || 'WhatsApp',
                    order.createdAt || new Date()
                ]);
            }
            console.log(`✅ Seeded ${DEFAULT_ORDERS.length} orders.`);
        }

        // Seed Settings if empty
        const settingsCount = await query(`SELECT COUNT(*) FROM settings WHERE key = 'config'`);
        if (parseInt(settingsCount.rows[0].count, 10) === 0) {
            await query(`
                INSERT INTO settings (key, value)
                VALUES ('config', $1)
                ON CONFLICT (key) DO NOTHING;
            `, [JSON.stringify(DEFAULT_SETTINGS)]);
            console.log('✅ Seeded store settings.');
        }

        console.log('🎉 Supabase PostgreSQL database migration & seeding completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    }
}

// Run if called directly
if (process.argv[1]?.endsWith('migrate.js')) {
    runMigrations().then(() => pool.end()).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
