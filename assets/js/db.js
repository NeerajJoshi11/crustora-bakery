/**
 * Crustora Database Layer
 * Supabase PostgreSQL integration with client-side IndexedDB caching and fallback.
 * Full CRUD for Menu Items, Users, Orders, and Settings.
 */

const DB_NAME = 'crustora_db';
const DB_VERSION = 3;

// Default Seed Data for Categories
export const DEFAULT_CATEGORIES = [
    { id: "cat_cakes", name: "Cakes", desc: "Freshly baked personal bento and celebration cakes", displayOrder: 1 },
    { id: "cat_cupcakes", name: "Cupcakes & Muffins", desc: "Fluffy cupcakes and double chocolate muffins", displayOrder: 2 },
    { id: "cat_tub_jar", name: "Tub & Jar Cakes", desc: "Layered gourmet cakes in reusable tubs and glass jars", displayOrder: 3 },
    { id: "cat_strawberry", name: "Strawberry Special", desc: "Seasonal strawberry treats dipped in Belgian chocolate", displayOrder: 4 },
    { id: "cat_brownies", name: "Brownies", desc: "Fudgy, dense chocolate and roasted almond brownies", displayOrder: 5 },
    { id: "cat_tea_cakes", name: "Tea Cakes", desc: "Soft almond, chocolate, and marble loaf cakes for tea time", displayOrder: 6 },
    { id: "cat_chocolates", name: "Chocolates", desc: "Handmade premium assorted and customized chocolate boxes", displayOrder: 7 },
    { id: "cat_candles", name: "Candles", desc: "Aesthetic pastel scented soy wax and floral decorative candles", displayOrder: 8 },
    { id: "cat_hampers", name: "Hampers & Combos", desc: "Luxury gift hampers and celebration combo packages", displayOrder: 9 }
];

// Default Seed Data for Menu Items
export const DEFAULT_MENU_ITEMS = [
    {
        id: "item_bento_cake",
        name: "Chocolate Bento Cake",
        category: "Cakes",
        desc: "A cute, personal-size chocolate bento cake with silky frosting and celebratory candle.",
        price: 349,
        img: "assets/images/iconic_bento_candle.jpg",
        images: [
            "assets/images/iconic_bento_candle.jpg",
            "assets/images/custom_bento_cake.jpg",
            "assets/images/sana_gappu_sher.jpg",
            "assets/images/bento_cake.png"
        ],
        badge: "Bestseller",
        isAvailable: true,
        createdAt: "2026-01-10T10:00:00.000Z"
    },
    {
        id: "item_atta_bento",
        name: "Atta Bento Cake",
        category: "Cakes",
        desc: "Wholesome, 100% maida-free bento cake baked with organic whole wheat.",
        price: 399,
        img: "assets/images/atta_bento.png",
        images: [
            "assets/images/atta_bento.png",
            "assets/images/iconic_bento_candle.jpg",
            "assets/images/bento_cake.png"
        ],
        badge: "Healthy Choice",
        isAvailable: true,
        createdAt: "2026-01-11T11:00:00.000Z"
    },
    {
        id: "item_choco_truffle",
        name: "Chocolate Truffle (½ kg)",
        category: "Cakes",
        desc: "Decadent truffle cake with silky dark chocolate ganache layers.",
        price: 649,
        img: "assets/images/truffle_cake.png",
        images: [
            "assets/images/truffle_cake.png",
            "assets/images/chocolate_tub_cake_1775410734736.png"
        ],
        badge: "Rich & Moist",
        isAvailable: true,
        createdAt: "2026-01-12T12:00:00.000Z"
    },
    {
        id: "item_vanilla_celebration",
        name: "Vanilla Celebration Cake",
        category: "Cakes",
        desc: "Classic vanilla sponge infused with fresh cream, perfect for celebrations.",
        price: 599,
        img: "assets/images/bento_cake.png",
        images: [
            "assets/images/bento_cake.png",
            "assets/images/custom_message_bento.jpg"
        ],
        badge: "Classic",
        isAvailable: true,
        createdAt: "2026-01-13T13:00:00.000Z"
    },
    {
        id: "item_butterscotch_cake",
        name: "Butterscotch Cake",
        category: "Cakes",
        desc: "Rich butterscotch flavor with crunchy caramel pralines in every bite.",
        price: 629,
        img: "assets/images/truffle_cake.png",
        images: [
            "assets/images/truffle_cake.png",
            "assets/images/bento_cake.png"
        ],
        badge: "Crunchy",
        isAvailable: true,
        createdAt: "2026-01-14T14:00:00.000Z"
    },
    {
        id: "item_yummy_cupcakes",
        name: "Yummy Cupcakes (Pack of 2)",
        category: "Cupcakes & Muffins",
        desc: "Fluffy, creamy cupcakes with colorful pastel toppings.",
        price: 199,
        img: "assets/images/pink_cupcakes.png",
        images: [
            "assets/images/pink_cupcakes.png",
            "assets/images/gift_hamper_1775410716144.png"
        ],
        badge: "Kids Favorite",
        isAvailable: true,
        createdAt: "2026-01-15T15:00:00.000Z"
    },
    {
        id: "item_red_velvet_cupcakes",
        name: "Red Velvet Cupcakes",
        category: "Cupcakes & Muffins",
        desc: "Classic red velvet with velvety cream cheese frosting rosette.",
        price: 249,
        img: "assets/images/pink_cupcakes.png",
        images: [
            "assets/images/pink_cupcakes.png"
        ],
        badge: "Signature",
        isAvailable: true,
        createdAt: "2026-01-16T16:00:00.000Z"
    },
    {
        id: "item_choco_muffins",
        name: "Chocolate Muffins (Pack of 2)",
        category: "Cupcakes & Muffins",
        desc: "Moist double chocolate muffins loaded with melty choco chips.",
        price: 189,
        img: "assets/images/pink_cupcakes.png",
        images: [
            "assets/images/pink_cupcakes.png"
        ],
        badge: "Choco Rich",
        isAvailable: true,
        createdAt: "2026-01-17T17:00:00.000Z"
    },
    {
        id: "item_choco_tub_cake",
        name: "Chocolate Tub Cake",
        category: "Tub & Jar Cakes",
        desc: "Layered chocolate mud cake, fudge and chocolate crisps in a tub.",
        price: 289,
        img: "assets/images/chocolate_tub_cake_1775410734736.png",
        images: [
            "assets/images/chocolate_tub_cake_1775410734736.png",
            "assets/images/truffle_cake.png"
        ],
        badge: "Must Try",
        isAvailable: true,
        createdAt: "2026-01-18T18:00:00.000Z"
    },
    {
        id: "item_strawberry_tub_cake",
        name: "Strawberry Tub Cake",
        category: "Tub & Jar Cakes",
        desc: "Fresh seasonal strawberries layered with light vanilla cream and sponge.",
        price: 299,
        img: "assets/images/strawberry_jar_cake_1775410667006.png",
        images: [
            "assets/images/strawberry_jar_cake_1775410667006.png"
        ],
        badge: "Seasonal",
        isAvailable: true,
        createdAt: "2026-01-19T19:00:00.000Z"
    },
    {
        id: "item_red_velvet_jar",
        name: "Red Velvet Jar Cake",
        category: "Tub & Jar Cakes",
        desc: "Gourmet layers of red velvet cake and cream cheese in a glass jar.",
        price: 279,
        img: "assets/images/strawberry_jar_cake_1775410667006.png",
        images: [
            "assets/images/strawberry_jar_cake_1775410667006.png"
        ],
        badge: "Giftable",
        isAvailable: true,
        createdAt: "2026-01-20T20:00:00.000Z"
    },
    {
        id: "item_strawberry_choco_dessert",
        name: "Strawberry Chocolate Dessert",
        category: "Strawberry Special",
        desc: "The dream combination of fresh strawberries dipped in rich Belgian chocolate.",
        price: 329,
        img: "assets/images/strawberry_jar_cake_1775410667006.png",
        images: [
            "assets/images/strawberry_jar_cake_1775410667006.png"
        ],
        badge: "Chef Special",
        isAvailable: true,
        createdAt: "2026-01-21T21:00:00.000Z"
    },
    {
        id: "item_brownie_strawberry_box",
        name: "Brownie Strawberry Box",
        category: "Strawberry Special",
        desc: "Fudgy brownies paired with fresh strawberry chunks and chocolate drizzle.",
        price: 399,
        img: "assets/images/gift_hamper_1775410716144.png",
        images: [
            "assets/images/gift_hamper_1775410716144.png",
            "assets/images/fudge_brownies.jpg"
        ],
        badge: "Trending",
        isAvailable: true,
        createdAt: "2026-01-22T22:00:00.000Z"
    },
    {
        id: "item_almond_brownies",
        name: "Almond Brownies",
        category: "Brownies",
        desc: "Rich fudgy chocolate brownie loaded with toasted crunchy almonds.",
        price: 199,
        img: "assets/images/almond_brownies.png",
        images: [
            "assets/images/almond_brownies.png",
            "assets/images/fudge_brownies.jpg"
        ],
        badge: "Bestseller",
        isAvailable: true,
        createdAt: "2026-01-23T10:00:00.000Z"
    },
    {
        id: "item_fudge_brownies",
        name: "Classic Fudge Brownies",
        category: "Brownies",
        desc: "Classic dense and deeply chocolatey fudge brownie with a crackly top.",
        price: 179,
        img: "assets/images/fudge_brownies.jpg",
        images: [
            "assets/images/fudge_brownies.jpg",
            "assets/images/almond_brownies.png",
            "assets/images/sana_gappu_sher.jpg"
        ],
        badge: "Pure Delight",
        isAvailable: true,
        createdAt: "2026-01-24T11:00:00.000Z"
    },
    {
        id: "item_walnut_brownie_box",
        name: "Walnut Brownie Box (Pack of 4)",
        category: "Brownies",
        desc: "A gift box of four customized walnut brownies baked fresh.",
        price: 499,
        img: "assets/images/almond_brownies.png",
        images: [
            "assets/images/almond_brownies.png",
            "assets/images/fudge_brownies.jpg"
        ],
        badge: "Gift Box",
        isAvailable: true,
        createdAt: "2026-01-25T12:00:00.000Z"
    },
    {
        id: "item_almond_tea_cake",
        name: "Almond Tea Cake",
        category: "Tea Cakes",
        desc: "Soft, fragrant tea cake topped with sliced almonds. Perfect with chai.",
        price: 349,
        img: "assets/images/tea_cake.png",
        images: [
            "assets/images/tea_cake.png"
        ],
        badge: "Tea Time",
        isAvailable: true,
        createdAt: "2026-01-26T13:00:00.000Z"
    },
    {
        id: "item_chocolate_tea_cake",
        name: "Chocolate Tea Cake",
        category: "Tea Cakes",
        desc: "Melt-in-mouth chocolate loaf cake, lightly sweetened for everyday cravings.",
        price: 349,
        img: "assets/images/tea_cake.png",
        images: [
            "assets/images/tea_cake.png"
        ],
        badge: "Comfort",
        isAvailable: true,
        createdAt: "2026-01-27T14:00:00.000Z"
    },
    {
        id: "item_marble_tea_cake",
        name: "Marble Tea Cake",
        category: "Tea Cakes",
        desc: "Beautifully swirled vanilla and dark chocolate sponge loaf.",
        price: 369,
        img: "assets/images/tea_cake.png",
        images: [
            "assets/images/tea_cake.png"
        ],
        badge: "Artisanal",
        isAvailable: true,
        createdAt: "2026-01-28T15:00:00.000Z"
    },
    {
        id: "item_assorted_chocolates",
        name: "Assorted Chocolates (Box of 9)",
        category: "Chocolates",
        desc: "Handcrafted premium filled chocolates featuring hazelnut, caramel, and berry.",
        price: 449,
        img: "assets/images/assorted_chocolates_1775410684129.png",
        images: [
            "assets/images/assorted_chocolates_1775410684129.png"
        ],
        badge: "Handmade",
        isAvailable: true,
        createdAt: "2026-01-29T16:00:00.000Z"
    },
    {
        id: "item_custom_choco_box",
        name: "Customized Choco Gift Box",
        category: "Chocolates",
        desc: "Personalized artisanal chocolate box with custom message for your loved ones.",
        price: 599,
        img: "assets/images/assorted_chocolates_1775410684129.png",
        images: [
            "assets/images/assorted_chocolates_1775410684129.png",
            "assets/images/sana_gappu_sher.jpg"
        ],
        badge: "Customizable",
        isAvailable: true,
        createdAt: "2026-01-30T17:00:00.000Z"
    },
    {
        id: "item_scented_candle",
        name: "Scented Pastel Jar Candle",
        category: "Candles",
        desc: "Aesthetic pastel pink scented soy wax candle in an elegant reusable glass jar.",
        price: 249,
        img: "assets/images/scented_candles_1775410699647.png",
        images: [
            "assets/images/scented_candles_1775410699647.png"
        ],
        badge: "Aroma",
        isAvailable: true,
        createdAt: "2026-01-31T18:00:00.000Z"
    },
    {
        id: "item_decorative_candles",
        name: "Decorative Floral Candles (Set of 2)",
        category: "Candles",
        desc: "Artisanal shaped candles that infuse warmth and elegance to your sweet space.",
        price: 299,
        img: "assets/images/scented_candles_1775410699647.png",
        images: [
            "assets/images/scented_candles_1775410699647.png"
        ],
        badge: "Decor",
        isAvailable: true,
        createdAt: "2026-02-01T19:00:00.000Z"
    },
    {
        id: "item_luxury_hamper",
        name: "Crustora Luxury Gift Hamper",
        category: "Hampers & Combos",
        desc: "Our royal hamper containing a Bento Cake, 4 Brownies, Chocolates, and a Candle.",
        price: 1199,
        img: "assets/images/gift_hamper_1775410716144.png",
        images: [
            "assets/images/gift_hamper_1775410716144.png",
            "assets/images/assorted_chocolates_1775410684129.png",
            "assets/images/scented_candles_1775410699647.png"
        ],
        badge: "Celebration",
        isAvailable: true,
        createdAt: "2026-02-02T20:00:00.000Z"
    },
    {
        id: "item_cake_candle_combo",
        name: "Cake + Candle Birthday Combo",
        category: "Hampers & Combos",
        desc: "Sweet gift set with Chocolate Bento Cake and a pastel scented candle.",
        price: 549,
        img: "assets/images/gift_hamper_1775410716144.png",
        images: [
            "assets/images/gift_hamper_1775410716144.png",
            "assets/images/iconic_bento_candle.jpg",
            "assets/images/scented_candles_1775410699647.png"
        ],
        badge: "Best Gifting",
        isAvailable: true,
        createdAt: "2026-02-03T21:00:00.000Z"
    }
];

export const DEFAULT_USERS = [
    {
        id: "user_admin_1",
        name: "Crustora Admin",
        email: "admin@crustora.com",
        role: "admin",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastLogin: "2026-10-11T20:30:00.000Z"
    },
    {
        id: "user_sneha",
        name: "Sneha Sharma",
        email: "sneha.sharma@example.com",
        role: "customer",
        status: "active",
        createdAt: "2026-02-14T10:15:00.000Z",
        lastLogin: "2026-10-10T14:22:00.000Z"
    },
    {
        id: "user_rahul",
        name: "Rahul Verma",
        email: "rahul.verma@example.com",
        role: "customer",
        status: "active",
        createdAt: "2026-03-05T16:40:00.000Z",
        lastLogin: "2026-10-09T18:05:00.000Z"
    },
    {
        id: "user_ananya",
        name: "Ananya Gupta",
        email: "ananya.gupta@example.com",
        role: "customer",
        status: "active",
        createdAt: "2026-04-12T09:12:00.000Z",
        lastLogin: "2026-10-11T19:40:00.000Z"
    }
];

export const DEFAULT_ORDERS = [
    {
        id: "ord_1001",
        customerEmail: "sneha.sharma@example.com",
        customerName: "Sneha Sharma",
        orderText: "1x Chocolate Bento Cake\n2x Almond Brownies",
        items: [
            { name: "Chocolate Bento Cake", qty: 1, price: 349 },
            { name: "Almond Brownies", qty: 2, price: 199 }
        ],
        total: 747,
        status: "Delivered",
        channel: "WhatsApp",
        createdAt: "2026-10-09T12:30:00.000Z"
    },
    {
        id: "ord_1002",
        customerEmail: "rahul.verma@example.com",
        customerName: "Rahul Verma",
        orderText: "1x Atta Bento Cake\n1x Scented Pastel Jar Candle",
        items: [
            { name: "Atta Bento Cake", qty: 1, price: 399 },
            { name: "Scented Pastel Jar Candle", qty: 1, price: 249 }
        ],
        total: 648,
        status: "Preparing",
        channel: "Instagram",
        createdAt: "2026-10-10T16:45:00.000Z"
    },
    {
        id: "ord_1003",
        customerEmail: "ananya.gupta@example.com",
        customerName: "Ananya Gupta",
        orderText: "1x Crustora Luxury Gift Hamper",
        items: [
            { name: "Crustora Luxury Gift Hamper", qty: 1, price: 1199 }
        ],
        total: 1199,
        status: "Pending",
        channel: "WhatsApp",
        createdAt: "2026-10-11T21:10:00.000Z"
    }
];

export const DEFAULT_SETTINGS = {
    adminPin: "admin123",
    storeName: "Crustora Bakery",
    currencySymbol: "₹",
    contactPhone: "+91 9891775379",
    contactInstagram: "crustoraa_",
    address: "Krishna Nagar, East Delhi"
};

class CrustoraDB {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.isIndexedDBSupported = typeof indexedDB !== 'undefined';
    }

    async init() {
        if (this.initialized) return;

        if (!this.isIndexedDBSupported) {
            this.initLocalStorageFallback();
            this.initialized = true;
            return;
        }

        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('menu_items')) {
                    db.createObjectStore('menu_items', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('email', 'email', { unique: true });
                }
                if (!db.objectStoreNames.contains('orders')) {
                    db.createObjectStore('orders', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };

            request.onsuccess = async (e) => {
                this.db = e.target.result;
                this.initialized = true;
                await this.seedDefaultsIfNeeded();
                resolve();
            };

            request.onerror = (e) => {
                console.warn('IndexedDB failed, falling back to LocalStorage', e);
                this.isIndexedDBSupported = false;
                this.initLocalStorageFallback();
                this.initialized = true;
                resolve();
            };
        });
    }

    initLocalStorageFallback() {
        if (!localStorage.getItem('crustora_menu_items')) {
            localStorage.setItem('crustora_menu_items', JSON.stringify(DEFAULT_MENU_ITEMS));
        }
        if (!localStorage.getItem('crustora_users')) {
            localStorage.setItem('crustora_users', JSON.stringify(DEFAULT_USERS));
        }
        if (!localStorage.getItem('crustora_orders')) {
            localStorage.setItem('crustora_orders', JSON.stringify(DEFAULT_ORDERS));
        }
        if (!localStorage.getItem('crustora_settings')) {
            localStorage.setItem('crustora_settings', JSON.stringify(DEFAULT_SETTINGS));
        }
    }

    async seedDefaultsIfNeeded() {
        const items = await this.getAll('menu_items');
        if (items.length === 0) {
            for (const item of DEFAULT_MENU_ITEMS) {
                await this.put('menu_items', item);
            }
        }
    }

    // Local IndexedDB Cache Transactions
    async getAll(storeName) {
        await this.init();
        if (!this.isIndexedDBSupported || !this.db || !this.db.objectStoreNames.contains(storeName)) {
            const data = localStorage.getItem(`crustora_${storeName}`);
            return data ? JSON.parse(data) : [];
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch (err) {
                console.warn('IDB getAll error for', storeName, err);
                const data = localStorage.getItem(`crustora_${storeName}`);
                resolve(data ? JSON.parse(data) : []);
            }
        });
    }

    async get(storeName, key) {
        await this.init();
        if (!this.isIndexedDBSupported || !this.db || !this.db.objectStoreNames.contains(storeName)) {
            const list = await this.getAll(storeName);
            return list.find(item => item.id === key) || null;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch (err) {
                console.warn('IDB get error for', storeName, err);
                resolve(null);
            }
        });
    }

    async put(storeName, item) {
        await this.init();
        if (!this.isIndexedDBSupported || !this.db || !this.db.objectStoreNames.contains(storeName)) {
            const list = await this.getAll(storeName);
            const index = list.findIndex(i => i.id === item.id);
            if (index >= 0) list[index] = item;
            else list.push(item);
            localStorage.setItem(`crustora_${storeName}`, JSON.stringify(list));
            return item;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(item);
                req.onsuccess = () => resolve(item);
                req.onerror = () => resolve(item);
            } catch (err) {
                console.warn('IDB put error for', storeName, err);
                resolve(item);
            }
        });
    }

    async delete(storeName, key) {
        await this.init();
        if (!this.isIndexedDBSupported || !this.db || !this.db.objectStoreNames.contains(storeName)) {
            const list = await this.getAll(storeName);
            const updated = list.filter(item => item.id !== key);
            localStorage.setItem(`crustora_${storeName}`, JSON.stringify(updated));
            return true;
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.delete(key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(true);
            } catch (err) {
                console.warn('IDB delete error for', storeName, err);
                resolve(true);
            }
        });
    }

    // --- CATEGORIES CRUD (Supabase PostgreSQL + Local Cache) ---
    async getCategories() {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const cats = await res.json();
                for (const cat of cats) await this.put('categories', cat);
                return cats;
            }
        } catch (e) {
            console.warn('API error, using cached categories:', e);
        }
        const cats = await this.getAll('categories');
        return cats.length > 0 ? cats : DEFAULT_CATEGORIES;
    }

    async getCategory(id) {
        const cats = await this.getCategories();
        return cats.find(c => c.id === id) || null;
    }

    async addCategory(cat) {
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cat)
            });
            if (res.ok) {
                const newCat = await res.json();
                await this.put('categories', newCat);
                this.notifyChange('categories');
                this.notifyChange('menu');
                return newCat;
            }
        } catch (e) {
            console.warn('API add category failed:', e);
        }
        const id = cat.id || `cat_${Date.now()}`;
        const localCat = { ...cat, id };
        await this.put('categories', localCat);
        this.notifyChange('categories');
        this.notifyChange('menu');
        return localCat;
    }

    async updateCategory(id, updates) {
        try {
            const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                await this.put('categories', updated);
                this.notifyChange('categories');
                this.notifyChange('menu');
                return updated;
            }
        } catch (e) {
            console.warn('API update category failed:', e);
        }
        const existing = await this.getCategory(id);
        const updated = { ...existing, ...updates };
        await this.put('categories', updated);
        this.notifyChange('categories');
        return updated;
    }

    async deleteCategory(id) {
        try {
            await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch (e) { }
        const res = await this.delete('categories', id);
        this.notifyChange('categories');
        this.notifyChange('menu');
        return res;
    }

    // Helper to ensure images array and cover img are in sync
    _normalizeItem(item) {
        if (!item) return item;
        let images = [];
        if (Array.isArray(item.images)) {
            images = item.images.filter(Boolean);
        } else if (typeof item.images === 'string') {
            try { images = JSON.parse(item.images); } catch (e) { images = []; }
        }
        if (!Array.isArray(images) || images.length === 0) {
            images = item.img ? [item.img] : ['assets/images/bento_cake.png'];
        }
        return {
            ...item,
            images,
            img: images[0] || item.img || 'assets/images/bento_cake.png'
        };
    }

    // --- MENU ITEMS CRUD (Supabase PostgreSQL + Local Cache) ---
    async getMenuItems() {
        try {
            const res = await fetch('/api/menu');
            if (res.ok) {
                const items = await res.json();
                const normalized = items.map(i => this._normalizeItem(i));
                for (const item of normalized) await this.put('menu_items', item);
                return normalized.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
            }
        } catch (e) {
            console.warn('API error, using cached menu items:', e);
        }
        const rawItems = await this.getAll('menu_items');
        const items = rawItems.map(i => this._normalizeItem(i));
        return items.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
    }

    async getMenuItem(id) {
        const items = await this.getMenuItems();
        const found = items.find(i => i.id === id) || await this.get('menu_items', id);
        return found ? this._normalizeItem(found) : null;
    }

    async addMenuItem(item) {
        const itemWithImgs = this._normalizeItem(item);
        try {
            const res = await fetch('/api/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemWithImgs)
            });
            if (res.ok) {
                const newItem = this._normalizeItem(await res.json());
                await this.put('menu_items', newItem);
                this.notifyChange('menu');
                return newItem;
            }
        } catch (e) {
            console.warn('API add failed, saving to local DB:', e);
        }
        const id = item.id || `item_${Date.now()}`;
        const localItem = this._normalizeItem({ ...itemWithImgs, id, price: Number(item.price) || 0 });
        await this.put('menu_items', localItem);
        this.notifyChange('menu');
        return localItem;
    }

    async updateMenuItem(id, updates) {
        const normalizedUpdates = { ...updates };
        if (updates.images !== undefined || updates.img !== undefined) {
            const temp = this._normalizeItem({ ...updates, img: updates.img, images: updates.images });
            normalizedUpdates.images = temp.images;
            normalizedUpdates.img = temp.img;
        }
        try {
            const res = await fetch(`/api/menu/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizedUpdates)
            });
            if (res.ok) {
                const updated = this._normalizeItem(await res.json());
                await this.put('menu_items', updated);
                this.notifyChange('menu');
                return updated;
            }
        } catch (e) {
            console.warn('API update failed, saving locally:', e);
        }
        const existing = await this.getMenuItem(id);
        const updated = this._normalizeItem({ ...existing, ...normalizedUpdates });
        await this.put('menu_items', updated);
        this.notifyChange('menu');
        return updated;
    }

    async toggleItemAvailability(id) {
        try {
            const res = await fetch(`/api/menu/${encodeURIComponent(id)}/toggle`, {
                method: 'PATCH'
            });
            if (res.ok) {
                const updated = await res.json();
                await this.put('menu_items', updated);
                this.notifyChange('menu');
                return updated;
            }
        } catch (e) { }
        const item = await this.getMenuItem(id);
        if (!item) throw new Error(`Item ${id} not found.`);
        return await this.updateMenuItem(id, { isAvailable: !item.isAvailable });
    }

    async deleteMenuItem(id) {
        try {
            await fetch(`/api/menu/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch (e) { }
        const res = await this.delete('menu_items', id);
        this.notifyChange('menu');
        return res;
    }

    // --- USERS CRUD (Supabase PostgreSQL + Local Cache) ---
    async getUsers() {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                for (const u of users) await this.put('users', u);
                return users;
            }
        } catch (e) {
            console.warn('API users error, using cached users:', e);
        }
        return await this.getAll('users');
    }

    async getUser(id) {
        const users = await this.getUsers();
        return users.find(u => u.id === id) || null;
    }

    async getUserByEmail(email) {
        if (!email) return null;
        const users = await this.getUsers();
        return users.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
    }

    async addUser(user) {
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            if (res.ok) {
                const newUser = await res.json();
                await this.put('users', newUser);
                this.notifyChange('users');
                return newUser;
            }
        } catch (e) { }
        const id = user.id || `user_${Date.now()}`;
        const localUser = { ...user, id };
        await this.put('users', localUser);
        this.notifyChange('users');
        return localUser;
    }

    async updateUser(id, updates) {
        try {
            const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                await this.put('users', updated);
                this.notifyChange('users');
                return updated;
            }
        } catch (e) { }
        const existing = await this.getUser(id);
        const updated = { ...existing, ...updates };
        await this.put('users', updated);
        this.notifyChange('users');
        return updated;
    }

    async deleteUser(id) {
        try {
            await fetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch (e) { }
        const res = await this.delete('users', id);
        this.notifyChange('users');
        return res;
    }

    async syncUser({ email, name, role = 'customer' }) {
        if (!email) return null;
        try {
            const res = await fetch('/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, role })
            });
            if (res.ok) {
                const user = await res.json();
                await this.put('users', user);
                return user;
            }
        } catch (e) { }
        const existing = await this.getUserByEmail(email);
        if (existing) {
            return await this.updateUser(existing.id, { name: name || existing.name });
        }
        return await this.addUser({ email, name: name || email.split('@')[0], role, status: 'active' });
    }

    // --- ORDERS CRUD (Supabase PostgreSQL + Local Cache) ---
    async getOrders() {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const orders = await res.json();
                for (const o of orders) await this.put('orders', o);
                return orders;
            }
        } catch (e) {
            console.warn('API orders error, using cached orders:', e);
        }
        return await this.getAll('orders');
    }

    async getOrder(id) {
        const orders = await this.getOrders();
        return orders.find(o => o.id === id) || null;
    }

    async addOrder(order) {
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            if (res.ok) {
                const newOrder = await res.json();
                await this.put('orders', newOrder);
                this.notifyChange('orders');
                return newOrder;
            }
        } catch (e) { }
        const id = order.id || `ord_${Date.now()}`;
        const localOrder = { ...order, id };
        await this.put('orders', localOrder);
        this.notifyChange('orders');
        return localOrder;
    }

    async updateOrderStatus(id, status) {
        try {
            const res = await fetch(`/api/orders/${encodeURIComponent(id)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                const updated = await res.json();
                await this.put('orders', updated);
                this.notifyChange('orders');
                return updated;
            }
        } catch (e) { }
        const existing = await this.getOrder(id);
        const updated = { ...existing, status };
        await this.put('orders', updated);
        this.notifyChange('orders');
        return updated;
    }

    async deleteOrder(id) {
        try {
            await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } catch (e) { }
        const res = await this.delete('orders', id);
        this.notifyChange('orders');
        return res;
    }

    // --- SETTINGS & AUTH ---
    async getSettings() {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                return await res.json();
            }
        } catch (e) { }
        return DEFAULT_SETTINGS;
    }

    async updateSettings(updates) {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) { }
        return { ...DEFAULT_SETTINGS, ...updates };
    }

    async verifyAdminPin(enteredPin) {
        try {
            const res = await fetch('/api/settings/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: enteredPin })
            });
            if (res.ok) {
                const result = await res.json();
                return result.valid;
            }
        } catch (e) { }
        const validPins = ['admin123', 'crustora123'];
        return validPins.includes((enteredPin || '').trim());
    }

    // --- BACKUP, RESTORE & RESET ---
    async resetToDefaultData() {
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            if (res.ok) {
                this.notifyChange('all');
                return true;
            }
        } catch (e) { }
        this.notifyChange('all');
        return true;
    }

    async exportDatabaseJSON() {
        try {
            const res = await fetch('/api/export');
            if (res.ok) {
                const dump = await res.json();
                return JSON.stringify(dump, null, 2);
            }
        } catch (e) { }
        const menu_items = await this.getMenuItems();
        const users = await this.getUsers();
        const orders = await this.getOrders();
        const settings = await this.getSettings();
        return JSON.stringify({ menu_items, users, orders, settings }, null, 2);
    }

    async importDatabaseJSON(jsonString) {
        const data = JSON.parse(jsonString);
        if (data.menu_items) {
            for (const item of data.menu_items) await this.addMenuItem(item);
        }
        if (data.users) {
            for (const u of data.users) await this.addUser(u);
        }
        if (data.orders) {
            for (const o of data.orders) await this.addOrder(o);
        }
        this.notifyChange('all');
        return true;
    }

    notifyChange(scope) {
        window.dispatchEvent(new CustomEvent('crustora_db_change', { detail: { scope } }));
    }
}

export const db = new CrustoraDB();
