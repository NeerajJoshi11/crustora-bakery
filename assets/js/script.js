import { db } from './db.js';

// Cart State
let cart = [];
try {
    const savedCart = localStorage.getItem('crustora_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
} catch (e) { }

// DOM Elements
const cartBtn = document.getElementById('cartBtn');
const productGrid = document.getElementById('productGrid');
const cartOverlay = document.getElementById('cartOverlay');
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalItems = document.getElementById('cartTotalItems');
const whatsappBtn = document.getElementById('whatsappCheckout');
const instagramBtn = document.getElementById('instagramCheckout');
const checkoutMsg = document.getElementById('checkoutMsg');

// Toggle Cart
const openCart = () => {
    cartOverlay.classList.add('open');
    cartModal.classList.add('open');
    renderCart();
};

const closeCart = () => {
    cartOverlay.classList.remove('open');
    cartModal.classList.remove('open');
    checkoutMsg.style.display = 'none';
};

cartBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// Grid Click Interactions (Card Carousel Navigation, Quick View Modal, and Add to Cart)
productGrid.addEventListener('click', (e) => {
    // 1. On-Card Image Previous / Next Arrow
    const navBtn = e.target.closest('.card-img-nav');
    if (navBtn) {
        e.preventDefault();
        e.stopPropagation();
        const card = navBtn.closest('.product-card');
        const imgWrapper = card.querySelector('.card-img-wrapper');
        const imgEl = card.querySelector('.product-img');
        const dots = card.querySelectorAll('.card-img-dot');
        const imgs = JSON.parse(card.dataset.images || '[]');
        if (imgs.length <= 1) return;

        let currentIdx = Number(imgWrapper.getAttribute('data-active-idx') || 0);
        const dir = Number(navBtn.getAttribute('data-dir') || 1);
        currentIdx = (currentIdx + dir + imgs.length) % imgs.length;

        imgWrapper.setAttribute('data-active-idx', currentIdx);
        imgEl.style.opacity = '0.35';
        setTimeout(() => {
            imgEl.src = imgs[currentIdx];
            imgEl.style.opacity = '1';
        }, 110);

        dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentIdx));
        return;
    }

    // 2. On-Card Image Indicator Dot Click
    const dot = e.target.closest('.card-img-dot');
    if (dot) {
        e.preventDefault();
        e.stopPropagation();
        const card = dot.closest('.product-card');
        const imgWrapper = card.querySelector('.card-img-wrapper');
        const imgEl = card.querySelector('.product-img');
        const dots = card.querySelectorAll('.card-img-dot');
        const imgs = JSON.parse(card.dataset.images || '[]');
        const targetIdx = Number(dot.getAttribute('data-idx') || 0);

        imgWrapper.setAttribute('data-active-idx', targetIdx);
        imgEl.style.opacity = '0.35';
        setTimeout(() => {
            imgEl.src = imgs[targetIdx];
            imgEl.style.opacity = '1';
        }, 110);

        dots.forEach((d, idx) => d.classList.toggle('active', idx === targetIdx));
        return;
    }

    // 3. Add to Cart Button Click
    const btn = e.target.closest('.add-to-cart');
    if (btn) {
        if (btn.disabled) return;
        const card = btn.closest('.product-card');
        const itemName = card.querySelector('h3').textContent;
        const itemPrice = Number(btn.getAttribute('data-price')) || 0;

        const existingItem = cart.find(item => item.name === itemName);
        if (existingItem) {
            existingItem.qty++;
            if (!existingItem.price && itemPrice) existingItem.price = itemPrice;
        } else {
            cart.push({ name: itemName, price: itemPrice, qty: 1 });
        }

        updateCartCount();

        // Trigger sweet confetti burst from button
        const btnRect = btn.getBoundingClientRect();
        triggerSweetBurst(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);

        // Tactile animation effect on clicking
        const ogContent = btn.innerHTML;
        btn.innerHTML = '<span>✓</span><span>Added</span>';
        btn.classList.add('added');

        setTimeout(() => {
            btn.innerHTML = ogContent;
            btn.classList.remove('added');
        }, 1100);

        showToast(`🌸 ${itemName} added to your cart!`, 'success');
        return;
    }

    // 4. Click on Card Image Wrapper or Title -> Opens Full Quick View & Gallery Modal!
    const trigger = e.target.closest('.card-img-wrapper') || e.target.closest('h3');
    if (trigger) {
        const card = trigger.closest('.product-card');
        if (!card) return;
        const itemId = card.getAttribute('data-id');
        const currentActiveIdx = Number(card.querySelector('.card-img-wrapper')?.getAttribute('data-active-idx') || 0);
        openProductQuickView(itemId, currentActiveIdx);
    }
});

// Helper to safely escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Cart Methods
function updateCartCount() {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    const navPill = document.getElementById('navCartCount');
    if (navPill) {
        navPill.textContent = total;
        navPill.classList.remove('bounce');
        void navPill.offsetWidth;
        navPill.classList.add('bounce');
    }
    if (cartBtn && !navPill) {
        cartBtn.textContent = `Cart (${total})`;
    }
    if (cartTotalItems) cartTotalItems.textContent = total;
    localStorage.setItem('crustora_cart', JSON.stringify(cart));
}

window.updateItemQty = function (name, delta) {
    const item = cart.find(item => item.name === name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.name !== name);
    }
    updateCartCount();
    renderCart();
}

window.removeItem = function (name) {
    cart = cart.filter(i => i.name !== name);
    updateCartCount();
    renderCart();
}

function renderCart() {
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty. Add some sweetness! 🍰</div>';
        return;
    }

    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = (item.price || 0) * item.qty;
        subtotal += itemTotal;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                ${item.price ? `<div class="cart-item-price">₹${item.price} each · <strong>₹${itemTotal}</strong></div>` : ''}
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateItemQty('${escapeHtml(item.name)}', -1)" aria-label="Decrease quantity">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="updateItemQty('${escapeHtml(item.name)}', 1)" aria-label="Increase quantity">+</button>
                <button class="remove-item" onclick="removeItem('${escapeHtml(item.name)}')" title="Remove item">✕</button>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });

    if (subtotal > 0) {
        const totalRow = document.createElement('div');
        totalRow.className = 'cart-subtotal-card';
        totalRow.innerHTML = `<span>Estimated Total:</span><span class="subtotal-val">₹${subtotal.toLocaleString('en-IN')}</span>`;
        cartItemsContainer.appendChild(totalRow);
    }
}

function generateOrderText() {
    if (cart.length === 0) return null;
    let text = "Hi Crustora! 🌸 I would like to order:\n\n";
    let total = 0;
    cart.forEach(item => {
        const priceStr = item.price ? ` (₹${item.price * item.qty})` : '';
        total += (item.price || 0) * item.qty;
        text += `- ${item.qty}x ${item.name}${priceStr}\n`;
    });
    if (total > 0) {
        text += `\nTotal: ₹${total}\n`;
    }
    return text;
}

// Save order record directly to Supabase PostgreSQL database
async function saveOrderRecord(text, channel = 'WhatsApp') {
    const orderTotal = cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);

    try {
        await db.addOrder({
            customerEmail: 'guest@crustora.com',
            customerName: `${channel} Customer`,
            orderText: text,
            items: [...cart],
            total: orderTotal,
            status: 'Pending',
            channel: channel
        });
        console.log(`Order recorded in Supabase PostgreSQL (${channel}).`);
    } catch (err) {
        console.error("Order save error:", err);
    }
}

whatsappBtn.addEventListener('click', async () => {
    const text = generateOrderText();
    if (!text) {
        checkoutMsg.textContent = "Your cart is empty! Add some treats first. 🍰";
        checkoutMsg.style.display = "block";
        return;
    }

    const ogHtml = whatsappBtn.innerHTML;
    whatsappBtn.innerHTML = "Opening WhatsApp...";
    await saveOrderRecord(text, 'WhatsApp');
    whatsappBtn.innerHTML = ogHtml;

    const phone = "919891775379";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
});

instagramBtn.addEventListener('click', async () => {
    const text = generateOrderText();
    if (!text) {
        checkoutMsg.textContent = "Your cart is empty! Add some treats first. 🍰";
        checkoutMsg.style.display = "block";
        return;
    }

    try {
        const ogHtml = instagramBtn.innerHTML;
        instagramBtn.innerHTML = "Opening Instagram...";
        await saveOrderRecord(text, 'Instagram');
        instagramBtn.innerHTML = ogHtml;

        await navigator.clipboard.writeText(text);
        checkoutMsg.textContent = "Order copied! Paste it in our DM. 🌸";
        checkoutMsg.style.display = "block";

        setTimeout(() => {
            window.open('https://ig.me/m/crustoraa_', '_blank');
        }, 1200);
    } catch (err) {
        checkoutMsg.textContent = "Redirecting to Instagram...";
        checkoutMsg.style.display = "block";
        window.open('https://ig.me/m/crustoraa_', '_blank');
    }
});

// Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Category Icon Mapping
const CATEGORY_ICONS = {
    'all delights': '✨',
    'all treats': '✨',
    'all': '✨',
    'cakes': '🎂',
    'cupcakes & muffins': '🧁',
    'tub & jar cakes': '🍯',
    'strawberry special': '🍓',
    'brownies': '🍫',
    'tea cakes': '🫖',
    'chocolates': '🍬',
    'candles': '🕯️',
    'hampers & combos': '🎁',
    'hampers': '🎁',
    'combos': '🎁',
    'cookies': '🍪',
    'pastries': '🥐'
};

function getCategoryIcon(catName) {
    if (!catName) return '🍰';
    const clean = catName.toLowerCase().trim();
    return CATEGORY_ICONS[clean] || '🍰';
}

// Dynamic Menu Rendering from Persistent Database
let currentMenuCategories = {};
let allMenuItemsCache = [];

async function renderMenu() {
    const tabsContainer = document.getElementById('menuTabs');
    const gridContainer = document.getElementById('productGrid');

    if (!tabsContainer || !gridContainer) return;

    let [items, categories] = await Promise.all([
        db.getMenuItems(),
        db.getCategories()
    ]);

    allMenuItemsCache = items || [];

    // Sort categories by displayOrder
    const sortedCategories = (categories || []).sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

    // Group items by category in the defined category order
    currentMenuCategories = {};
    sortedCategories.forEach(cat => {
        currentMenuCategories[cat.name] = [];
    });

    // Place items into their categories
    allMenuItemsCache.forEach(item => {
        const cat = item.category || 'Cakes';
        if (!currentMenuCategories[cat]) {
            currentMenuCategories[cat] = [];
        }
        currentMenuCategories[cat].push(item);
    });

    const categoryNames = Object.keys(currentMenuCategories);
    if (categoryNames.length === 0) {
        gridContainer.innerHTML = '<div class="empty-cart-msg">No bakery treats found.</div>';
        return;
    }

    // Determine active tab (preserve previous active tab name or default to first category)
    const activeBtn = tabsContainer.querySelector('.menu-tab-btn.active');
    const currentActiveText = activeBtn ? activeBtn.getAttribute('data-cat') : null;
    const activeCategory = (currentActiveText && categoryNames.includes(currentActiveText))
        ? currentActiveText
        : categoryNames[0];

    // Render Tabs
    tabsContainer.innerHTML = '';
    categoryNames.forEach((catName) => {
        const btn = document.createElement('button');
        const isActive = catName === activeCategory;
        btn.className = `menu-tab-btn ${isActive ? 'active' : ''}`;
        btn.setAttribute('data-cat', catName);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        
        const icon = getCategoryIcon(catName);
        btn.innerHTML = `<span class="tab-emoji">${icon}</span><span>${escapeHtml(catName)}</span>`;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.menu-tab-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

            renderCategory(currentMenuCategories[catName], catName);

            // Retrigger animations
            const productCards = gridContainer.querySelectorAll('.product-card');
            productCards.forEach((card, i) => {
                card.classList.remove('is-visible');
                card.style.animationDelay = `${(i % 8) * 0.06}s`;
                setTimeout(() => card.classList.add('is-visible'), 50);
            });
        });
        tabsContainer.appendChild(btn);
    });

    // Render Grid for active category
    renderCategory(currentMenuCategories[activeCategory], activeCategory);
}

function renderCategory(items, categoryTitle = '') {
    const gridContainer = document.getElementById('productGrid');
    const countText = document.getElementById('catalogCountText');

    if (countText) {
        const n = (items || []).length;
        countText.textContent = n > 0 ? `${n} ${n === 1 ? 'Treat' : 'Treats'} Fresh` : 'Fresh Daily';
    }

    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (!items || items.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-catalog-state">
                <div class="empty-catalog-icon">🍰</div>
                <h3>Fresh Batch Coming Soon</h3>
                <p>We are currently whisking up sweet delights for this collection. Please check back shortly!</p>
            </div>
        `;
        return;
    }

    items.forEach((item, i) => {
        const isAvailable = item.isAvailable !== false;
        const imgs = Array.isArray(item.images) && item.images.length > 0
            ? item.images
            : (item.img ? [item.img] : ['assets/images/bento_cake.png']);
        const hasMultiple = imgs.length > 1;

        const div = document.createElement('div');
        div.className = 'product-card fade-in-up';
        div.style.animationDelay = `${(i % 8) * 0.06}s`;
        div.setAttribute('data-id', item.id);
        div.dataset.images = JSON.stringify(imgs);

        const badgeHtml = !isAvailable
            ? '<span class="card-badge sold-out">Sold Out</span>'
            : (item.badge ? `<span class="card-badge">${escapeHtml(item.badge)}</span>` : '');

        const photosBadgeHtml = hasMultiple
            ? `<span class="card-photos-badge" title="${imgs.length} photos available"><span class="badge-cam">📷</span> ${imgs.length}</span>`
            : '';

        const navButtonsHtml = hasMultiple
            ? `<button type="button" class="card-img-nav prev" data-dir="-1" aria-label="Previous photo">‹</button>
               <button type="button" class="card-img-nav next" data-dir="1" aria-label="Next photo">›</button>`
            : '';

        const dotsHtml = hasMultiple
            ? `<div class="card-img-dots">
                 ${imgs.map((_, idx) => `<span class="card-img-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}"></span>`).join('')}
               </div>`
            : '';

        const priceText = item.price ? `₹${item.price}` : 'Pre-order';
        const buttonHtml = isAvailable
            ? `<button class="btn icon-btn add-to-cart" data-price="${item.price || 0}" aria-label="Add ${escapeHtml(item.name)} to cart">
                 <span>+</span><span>Add</span>
               </button>`
            : `<button class="btn icon-btn sold-out-btn" disabled title="Currently sold out">Sold Out</button>`;

        div.innerHTML = `
            <div class="card-img-wrapper" data-active-idx="0" title="Click to view full photo gallery">
                ${badgeHtml}
                ${photosBadgeHtml}
                <img src="${imgs[0]}" alt="${escapeHtml(item.name)}" class="product-img" loading="lazy" onerror="this.src='assets/images/bento_cake.png'">
                ${navButtonsHtml}
                ${dotsHtml}
            </div>
            <div class="card-meta-row">
                <span class="card-category-tag">${escapeHtml(item.category || 'Bakery')}</span>
                <span class="card-dietary-tag">🌿 Eggless</span>
            </div>
            <h3 title="Click to view full details" style="cursor: pointer;">${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.desc || '')}</p>
            <div class="price-row">
                <span class="price">${priceText}</span>
                ${buttonHtml}
            </div>
        `;
        gridContainer.appendChild(div);

        observer.observe(div);
    });
}

// Live update storefront when admin changes database records
window.addEventListener('crustora_db_change', () => {
    renderMenu();
});

// Category Rail Scroll Controls & Smooth Mouse Wheel
function initCategoryRailControls() {
    const railLeft = document.getElementById('railScrollLeft');
    const railRight = document.getElementById('railScrollRight');
    const menuTabs = document.getElementById('menuTabs');

    if (railLeft && menuTabs) {
        railLeft.addEventListener('click', () => {
            menuTabs.scrollBy({ left: -260, behavior: 'smooth' });
        });
    }

    if (railRight && menuTabs) {
        railRight.addEventListener('click', () => {
            menuTabs.scrollBy({ left: 260, behavior: 'smooth' });
        });
    }

    if (menuTabs) {
        menuTabs.addEventListener('wheel', (evt) => {
            if (evt.deltaY !== 0 && !evt.shiftKey) {
                if (menuTabs.scrollWidth > menuTabs.clientWidth) {
                    evt.preventDefault();
                    menuTabs.scrollLeft += evt.deltaY;
                }
            }
        }, { passive: false });
    }
}

// Search and Filter Setup
function initSearch() {
    const menuSearch = document.getElementById('menuSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    if (!menuSearch) return;

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            menuSearch.value = '';
            clearSearchBtn.style.display = 'none';
            menuSearch.dispatchEvent(new Event('input'));
            menuSearch.focus();
        });
    }

    menuSearch.addEventListener('input', async (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (clearSearchBtn) {
            clearSearchBtn.style.display = query ? 'flex' : 'none';
        }

        if (query === '') {
            // Re-render active tab
            const activeTab = document.querySelector('.menu-tab-btn.active');
            if (activeTab) {
                activeTab.click();
            } else {
                renderMenu();
            }
            return;
        }

        document.querySelectorAll('.menu-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });

        const allItems = await db.getMenuItems();
        const filtered = allItems.filter(item =>
            item.name.toLowerCase().includes(query) ||
            (item.desc || '').toLowerCase().includes(query) ||
            (item.category || '').toLowerCase().includes(query)
        );

        const countText = document.getElementById('catalogCountText');
        if (countText) {
            countText.textContent = `${filtered.length} found`;
        }

        const gridContainer = document.getElementById('productGrid');
        if (filtered.length === 0 && gridContainer) {
            gridContainer.innerHTML = `
                <div class="empty-catalog-state">
                    <div class="empty-catalog-icon">🔍</div>
                    <h3>No sweet treats found</h3>
                    <p>We couldn't find anything matching "<strong>${escapeHtml(query)}</strong>". Try searching for chocolate, bento, or brownie!</p>
                    <button type="button" class="reset-search-btn" id="emptyStateResetBtn">Clear Search</button>
                </div>
            `;
            const resetBtn = document.getElementById('emptyStateResetBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (clearSearchBtn) clearSearchBtn.click();
                });
            }
            return;
        }

        renderCategory(filtered, `Search: "${query}"`);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Select all elements to be animated
    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-right, .fade-in-up');
    animatedElements.forEach(el => observer.observe(el));

    // Initialize Menu, Rail Controls, and Search
    renderMenu();
    initCategoryRailControls();
    initSearch();

    // Initialize Interactive Sliders and Effects
    initHeroSlider();
    initReviewsSlider();
    initScrollTopBtn();
    initCardTilt();
    initCustomizeStudio();

    // Update cart UI from local storage
    updateCartCount();
});

// =========================================================
// Interactive Hero Showcase Slider
// =========================================================
function initHeroSlider() {
    const slider = document.getElementById('heroSlider');
    if (!slider) return;

    const slides = slider.querySelectorAll('.hero-slide');
    const dots = slider.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrevBtn');
    const nextBtn = document.getElementById('heroNextBtn');

    if (!slides.length) return;

    let currentSlide = 0;
    let autoPlayTimer = null;

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active');
        if (dots[currentSlide]) dots[currentSlide].classList.remove('active');

        currentSlide = (index + slides.length) % slides.length;

        slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetTimer(); });

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            goToSlide(idx);
            resetTimer();
        });
    });

    function startTimer() {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
        autoPlayTimer = setInterval(nextSlide, 4500);
    }

    function resetTimer() {
        startTimer();
    }

    slider.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
    slider.addEventListener('mouseleave', startTimer);

    startTimer();
}

// =========================================================
// Interactive Customer Reviews Carousel Slider
// =========================================================
function initReviewsSlider() {
    const track = document.getElementById('reviewsTrack');
    const prevBtn = document.getElementById('reviewsPrevBtn');
    const nextBtn = document.getElementById('reviewsNextBtn');
    const dotsContainer = document.getElementById('reviewsDots');

    if (!track) return;

    const cards = track.querySelectorAll('.review-card');
    if (!cards.length) return;

    let currentIndex = 0;
    let autoPlayTimer = null;

    function getVisibleCards() {
        const width = window.innerWidth;
        if (width <= 640) return 1;
        if (width <= 1024) return 2;
        return 3;
    }

    function getMaxIndex() {
        return Math.max(0, cards.length - getVisibleCards());
    }

    function updateTrack() {
        const maxIdx = getMaxIndex();
        if (currentIndex > maxIdx) currentIndex = maxIdx;
        if (currentIndex < 0) currentIndex = 0;

        const cardWidth = cards[0].offsetWidth;
        const gap = 32; // 2rem
        const offset = currentIndex * (cardWidth + gap);
        track.style.transform = `translateX(-${offset}px)`;

        // Update dots
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.review-dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }
    }

    function renderDots() {
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        const maxIdx = getMaxIndex();
        for (let i = 0; i <= maxIdx; i++) {
            const dot = document.createElement('button');
            dot.className = `review-dot ${i === currentIndex ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to review ${i + 1}`);
            dot.addEventListener('click', () => {
                currentIndex = i;
                updateTrack();
                resetTimer();
            });
            dotsContainer.appendChild(dot);
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = currentIndex > 0 ? currentIndex - 1 : getMaxIndex();
            updateTrack();
            resetTimer();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentIndex = currentIndex < getMaxIndex() ? currentIndex + 1 : 0;
            updateTrack();
            resetTimer();
        });
    }

    function startTimer() {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
        autoPlayTimer = setInterval(() => {
            currentIndex = currentIndex < getMaxIndex() ? currentIndex + 1 : 0;
            updateTrack();
        }, 5000);
    }

    function resetTimer() {
        startTimer();
    }

    const container = document.getElementById('reviewsTrackContainer');
    if (container) {
        container.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
        container.addEventListener('mouseleave', startTimer);

        // Touch swipe support
        let startX = 0;
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            clearInterval(autoPlayTimer);
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const diffX = e.changedTouches[0].clientX - startX;
            if (Math.abs(diffX) > 40) {
                if (diffX > 0) {
                    currentIndex = Math.max(0, currentIndex - 1);
                } else {
                    currentIndex = Math.min(getMaxIndex(), currentIndex + 1);
                }
                updateTrack();
            }
            startTimer();
        }, { passive: true });
    }

    window.addEventListener('resize', () => {
        renderDots();
        updateTrack();
    });

    renderDots();
    updateTrack();
    startTimer();
}

// =========================================================
// Interactive Particle Celebration Burst on Add to Cart
// =========================================================
function triggerSweetBurst(x, y) {
    const emojis = ['🌸', '✨', '🍰', '💖', '⭐', '🧁', '🎉'];
    const particleCount = 7;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('span');
        particle.className = 'sweet-particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const distance = 40 + Math.random() * 50;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 35; // Float upwards
        const rot = (Math.random() - 0.5) * 120;

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);
        particle.style.setProperty('--rot', `${rot}deg`);

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 950);
    }
}

// =========================================================
// Floating Back to Top Button
// =========================================================
function initScrollTopBtn() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 380) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =========================================================
// Interactive 3D Perspective Card Tilt
// =========================================================
function initCardTilt() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    grid.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });

    grid.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        card.style.transform = '';
    });
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Newsletter Subscription
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Thank you for subscribing to our sweet family! 🌸', 'success');
        newsletterForm.reset();
    });
}

// =========================================================
// Interactive Product Quick View & Multi-Image Gallery Modal
// =========================================================
const quickViewModal = document.getElementById('productQuickViewModal');
const closeQuickViewBtn = document.getElementById('closeQuickViewBtn');
const quickViewBackdrop = document.getElementById('quickViewBackdrop');
const qvMainImg = document.getElementById('qvMainImg');
const qvPrevBtn = document.getElementById('qvPrevBtn');
const qvNextBtn = document.getElementById('qvNextBtn');
const qvPhotoCounter = document.getElementById('qvPhotoCounter');
const qvThumbsStrip = document.getElementById('qvThumbsStrip');
const qvCategory = document.getElementById('qvCategory');
const qvBadge = document.getElementById('qvBadge');
const qvTitle = document.getElementById('qvTitle');
const qvPrice = document.getElementById('qvPrice');
const qvStockStatus = document.getElementById('qvStockStatus');
const qvDesc = document.getElementById('qvDesc');
const qvQtyMinus = document.getElementById('qvQtyMinus');
const qvQtyPlus = document.getElementById('qvQtyPlus');
const qvQtyValue = document.getElementById('qvQtyValue');
const qvAddToCartBtn = document.getElementById('qvAddToCartBtn');
const qvWaDirectBtn = document.getElementById('qvWaDirectBtn');

let qvCurrentItem = null;
let qvCurrentPhotoIdx = 0;
let qvQty = 1;

async function openProductQuickView(itemId, startPhotoIdx = 0) {
    if (!quickViewModal) return;
    const item = allMenuItemsCache.find(i => i.id === itemId) || await db.getMenuItem(itemId);
    if (!item) return;

    qvCurrentItem = item;
    qvCurrentPhotoIdx = startPhotoIdx;
    qvQty = 1;
    if (qvQtyValue) qvQtyValue.textContent = '1';

    const imgs = Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : (item.img ? [item.img] : ['assets/images/bento_cake.png']);

    // Set textual metadata
    if (qvTitle) qvTitle.textContent = item.name;
    if (qvCategory) qvCategory.textContent = item.category || 'Bakery';
    if (qvPrice) qvPrice.textContent = item.price ? `₹${item.price}` : 'Pre-order';
    if (qvDesc) qvDesc.textContent = item.desc || 'Handcrafted fresh with the finest ingredients.';

    if (qvBadge) {
        if (item.badge) {
            qvBadge.textContent = item.badge;
            qvBadge.style.display = 'inline-block';
        } else {
            qvBadge.style.display = 'none';
        }
    }

    if (qvStockStatus) {
        const inStock = item.isAvailable !== false;
        qvStockStatus.textContent = inStock ? '● Fresh & In Stock' : '✕ Currently Sold Out';
        qvStockStatus.style.color = inStock ? '#16a34a' : '#ef4444';
        if (qvAddToCartBtn) qvAddToCartBtn.disabled = !inStock;
    }

    // Set Thumbnails strip
    if (qvThumbsStrip) {
        if (imgs.length > 1) {
            qvThumbsStrip.style.display = 'flex';
            qvThumbsStrip.innerHTML = imgs.map((src, idx) => `
                <div class="qv-thumb-item ${idx === qvCurrentPhotoIdx ? 'active' : ''}" data-idx="${idx}" title="Photo ${idx + 1}">
                    <img src="${escapeHtml(src)}" alt="Thumbnail ${idx + 1}" onerror="this.src='assets/images/bento_cake.png'">
                </div>
            `).join('');
        } else {
            qvThumbsStrip.style.display = 'none';
            qvThumbsStrip.innerHTML = '';
        }
    }

    // Navigation buttons visibility
    if (qvPrevBtn) qvPrevBtn.style.display = imgs.length > 1 ? 'flex' : 'none';
    if (qvNextBtn) qvNextBtn.style.display = imgs.length > 1 ? 'flex' : 'none';

    updateQuickViewPhoto(qvCurrentPhotoIdx);

    quickViewModal.classList.add('open');
    quickViewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function updateQuickViewPhoto(idx) {
    if (!qvCurrentItem) return;
    const imgs = Array.isArray(qvCurrentItem.images) && qvCurrentItem.images.length > 0
        ? qvCurrentItem.images
        : (qvCurrentItem.img ? [qvCurrentItem.img] : ['assets/images/bento_cake.png']);

    qvCurrentPhotoIdx = (idx + imgs.length) % imgs.length;

    if (qvMainImg) {
        qvMainImg.style.opacity = '0.35';
        setTimeout(() => {
            qvMainImg.src = imgs[qvCurrentPhotoIdx];
            qvMainImg.style.opacity = '1';
        }, 110);
    }

    if (qvPhotoCounter) {
        qvPhotoCounter.textContent = `${qvCurrentPhotoIdx + 1} / ${imgs.length}`;
        qvPhotoCounter.style.display = imgs.length > 1 ? 'inline-block' : 'none';
    }

    if (qvThumbsStrip) {
        const thumbEls = qvThumbsStrip.querySelectorAll('.qv-thumb-item');
        thumbEls.forEach((el, i) => {
            el.classList.toggle('active', i === qvCurrentPhotoIdx);
            if (i === qvCurrentPhotoIdx) {
                el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    }
}

function closeProductQuickView() {
    if (!quickViewModal) return;
    quickViewModal.classList.remove('open');
    quickViewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

if (closeQuickViewBtn) closeQuickViewBtn.addEventListener('click', closeProductQuickView);
if (quickViewBackdrop) quickViewBackdrop.addEventListener('click', closeProductQuickView);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && quickViewModal && quickViewModal.classList.contains('open')) {
        closeProductQuickView();
    }
});

if (qvPrevBtn) {
    qvPrevBtn.addEventListener('click', () => updateQuickViewPhoto(qvCurrentPhotoIdx - 1));
}

if (qvNextBtn) {
    qvNextBtn.addEventListener('click', () => updateQuickViewPhoto(qvCurrentPhotoIdx + 1));
}

if (qvThumbsStrip) {
    qvThumbsStrip.addEventListener('click', (e) => {
        const thumb = e.target.closest('.qv-thumb-item');
        if (thumb) {
            const idx = Number(thumb.getAttribute('data-idx') || 0);
            updateQuickViewPhoto(idx);
        }
    });
}

if (qvQtyMinus) {
    qvQtyMinus.addEventListener('click', () => {
        if (qvQty > 1) {
            qvQty--;
            if (qvQtyValue) qvQtyValue.textContent = qvQty;
        }
    });
}

if (qvQtyPlus) {
    qvQtyPlus.addEventListener('click', () => {
        if (qvQty < 99) {
            qvQty++;
            if (qvQtyValue) qvQtyValue.textContent = qvQty;
        }
    });
}

if (qvAddToCartBtn) {
    qvAddToCartBtn.addEventListener('click', () => {
        if (!qvCurrentItem) return;
        const itemName = qvCurrentItem.name;
        const itemPrice = Number(qvCurrentItem.price) || 0;

        const existingItem = cart.find(item => item.name === itemName);
        if (existingItem) {
            existingItem.qty += qvQty;
            if (!existingItem.price && itemPrice) existingItem.price = itemPrice;
        } else {
            cart.push({ name: itemName, price: itemPrice, qty: qvQty });
        }

        updateCartCount();

        const btnRect = qvAddToCartBtn.getBoundingClientRect();
        triggerSweetBurst(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);

        showToast(`🌸 Added ${qvQty}x "${itemName}" to your cart!`, 'success');
        closeProductQuickView();
    });
}

if (qvWaDirectBtn) {
    qvWaDirectBtn.addEventListener('click', () => {
        if (!qvCurrentItem) return;
        const itemName = qvCurrentItem.name;
        const itemPrice = qvCurrentItem.price ? ` (₹${qvCurrentItem.price * qvQty})` : '';
        const msg = `Hi Crustora! 🌸 I would like to order:\n- ${qvQty}x ${itemName}${itemPrice}\n\nPlease confirm availability and details! ✨`;
        const phone = "919891775379";
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    });
}

// =========================================================
// Custom Creation Studio (Bespoke Cakes, Hampers, Candles)
// =========================================================
function initCustomizeStudio() {
    const form = document.getElementById('customOrderForm');
    if (!form) return;

    const catTabs = document.querySelectorAll('.custom-cat-tab');
    const dynamicFieldsCakes = document.getElementById('dynamicFieldsCakes');
    const dynamicFieldsHampers = document.getElementById('dynamicFieldsHampers');
    const dynamicFieldsCandles = document.getElementById('dynamicFieldsCandles');

    const dropzone = document.getElementById('customDropzone');
    const photoInput = document.getElementById('customPhotoInput');
    const dropzoneEmpty = document.getElementById('customDropzoneEmpty');
    const previewFrame = document.getElementById('customPreviewFrame');
    const previewImg = document.getElementById('customPreviewImg');
    const previewName = document.getElementById('customPreviewName');
    const btnRemovePhoto = document.getElementById('btnRemoveCustomPhoto');
    const sampleChips = document.getElementById('sampleInspirationChips');
    const submitBtn = document.getElementById('btnSubmitCustomOrder');

    let currentCat = 'cakes';
    let currentPhoto = null; // { dataUrl: string, name: string, isPreset: boolean }

    // 1. Tab Switching
    function setCategory(cat) {
        currentCat = cat;
        catTabs.forEach(tab => {
            const isActive = tab.getAttribute('data-custom-cat') === cat;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (dynamicFieldsCakes) dynamicFieldsCakes.style.display = cat === 'cakes' ? 'block' : 'none';
        if (dynamicFieldsHampers) dynamicFieldsHampers.style.display = cat === 'hampers' ? 'block' : 'none';
        if (dynamicFieldsCandles) dynamicFieldsCandles.style.display = cat === 'candles' ? 'block' : 'none';
    }

    catTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const cat = tab.getAttribute('data-custom-cat');
            if (cat) setCategory(cat);
        });
    });

    // 2. Photo Display & Management
    function displayPhoto(src, name, isPreset = false) {
        if (!previewImg || !previewName || !dropzoneEmpty || !previewFrame) return;
        previewImg.src = src;
        previewName.textContent = name || 'reference_photo.jpg';
        dropzoneEmpty.style.display = 'none';
        previewFrame.style.display = 'flex';
        currentPhoto = { dataUrl: src, name: name, isPreset };
    }

    function removePhoto() {
        currentPhoto = null;
        if (photoInput) photoInput.value = '';
        if (previewImg) previewImg.src = '';
        if (previewFrame) previewFrame.style.display = 'none';
        if (dropzoneEmpty) dropzoneEmpty.style.display = 'flex';
    }

    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            removePhoto();
            showToast('Reference photo removed', 'info');
        });
    }

    function handleFile(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file (PNG, JPG, WebP)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            displayPhoto(e.target.result, file.name, false);
            showToast(`📸 Photo "${file.name}" attached!`, 'success');
        };
        reader.readAsDataURL(file);
    }

    if (dropzone && photoInput) {
        dropzone.addEventListener('click', (e) => {
            if (e.target.closest('#btnRemoveCustomPhoto')) return;
            photoInput.click();
        });

        dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                photoInput.click();
            }
        });

        photoInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });

        // Drag and Drop
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files[0]) {
                handleFile(dt.files[0]);
            }
        });
    }

    // 3. Sample Inspiration Presets
    if (sampleChips) {
        sampleChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.sample-chip');
            if (!chip) return;
            const imgSrc = chip.getAttribute('data-img');
            const cat = chip.getAttribute('data-cat');
            const chipText = chip.textContent.trim();

            if (cat) setCategory(cat);
            if (imgSrc) {
                displayPhoto(imgSrc, chipText, true);
                showToast(`✨ Inspiration applied: ${chipText}`, 'success');
            }
        });
    }

    // 4. Form Submit & WhatsApp Order Redirection
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const occasion = document.getElementById('customOccasion')?.value || 'Celebration';
        const neededDate = document.getElementById('customDate')?.value || 'Flexible';
        const lettering = document.getElementById('customLettering')?.value.trim();
        const notes = document.getElementById('customNotes')?.value.trim();
        const customerName = document.getElementById('customCustomerName')?.value.trim() || 'Sweet Customer';

        let categoryTitle = 'Custom Cake';
        let categoryDetails = '';

        if (currentCat === 'cakes') {
            categoryTitle = 'Custom Designer Cake';
            const flavor = document.getElementById('customCakeFlavor')?.value || 'Belgian Chocolate Truffle';
            const size = document.getElementById('customCakeSize')?.value || 'Half Kg';
            categoryDetails = `*Flavor:* ${flavor}\n*Size / Weight:* ${size}`;
        } else if (currentCat === 'hampers') {
            categoryTitle = 'Luxury Curated Hamper';
            const hamperType = document.getElementById('customHamperType')?.value || 'Grand Royal';
            const budget = document.getElementById('customHamperBudget')?.value || '₹800 - ₹1,200';
            categoryDetails = `*Hamper Combination:* ${hamperType}\n*Target Budget:* ${budget}`;
        } else if (currentCat === 'candles') {
            categoryTitle = 'Aesthetic Scented Candle Set';
            const scent = document.getElementById('customCandleScent')?.value || 'Vanilla Lavender Calm';
            const qty = document.getElementById('customCandleQty')?.value || 'Single Luxury Pastel Jar';
            categoryDetails = `*Aroma / Fragrance:* ${scent}\n*Quantity & Style:* ${qty}`;
        }

        const photoStatus = currentPhoto
            ? (currentPhoto.isPreset ? `Sample inspiration selected (${currentPhoto.name}) 📸 (Attaching photo in chat)` : `Reference photo uploaded: ${currentPhoto.name} 📸 (Attaching photo in chat)`)
            : 'None (text description only)';

        // Format clean WhatsApp message
        let wspMsg = `Hi Crustora! 🌸 I would like to place a custom inquiry:\n\n`;
        wspMsg += `✨ *${categoryTitle.toUpperCase()}* ✨\n`;
        wspMsg += `👤 *Customer Name:* ${customerName}\n`;
        wspMsg += `🎉 *Occasion:* ${occasion}\n`;
        wspMsg += `📅 *Needed By:* ${neededDate}\n`;
        wspMsg += `${categoryDetails}\n`;
        if (lettering) wspMsg += `✍️ *Custom Lettering/Card:* "${lettering}"\n`;
        if (notes) wspMsg += `📝 *Special Requests/Dietary:* ${notes}\n`;
        wspMsg += `📸 *Reference Photo:* ${photoStatus}\n\n`;
        wspMsg += `Please let me know the availability, pricing, and next steps! 💕`;

        // Save order in database
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span>Preparing Custom Order... ✨</span>`;
            }

            await db.addOrder({
                customerEmail: 'custom@crustora.com',
                customerName: customerName,
                orderText: wspMsg,
                items: [{ name: `${categoryTitle} (${occasion})`, price: 0, qty: 1 }],
                total: 0,
                status: 'Pending',
                channel: 'WhatsApp'
            });
        } catch (err) {
            console.error('Error saving custom order:', err);
        }

        // Copy order text to clipboard
        try {
            await navigator.clipboard.writeText(wspMsg);
        } catch (cErr) {
            console.warn('Clipboard write warning:', cErr);
        }

        // Trigger sweet celebration burst
        if (submitBtn) {
            const rect = submitBtn.getBoundingClientRect();
            triggerSweetBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }

        showToast('🌸 Custom order details prepared! Redirecting to WhatsApp...', 'success');

        const phone = "919891775379";
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(wspMsg)}`;

        setTimeout(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span>Order Custom Creation on WhatsApp</span>
                `;
            }
            window.open(url, '_blank');
        }, 600);
    });
}


