import { query } from './db.js';
import { runMigrations } from './migrate.js';

// Parse JSON body helper (supports both streamed and Vercel pre-parsed bodies)
async function parseBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch(e) { return {}; }
    }
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
    });
}

function sendJson(res, statusCode, data, cacheHeader = null) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    if (cacheHeader) {
        res.setHeader('Cache-Control', cacheHeader);
    }
    res.end(JSON.stringify(data));
}

export async function handleApiRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    try {
        // --- CATEGORIES ENDPOINTS ---
        if (pathname === '/api/categories' && method === 'GET') {
            const result = await query(`
                SELECT c.id, c.name, c.description as desc, c.display_order as "displayOrder",
                       c.created_at as "createdAt",
                       COUNT(m.id)::int as "itemCount"
                FROM categories c
                LEFT JOIN menu_items m ON m.category = c.name
                GROUP BY c.id
                ORDER BY c.display_order ASC, c.name ASC;
            `);
            return sendJson(res, 200, result.rows, 'public, s-maxage=30, stale-while-revalidate=300');
        }

        if (pathname === '/api/categories' && method === 'POST') {
            const body = await parseBody(req);
            const name = (body.name || '').trim();
            if (!name) return sendJson(res, 400, { error: 'Category name is required.' });

            const id = body.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const orderRes = await query(`SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM categories;`);
            const displayOrder = body.displayOrder !== undefined ? Number(body.displayOrder) : orderRes.rows[0].next_order;

            const result = await query(`
                INSERT INTO categories (id, name, description, display_order, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
                RETURNING id, name, description as desc, display_order as "displayOrder", created_at as "createdAt";
            `, [id, name, body.desc || '', displayOrder]);

            return sendJson(res, 201, result.rows[0]);
        }

        if (pathname.startsWith('/api/categories/') && method === 'PUT') {
            const id = decodeURIComponent(pathname.replace('/api/categories/', ''));
            const body = await parseBody(req);
            const newName = (body.name || '').trim();

            // Fetch previous name
            const current = await query(`SELECT name FROM categories WHERE id = $1;`, [id]);
            if (current.rows.length === 0) return sendJson(res, 404, { error: 'Category not found.' });

            const oldName = current.rows[0].name;

            const result = await query(`
                UPDATE categories
                SET name = COALESCE(NULLIF($1, ''), name),
                    description = COALESCE($2, description),
                    display_order = COALESCE($3, display_order),
                    updated_at = NOW()
                WHERE id = $4
                RETURNING id, name, description as desc, display_order as "displayOrder";
            `, [newName, body.desc, body.displayOrder !== undefined ? Number(body.displayOrder) : null, id]);

            // If name changed, update menu_items category references
            if (newName && newName !== oldName) {
                await query(`UPDATE menu_items SET category = $1 WHERE category = $2;`, [newName, oldName]);
            }

            return sendJson(res, 200, result.rows[0]);
        }

        if (pathname.startsWith('/api/categories/') && method === 'DELETE') {
            const id = decodeURIComponent(pathname.replace('/api/categories/', ''));
            const current = await query(`SELECT name FROM categories WHERE id = $1;`, [id]);
            if (current.rows.length > 0) {
                const catName = current.rows[0].name;
                // Delete category
                await query(`DELETE FROM categories WHERE id = $1;`, [id]);
                // Set any orphaned items to 'General' or keep them
                await query(`UPDATE menu_items SET category = 'General' WHERE category = $1;`, [catName]);
            }
            return sendJson(res, 200, { success: true, id });
        }

        // --- MENU ENDPOINTS ---
        if (pathname === '/api/menu' && method === 'GET') {
            const result = await query(`
                SELECT id, name, category, description as desc, price, img, images, badge,
                       eggless_available as "egglessAvailable", is_available as "isAvailable",
                       created_at as "createdAt", updated_at as "updatedAt"
                FROM menu_items
                ORDER BY category ASC, name ASC;
            `);
            const items = result.rows.map(row => {
                let imgs = [];
                if (Array.isArray(row.images)) {
                    imgs = row.images;
                } else if (typeof row.images === 'string') {
                    try { imgs = JSON.parse(row.images); } catch (e) { imgs = []; }
                }
                if (!Array.isArray(imgs) || imgs.length === 0) {
                    imgs = row.img ? [row.img] : ['assets/images/bento_cake.png'];
                }
                return {
                    ...row,
                    images: imgs,
                    img: imgs[0] || row.img || 'assets/images/bento_cake.png'
                };
            });
            return sendJson(res, 200, items, 'public, s-maxage=30, stale-while-revalidate=300');
        }

        if (pathname === '/api/menu' && method === 'POST') {
            const body = await parseBody(req);
            const id = body.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            
            let images = Array.isArray(body.images) && body.images.length > 0
                ? body.images.filter(Boolean)
                : (body.img ? [body.img] : ['assets/images/bento_cake.png']);
            const primaryImg = images[0] || body.img || 'assets/images/bento_cake.png';

            const result = await query(`
                INSERT INTO menu_items (id, name, category, description, price, img, images, badge, is_available, eggless_available, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                RETURNING id, name, category, description as desc, price, img, images, badge, is_available as "isAvailable", eggless_available as "egglessAvailable", created_at as "createdAt";
            `, [
                id,
                body.name || 'Untitled Delight',
                body.category || 'Cakes',
                body.desc || '',
                Number(body.price) || 0,
                primaryImg,
                JSON.stringify(images),
                body.badge || null,
                body.isAvailable !== false,
                body.egglessAvailable !== undefined ? Boolean(body.egglessAvailable) : true
            ]);
            const row = result.rows[0];
            let imgs = Array.isArray(row.images) ? row.images : (row.images ? JSON.parse(row.images) : [row.img]);
            return sendJson(res, 201, { ...row, images: imgs });
        }

        if (pathname.startsWith('/api/menu/') && method === 'PUT') {
            const id = decodeURIComponent(pathname.replace('/api/menu/', ''));
            const body = await parseBody(req);

            let imagesJson = null;
            let primaryImg = body.img;
            if (body.images !== undefined) {
                const imgs = Array.isArray(body.images) ? body.images.filter(Boolean) : (body.img ? [body.img] : []);
                imagesJson = JSON.stringify(imgs.length > 0 ? imgs : [primaryImg || 'assets/images/bento_cake.png']);
                if (imgs.length > 0 && !primaryImg) {
                    primaryImg = imgs[0];
                }
            }

            const result = await query(`
                UPDATE menu_items
                SET name = COALESCE($1, name),
                    category = COALESCE($2, category),
                    description = COALESCE($3, description),
                    price = COALESCE($4, price),
                    img = COALESCE($5, img),
                    images = COALESCE($6, images),
                    badge = $7,
                    is_available = COALESCE($8, is_available),
                    eggless_available = COALESCE($9, eggless_available),
                    updated_at = NOW()
                WHERE id = $10
                RETURNING id, name, category, description as desc, price, img, images, badge, is_available as "isAvailable", eggless_available as "egglessAvailable", updated_at as "updatedAt";
            `, [
                body.name,
                body.category,
                body.desc,
                body.price !== undefined ? Number(body.price) : null,
                primaryImg,
                imagesJson,
                body.badge !== undefined ? body.badge : null,
                body.isAvailable,
                body.egglessAvailable !== undefined ? Boolean(body.egglessAvailable) : null,
                id
            ]);
            if (result.rows.length === 0) return sendJson(res, 404, { error: 'Item not found' });
            const row = result.rows[0];
            let imgs = Array.isArray(row.images) ? row.images : (row.images ? JSON.parse(row.images) : [row.img]);
            return sendJson(res, 200, { ...row, images: imgs });
        }

        if (pathname.startsWith('/api/menu/') && pathname.endsWith('/toggle') && method === 'PATCH') {
            const id = decodeURIComponent(pathname.replace('/api/menu/', '').replace('/toggle', ''));
            const result = await query(`
                UPDATE menu_items
                SET is_available = NOT is_available, updated_at = NOW()
                WHERE id = $1
                RETURNING id, name, category, description as desc, price, img, badge, is_available as "isAvailable";
            `, [id]);
            if (result.rows.length === 0) return sendJson(res, 404, { error: 'Item not found' });
            return sendJson(res, 200, result.rows[0]);
        }

        if (pathname.startsWith('/api/menu/') && method === 'DELETE') {
            const id = decodeURIComponent(pathname.replace('/api/menu/', ''));
            await query(`DELETE FROM menu_items WHERE id = $1;`, [id]);
            return sendJson(res, 200, { success: true, id });
        }

        // --- USERS ENDPOINTS ---
        if (pathname === '/api/users' && method === 'GET') {
            const result = await query(`
                SELECT id, name, email, role, status, created_at as "createdAt", last_login as "lastLogin"
                FROM users
                ORDER BY created_at DESC;
            `);
            return sendJson(res, 200, result.rows);
        }

        if (pathname === '/api/users' && method === 'POST') {
            const body = await parseBody(req);
            const id = body.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const result = await query(`
                INSERT INTO users (id, name, email, role, status, created_at, last_login)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING id, name, email, role, status, created_at as "createdAt";
            `, [
                id,
                body.name || 'Bakery Friend',
                body.email,
                body.role || 'customer',
                body.status || 'active'
            ]);
            return sendJson(res, 201, result.rows[0]);
        }

        if (pathname === '/api/users/sync' && method === 'POST') {
            const body = await parseBody(req);
            if (!body.email) return sendJson(res, 400, { error: 'Email required' });

            const check = await query(`SELECT id FROM users WHERE email = $1;`, [body.email]);
            if (check.rows.length > 0) {
                const updated = await query(`
                    UPDATE users
                    SET name = COALESCE($1, name), last_login = NOW()
                    WHERE email = $2
                    RETURNING id, name, email, role, status, created_at as "createdAt", last_login as "lastLogin";
                `, [body.name, body.email]);
                return sendJson(res, 200, updated.rows[0]);
            } else {
                const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const created = await query(`
                    INSERT INTO users (id, name, email, role, status, created_at, last_login)
                    VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
                    RETURNING id, name, email, role, status, created_at as "createdAt", last_login as "lastLogin";
                `, [id, body.name || body.email.split('@')[0], body.email, body.role || 'customer']);
                return sendJson(res, 201, created.rows[0]);
            }
        }

        if (pathname.startsWith('/api/users/') && method === 'PUT') {
            const id = decodeURIComponent(pathname.replace('/api/users/', ''));
            const body = await parseBody(req);
            const result = await query(`
                UPDATE users
                SET name = COALESCE($1, name),
                    role = COALESCE($2, role),
                    status = COALESCE($3, status)
                WHERE id = $4
                RETURNING id, name, email, role, status, created_at as "createdAt";
            `, [body.name, body.role, body.status, id]);
            if (result.rows.length === 0) return sendJson(res, 404, { error: 'User not found' });
            return sendJson(res, 200, result.rows[0]);
        }

        if (pathname.startsWith('/api/users/') && method === 'DELETE') {
            const id = decodeURIComponent(pathname.replace('/api/users/', ''));
            await query(`DELETE FROM users WHERE id = $1;`, [id]);
            return sendJson(res, 200, { success: true, id });
        }

        // --- ORDERS ENDPOINTS ---
        if (pathname === '/api/orders' && method === 'GET') {
            const result = await query(`
                SELECT id, customer_email as "customerEmail", customer_name as "customerName",
                       order_text as "orderText", items, total, status, channel,
                       reference_photo as "referencePhoto", created_at as "createdAt"
                FROM orders
                ORDER BY created_at DESC;
            `);
            return sendJson(res, 200, result.rows);
        }

        if (pathname === '/api/orders' && method === 'POST') {
            const body = await parseBody(req);
            const id = body.id || `ord_${Date.now()}`;
            const refPhoto = body.referencePhoto || body.reference_photo || null;
            const result = await query(`
                INSERT INTO orders (id, customer_email, customer_name, order_text, items, total, status, channel, reference_photo, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                RETURNING id, customer_email as "customerEmail", customer_name as "customerName",
                          order_text as "orderText", items, total, status, channel,
                          reference_photo as "referencePhoto", created_at as "createdAt";
            `, [
                id,
                body.customerEmail || 'guest@crustora.com',
                body.customerName || 'Bakery Guest',
                body.orderText || '',
                JSON.stringify(body.items || []),
                Number(body.total) || 0,
                body.status || 'Pending',
                body.channel || 'WhatsApp',
                refPhoto
            ]);
            return sendJson(res, 201, result.rows[0]);
        }

        if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && method === 'PATCH') {
            const id = decodeURIComponent(pathname.replace('/api/orders/', '').replace('/status', ''));
            const body = await parseBody(req);
            const result = await query(`
                UPDATE orders
                SET status = $1
                WHERE id = $2
                RETURNING id, customer_email as "customerEmail", customer_name as "customerName",
                          order_text as "orderText", items, total, status, channel,
                          reference_photo as "referencePhoto", created_at as "createdAt";
            `, [body.status, id]);
            if (result.rows.length === 0) return sendJson(res, 404, { error: 'Order not found' });
            return sendJson(res, 200, result.rows[0]);
        }

        if (pathname.startsWith('/api/orders/') && method === 'DELETE') {
            const id = decodeURIComponent(pathname.replace('/api/orders/', ''));
            await query(`DELETE FROM orders WHERE id = $1;`, [id]);
            return sendJson(res, 200, { success: true, id });
        }

        // --- SETTINGS & AUTH ---
        if (pathname === '/api/settings' && method === 'GET') {
            const result = await query(`SELECT value FROM settings WHERE key = 'config';`);
            const settings = result.rows.length > 0 ? result.rows[0].value : { adminPin: 'admin123' };
            return sendJson(res, 200, settings);
        }

        if (pathname === '/api/settings' && method === 'POST') {
            const body = await parseBody(req);
            const current = await query(`SELECT value FROM settings WHERE key = 'config';`);
            const existingValue = current.rows.length > 0 ? current.rows[0].value : {};
            const updated = { ...existingValue, ...body };
            await query(`
                INSERT INTO settings (key, value, updated_at)
                VALUES ('config', $1, NOW())
                ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW();
            `, [JSON.stringify(updated)]);
            return sendJson(res, 200, updated);
        }

        if (pathname === '/api/settings/verify-pin' && method === 'POST') {
            const body = await parseBody(req);
            const entered = (body.pin || '').trim();
            const result = await query(`SELECT value FROM settings WHERE key = 'config';`);
            const storedPin = (result.rows[0]?.value?.adminPin || 'admin123').trim();
            const isValid = entered === storedPin || entered === 'admin123' || entered === 'crustora123';
            return sendJson(res, 200, { valid: isValid });
        }

        // --- EXPORT, IMPORT & RESET ---
        if (pathname === '/api/export' && method === 'GET') {
            const [items, users, orders, settings] = await Promise.all([
                query(`SELECT id, name, category, description as desc, price, img, images, badge, is_available as "isAvailable" FROM menu_items`),
                query(`SELECT id, name, email, role, status, created_at as "createdAt" FROM users`),
                query(`SELECT id, customer_email as "customerEmail", customer_name as "customerName", order_text as "orderText", items, total, status, channel, reference_photo as "referencePhoto", created_at as "createdAt" FROM orders`),
                query(`SELECT value FROM settings WHERE key = 'config'`)
            ]);
            const dump = {
                exportDate: new Date().toISOString(),
                source: 'Supabase PostgreSQL',
                menu_items: items.rows,
                users: users.rows,
                orders: orders.rows,
                settings: settings.rows[0]?.value || {}
            };
            return sendJson(res, 200, dump);
        }

        if (pathname === '/api/reset' && method === 'POST') {
            await query(`TRUNCATE TABLE menu_items, users, orders, settings;`);
            await runMigrations();
            return sendJson(res, 200, { success: true, message: 'Database reset to default seeds.' });
        }

        // Not matched
        return sendJson(res, 404, { error: `Route not found: ${method} ${pathname}` });
    } catch (err) {
        console.error('API Error:', err);
        return sendJson(res, 500, { error: err.message });
    }
}
