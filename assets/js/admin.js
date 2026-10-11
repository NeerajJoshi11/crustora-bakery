/**
 * Crustora Admin Dashboard Controller
 * Full management for Menu Items, Users, Orders, PIN Auth, and DB Utilities.
 */

import { db } from './db.js';

// Toast Notification Helper
function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

document.addEventListener('DOMContentLoaded', async () => {
    // ----------------------------------------------------
    // 1. PIN Authentication & Lock Management
    // ----------------------------------------------------
    const pinLockOverlay = document.getElementById('pinLockOverlay');
    const pinCard = document.getElementById('pinCard');
    const pinForm = document.getElementById('pinForm');
    const adminPinInput = document.getElementById('adminPinInput');
    const pinErrorMsg = document.getElementById('pinErrorMsg');
    const togglePinVisibilityBtn = document.getElementById('togglePinVisibilityBtn');
    const lockDashboardBtn = document.getElementById('lockDashboardBtn');

    const checkAuthStatus = () => {
        const isAuth = sessionStorage.getItem('crustora_admin_auth') === 'true';
        if (isAuth) {
            pinLockOverlay.classList.add('hidden');
            loadAllData();
        } else {
            pinLockOverlay.classList.remove('hidden');
            adminPinInput.value = '';
            adminPinInput.focus();
        }
    };

    pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = adminPinInput.value.trim();
        const isValid = await db.verifyAdminPin(pin);

        if (isValid) {
            sessionStorage.setItem('crustora_admin_auth', 'true');
            pinErrorMsg.textContent = '';
            pinLockOverlay.classList.add('hidden');
            showToast('🌸 Welcome to Crustora Admin Dashboard!', 'success');
            loadAllData();
        } else {
            pinErrorMsg.textContent = 'Incorrect PIN. Try again or check default (admin123).';
            pinCard.classList.remove('shake');
            void pinCard.offsetWidth; // trigger reflow
            pinCard.classList.add('shake');
            adminPinInput.select();
        }
    });

    togglePinVisibilityBtn.addEventListener('click', () => {
        const type = adminPinInput.type === 'password' ? 'text' : 'password';
        adminPinInput.type = type;
        togglePinVisibilityBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });

    lockDashboardBtn.addEventListener('click', () => {
        sessionStorage.removeItem('crustora_admin_auth');
        showToast('Admin Dashboard locked.', 'info');
        checkAuthStatus();
    });

    // ----------------------------------------------------
    // 2. Tab Navigation
    // ----------------------------------------------------
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) targetContent.classList.add('active');

            if (targetTab === 'menu') renderMenuItems();
            if (targetTab === 'categories') renderCategories();
            if (targetTab === 'orders') renderOrders();
            if (targetTab === 'overview') renderOverview();
        });
    });

    // ----------------------------------------------------
    // 3. Overview KPI & Recent Orders
    // ----------------------------------------------------
    async function renderOverview() {
        const [menuItems, orders, categories] = await Promise.all([
            db.getMenuItems(),
            db.getOrders(),
            db.getCategories()
        ]);

        // Revenue calculation
        const revenue = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);
        const pendingOrders = orders.filter(o => o.status === 'Pending').length;
        const inStockCount = menuItems.filter(i => i.isAvailable !== false).length;

        // KPI values
        document.getElementById('kpiRevenue').textContent = `₹${revenue.toLocaleString('en-IN')}`;
        document.getElementById('kpiOrders').textContent = orders.length;
        document.getElementById('kpiOrdersSub').textContent = `${pendingOrders} awaiting fulfillment`;
        document.getElementById('kpiMenuItems').textContent = menuItems.length;
        document.getElementById('kpiInStockSub').textContent = `${inStockCount} currently available`;
        const kpiCat = document.getElementById('kpiCategories');
        if (kpiCat) kpiCat.textContent = categories.length;

        // Badges in tabs
        document.getElementById('menuCountBadge').textContent = menuItems.length;
        const catBadge = document.getElementById('categoriesCountBadge');
        if (catBadge) catBadge.textContent = categories.length;
        document.getElementById('ordersCountBadge').textContent = orders.length;

        // Recent orders table
        const recentBody = document.getElementById('overviewRecentOrdersBody');
        const recent = orders.slice(0, 5);

        if (recent.length === 0) {
            recentBody.innerHTML = `
                <tr><td colspan="6" class="empty-state">No orders placed yet.</td></tr>
            `;
            return;
        }

        recentBody.innerHTML = recent.map(o => {
            const dateStr = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const pillClass = o.status === 'Delivered' ? 'pill-success' : o.status === 'Preparing' ? 'pill-info' : o.status === 'Cancelled' ? 'pill-danger' : 'pill-warning';
            return `
                <tr>
                    <td><strong>#${o.id.replace('ord_', '')}</strong></td>
                    <td>${escapeHtml(o.customerName || o.customerEmail)}</td>
                    <td><span class="pill pill-neutral">${escapeHtml(o.channel || 'Direct')}</span></td>
                    <td><strong>₹${o.total || 0}</strong></td>
                    <td><span class="pill ${pillClass}">${o.status}</span></td>
                    <td style="color: var(--text-light); font-size: 0.85rem;">${dateStr}</td>
                </tr>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // 4. Menu Items Management
    // ----------------------------------------------------
    let currentCategoryFilter = 'ALL';
    const menuSearchInput = document.getElementById('menuSearchInput');
    const menuCategoryChips = document.getElementById('menuCategoryChips');
    const menuItemsTableBody = document.getElementById('menuItemsTableBody');
    const menuItemModal = document.getElementById('menuItemModal');
    const menuItemForm = document.getElementById('menuItemForm');
    const openAddMenuItemBtn = document.getElementById('openAddMenuItemBtn');
    const closeMenuModalBtn = document.getElementById('closeMenuModalBtn');
    const cancelMenuModalBtn = document.getElementById('cancelMenuModalBtn');

    async function renderMenuItems() {
        const items = await db.getMenuItems();
        const query = (menuSearchInput.value || '').toLowerCase().trim();

        // Extract unique categories for filter chips
        const categories = Array.from(new Set(items.map(i => i.category || 'Cakes')));
        menuCategoryChips.innerHTML = `
            <button class="chip-btn ${currentCategoryFilter === 'ALL' ? 'active' : ''}" data-category="ALL">All Categories (${items.length})</button>
            ${categories.map(cat => {
                const count = items.filter(i => i.category === cat).length;
                return `<button class="chip-btn ${currentCategoryFilter === cat ? 'active' : ''}" data-category="${cat}">${cat} (${count})</button>`;
            }).join('')}
        `;

        menuCategoryChips.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategoryFilter = btn.getAttribute('data-category');
                renderMenuItems();
            });
        });

        // Filter items
        const filtered = items.filter(item => {
            const matchesCat = currentCategoryFilter === 'ALL' || item.category === currentCategoryFilter;
            const matchesQuery = !query ||
                item.name.toLowerCase().includes(query) ||
                (item.desc || '').toLowerCase().includes(query) ||
                (item.badge || '').toLowerCase().includes(query);
            return matchesCat && matchesQuery;
        });

        if (filtered.length === 0) {
            menuItemsTableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <div class="empty-state-icon">🍰</div>
                            <h3>No items match your filter</h3>
                            <p>Try searching another keyword or add a new bakery delight!</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        menuItemsTableBody.innerHTML = filtered.map(item => {
            const isChecked = item.isAvailable !== false ? 'checked' : '';
            const statusPill = item.isAvailable !== false
                ? '<span class="pill pill-success">In Stock</span>'
                : '<span class="pill pill-danger">Sold Out</span>';
            const badgeHtml = item.badge
                ? `<span class="pill pill-accent">${escapeHtml(item.badge)}</span>`
                : `<span style="color: var(--text-light); font-size: 0.85rem;">—</span>`;

            const itemImgs = Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.img ? [item.img] : []);
            const photoCount = itemImgs.length;
            const photoBadge = photoCount > 1 ? `<span class="thumb-count-pill" title="${photoCount} photos">📷 ${photoCount}</span>` : '';

            return `
                <tr>
                    <td>
                        <div class="item-cell">
                            <div class="item-thumb-wrapper">
                                <img src="${item.img || 'assets/images/bento_cake.png'}" alt="${escapeHtml(item.name)}" class="item-thumb" onerror="this.src='assets/images/bento_cake.png'">
                                ${photoBadge}
                            </div>
                            <div class="item-details">
                                <h4>${escapeHtml(item.name)}</h4>
                                <p title="${escapeHtml(item.desc || '')}">${escapeHtml(item.desc || '')}</p>
                            </div>
                        </div>
                    </td>
                    <td><span class="pill pill-neutral">${escapeHtml(item.category || 'General')}</span></td>
                    <td><strong>₹${item.price}</strong></td>
                    <td>${badgeHtml}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.6rem;">
                            <label class="switch" title="Toggle Stock Availability">
                                <input type="checkbox" class="stock-toggle" data-id="${item.id}" ${isChecked}>
                                <span class="slider"></span>
                            </label>
                            ${statusPill}
                        </div>
                    </td>
                    <td>
                        <div class="row-actions">
                            <button class="btn-icon-action btn-edit-item" data-id="${item.id}" title="Edit Item">
                                ✏️
                            </button>
                            <button class="btn-icon-action btn-icon-delete btn-delete-item" data-id="${item.id}" title="Delete Item">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach listeners for stock toggle switches
        menuItemsTableBody.querySelectorAll('.stock-toggle').forEach(chk => {
            chk.addEventListener('change', async (e) => {
                const id = chk.getAttribute('data-id');
                const updated = await db.toggleItemAvailability(id);
                showToast(`"${updated.name}" is now ${updated.isAvailable ? 'In Stock' : 'Sold Out'}.`, 'info');
                renderMenuItems();
                renderOverview();
            });
        });

        // Attach edit & delete actions
        menuItemsTableBody.querySelectorAll('.btn-edit-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const item = await db.getMenuItem(id);
                if (item) openMenuModal(item);
            });
        });

        menuItemsTableBody.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const item = await db.getMenuItem(id);
                if (item && confirm(`Are you sure you want to delete "${item.name}" from the bakery catalog?`)) {
                    await db.deleteMenuItem(id);
                    showToast(`Deleted "${item.name}".`, 'info');
                    renderMenuItems();
                    renderOverview();
                }
            });
        });
    }

    menuSearchInput.addEventListener('input', () => renderMenuItems());

    // ----------------------------------------------------
    // Bakery Item Image Uploader & Gallery Logic (Upload / Preset / URL)
    // ----------------------------------------------------
    const uploadDropzone = document.getElementById('uploadDropzone');
    const itemFileInput = document.getElementById('itemFileInput');
    const itemImagePreset = document.getElementById('itemImagePreset');
    const btnAddPresetImg = document.getElementById('btnAddPresetImg');
    const itemUrlInput = document.getElementById('itemUrlInput');
    const btnAddUrlImg = document.getElementById('btnAddUrlImg');
    const itemInputImg = document.getElementById('itemInputImg');
    const itemInputImages = document.getElementById('itemInputImages');
    const galleryCountBadge = document.getElementById('galleryCountBadge');
    const galleryThumbsGrid = document.getElementById('galleryThumbsGrid');
    const uploadPanel = document.getElementById('uploadPanel');
    const presetPanel = document.getElementById('presetPanel');
    const urlPanel = document.getElementById('urlPanel');
    const imgTabBtns = document.querySelectorAll('.img-tab-btn');

    const DEFAULT_ITEM_IMG = 'assets/images/iconic_bento_candle.jpg';
    let currentModalImages = [];

    function setImageMode(mode) {
        imgTabBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-img-mode') === mode));
        if (uploadPanel) uploadPanel.style.display = mode === 'upload' ? 'block' : 'none';
        if (presetPanel) presetPanel.style.display = mode === 'preset' ? 'block' : 'none';
        if (urlPanel) urlPanel.style.display = mode === 'url' ? 'block' : 'none';
    }

    imgTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-img-mode');
            setImageMode(mode);
        });
    });

    // Helper: Compress and resize uploaded image using Canvas
    async function processAndCompressImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                return reject(new Error('Please select a valid image file.'));
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_DIM = 800; // Optimal resolution for bakery items
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_DIM || height > MAX_DIM) {
                        if (width > height) {
                            height = Math.round((height * MAX_DIM) / width);
                            width = MAX_DIM;
                        } else {
                            width = Math.round((width * MAX_DIM) / height);
                            height = MAX_DIM;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try WebP first for optimal compression, fallback to JPEG
                    let dataUrl = canvas.toDataURL('image/webp', 0.82);
                    if (!dataUrl || dataUrl.indexOf('data:image/webp') !== 0) {
                        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                    }
                    resolve({ dataUrl, originalName: file.name, sizeKb: Math.round(dataUrl.length * 0.75 / 1024) });
                };
                img.onerror = () => reject(new Error('Failed to load image file.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });
    }

    // Render multi-image thumbnail manager
    function renderGalleryManager() {
        if (!galleryThumbsGrid) return;

        if (galleryCountBadge) {
            const count = currentModalImages.length;
            galleryCountBadge.textContent = `${count} ${count === 1 ? 'photo' : 'photos'}`;
        }

        if (currentModalImages.length === 0) {
            galleryThumbsGrid.innerHTML = `
                <div class="gallery-empty-state" style="grid-column: 1 / -1;">
                    <p>No photos added yet. Upload or pick a preset above! 📸</p>
                </div>
            `;
            if (itemInputImg) itemInputImg.value = DEFAULT_ITEM_IMG;
            if (itemInputImages) itemInputImages.value = JSON.stringify([]);
            return;
        }

        // Sync hidden inputs
        if (itemInputImg) itemInputImg.value = currentModalImages[0];
        if (itemInputImages) itemInputImages.value = JSON.stringify(currentModalImages);

        galleryThumbsGrid.innerHTML = currentModalImages.map((src, idx) => {
            const isCover = idx === 0;
            return `
                <div class="gallery-thumb-item ${isCover ? 'is-cover' : ''}">
                    <div class="thumb-image-holder">
                        <img src="${escapeHtml(src)}" alt="Photo ${idx + 1}" onerror="this.src='assets/images/bento_cake.png'">
                        ${isCover ? '<span class="thumb-cover-tag">⭐ Cover</span>' : ''}
                        <span class="thumb-number-tag">#${idx + 1}</span>
                    </div>
                    <div class="thumb-actions-bar">
                        <button type="button" class="thumb-btn" data-action="move-left" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move Left / Earlier">◀</button>
                        <button type="button" class="thumb-btn thumb-btn-remove" data-action="remove" data-index="${idx}" title="Remove Photo">✕</button>
                        <button type="button" class="thumb-btn" data-action="move-right" data-index="${idx}" ${idx === currentModalImages.length - 1 ? 'disabled' : ''} title="Move Right / Later">▶</button>
                    </div>
                    ${!isCover ? `<button type="button" class="thumb-btn-make-cover" data-action="make-cover" data-index="${idx}">⭐ Set Cover</button>` : ''}
                </div>
            `;
        }).join('');
    }

    // Handle clicks inside gallery thumbs grid (delegation)
    if (galleryThumbsGrid) {
        galleryThumbsGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn || btn.disabled) return;

            const action = btn.getAttribute('data-action');
            const index = Number(btn.getAttribute('data-index'));

            if (action === 'make-cover') {
                if (index > 0 && index < currentModalImages.length) {
                    const item = currentModalImages.splice(index, 1)[0];
                    currentModalImages.unshift(item);
                    renderGalleryManager();
                    showToast('⭐ Cover photo updated!', 'success');
                }
            } else if (action === 'move-left') {
                if (index > 0) {
                    const temp = currentModalImages[index - 1];
                    currentModalImages[index - 1] = currentModalImages[index];
                    currentModalImages[index] = temp;
                    renderGalleryManager();
                }
            } else if (action === 'move-right') {
                if (index < currentModalImages.length - 1) {
                    const temp = currentModalImages[index + 1];
                    currentModalImages[index + 1] = currentModalImages[index];
                    currentModalImages[index] = temp;
                    renderGalleryManager();
                }
            } else if (action === 'remove') {
                currentModalImages.splice(index, 1);
                if (currentModalImages.length === 0) {
                    currentModalImages = [DEFAULT_ITEM_IMG];
                    showToast('Reset to default photo (at least 1 photo required)', 'info');
                } else {
                    showToast('Photo removed.', 'info');
                }
                renderGalleryManager();
            }
        });
    }

    // Process multiple selected or dropped files
    async function handleFilesSelect(fileList) {
        if (!fileList || fileList.length === 0) return;
        const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            showToast('Please select valid image files.', 'warning');
            return;
        }

        try {
            showToast(`Optimizing ${validFiles.length} photo(s)...`, 'info');
            for (const file of validFiles) {
                const { dataUrl } = await processAndCompressImage(file);
                // If currently only holding the default placeholder, replace it
                if (currentModalImages.length === 1 && currentModalImages[0] === DEFAULT_ITEM_IMG) {
                    currentModalImages = [dataUrl];
                } else {
                    currentModalImages.push(dataUrl);
                }
            }
            renderGalleryManager();
            showToast(`📸 ${validFiles.length} photo(s) added!`, 'success');
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Error processing images', 'error');
        }
    }

    if (uploadDropzone && itemFileInput) {
        uploadDropzone.addEventListener('click', () => itemFileInput.click());
        uploadDropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                itemFileInput.click();
            }
        });

        itemFileInput.addEventListener('change', (e) => {
            if (e.target.files) handleFilesSelect(e.target.files);
            itemFileInput.value = ''; // Reset input so same files can be re-added
        });

        // Drag & Drop handlers
        ['dragenter', 'dragover'].forEach(name => {
            uploadDropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            uploadDropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.remove('dragover');
            });
        });

        uploadDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files) handleFilesSelect(dt.files);
        });
    }

    // Add preset photo button
    if (btnAddPresetImg && itemImagePreset) {
        btnAddPresetImg.addEventListener('click', () => {
            const val = itemImagePreset.value;
            if (!val) {
                showToast('Please choose a preset photo first.', 'warning');
                return;
            }
            if (currentModalImages.length === 1 && currentModalImages[0] === DEFAULT_ITEM_IMG) {
                currentModalImages = [val];
            } else if (!currentModalImages.includes(val)) {
                currentModalImages.push(val);
            } else {
                showToast('This photo is already added.', 'info');
                return;
            }
            renderGalleryManager();
            showToast('🎂 Bakery preset photo added!', 'success');
        });
    }

    // Add direct URL photo button
    if (btnAddUrlImg && itemUrlInput) {
        btnAddUrlImg.addEventListener('click', () => {
            const val = itemUrlInput.value.trim();
            if (!val) {
                showToast('Please enter an image URL.', 'warning');
                return;
            }
            if (currentModalImages.length === 1 && currentModalImages[0] === DEFAULT_ITEM_IMG) {
                currentModalImages = [val];
            } else {
                currentModalImages.push(val);
            }
            itemUrlInput.value = '';
            renderGalleryManager();
            showToast('🔗 Image URL added to photos!', 'success');
        });
    }

    async function openMenuModal(item = null) {
        menuItemForm.reset();
        
        // Populate category dropdown dynamically from database
        const categories = await db.getCategories();
        const catSelect = document.getElementById('itemInputCategory');
        catSelect.innerHTML = categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');

        if (item) {
            document.getElementById('menuModalTitle').textContent = 'Edit Bakery Delight';
            document.getElementById('menuItemId').value = item.id;
            document.getElementById('itemInputName').value = item.name;
            if (item.category) catSelect.value = item.category;
            document.getElementById('itemInputPrice').value = item.price;
            document.getElementById('itemInputDesc').value = item.desc || '';
            document.getElementById('itemInputBadge').value = item.badge || '';
            document.getElementById('itemStockCheckbox').checked = item.isAvailable !== false;
            
            // Populate multiple images list
            const itemImgs = Array.isArray(item.images) && item.images.length > 0
                ? [...item.images]
                : (item.img ? [item.img] : [DEFAULT_ITEM_IMG]);
            currentModalImages = itemImgs;
            renderGalleryManager();
            setImageMode('upload');
        } else {
            document.getElementById('menuModalTitle').textContent = 'Add Bakery Delight';
            document.getElementById('menuItemId').value = '';
            if (categories.length > 0) catSelect.value = categories[0].name;
            document.getElementById('itemStockCheckbox').checked = true;
            
            currentModalImages = [DEFAULT_ITEM_IMG];
            renderGalleryManager();
            setImageMode('upload');
            if (itemImagePreset) itemImagePreset.value = '';
            if (itemUrlInput) itemUrlInput.value = '';
        }
        menuItemModal.classList.add('open');
    }

    function closeMenuModal() {
        menuItemModal.classList.remove('open');
    }

    openAddMenuItemBtn.addEventListener('click', () => openMenuModal());
    closeMenuModalBtn.addEventListener('click', closeMenuModal);
    cancelMenuModalBtn.addEventListener('click', closeMenuModal);

    menuItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('menuItemId').value;
        const name = document.getElementById('itemInputName').value.trim();
        const category = document.getElementById('itemInputCategory').value;
        const price = Number(document.getElementById('itemInputPrice').value);
        const desc = document.getElementById('itemInputDesc').value.trim();
        const badge = document.getElementById('itemInputBadge').value.trim();
        const isAvailable = document.getElementById('itemStockCheckbox').checked;
        
        // Multi-image payload
        const images = currentModalImages.length > 0 ? [...currentModalImages] : [DEFAULT_ITEM_IMG];
        const img = images[0] || DEFAULT_ITEM_IMG;

        if (id) {
            await db.updateMenuItem(id, { name, category, price, desc, badge, isAvailable, img, images });
            showToast(`Updated "${name}" successfully!`, 'success');
        } else {
            await db.addMenuItem({ name, category, price, desc, badge, isAvailable, img, images });
            showToast(`Added "${name}" to the menu!`, 'success');
        }

        closeMenuModal();
        renderMenuItems();
        renderCategories();
        renderOverview();
    });

    // ----------------------------------------------------
    // 4B. Categories Management (Add / Remove / Modify)
    // ----------------------------------------------------
    const categoriesSearchInput = document.getElementById('categoriesSearchInput');
    const categoriesTableBody = document.getElementById('categoriesTableBody');
    const categoryModal = document.getElementById('categoryModal');
    const categoryForm = document.getElementById('categoryForm');
    const openAddCategoryBtn = document.getElementById('openAddCategoryBtn');
    const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
    const cancelCategoryModalBtn = document.getElementById('cancelCategoryModalBtn');

    async function renderCategories() {
        const categories = await db.getCategories();
        const query = (categoriesSearchInput?.value || '').toLowerCase().trim();

        // Update badge
        const catBadge = document.getElementById('categoriesCountBadge');
        if (catBadge) catBadge.textContent = categories.length;

        const filtered = categories.filter(c => {
            return !query ||
                c.name.toLowerCase().includes(query) ||
                (c.desc || '').toLowerCase().includes(query);
        });

        if (!categoriesTableBody) return;

        if (filtered.length === 0) {
            categoriesTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-state-icon">🏷️</div>
                            <h3>No categories found</h3>
                            <p>Add a new category to organize your bakery items.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        categoriesTableBody.innerHTML = filtered.map(cat => {
            const itemCount = cat.itemCount || 0;
            return `
                <tr>
                    <td>
                        <strong style="font-size: 1.05rem; color: var(--accent-dark);">${escapeHtml(cat.name)}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-light);">ID: ${cat.id}</div>
                    </td>
                    <td>
                        <span style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(cat.desc || '—')}</span>
                    </td>
                    <td>
                        <span class="pill pill-neutral">${itemCount} treat${itemCount === 1 ? '' : 's'}</span>
                    </td>
                    <td>
                        <span style="font-weight: 600; color: var(--text-main);">${cat.displayOrder || 1}</span>
                    </td>
                    <td>
                        <div class="row-actions">
                            <button class="btn-icon-action btn-edit-category" data-id="${cat.id}" title="Edit Category">
                                ✏️
                            </button>
                            <button class="btn-icon-action btn-icon-delete btn-delete-category" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" data-count="${itemCount}" title="Delete Category">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach edit buttons
        categoriesTableBody.querySelectorAll('.btn-edit-category').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const cat = await db.getCategory(id);
                if (cat) openCategoryModal(cat);
            });
        });

        // Attach delete buttons
        categoriesTableBody.querySelectorAll('.btn-delete-category').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const count = parseInt(btn.getAttribute('data-count') || '0', 10);

                const warningMsg = count > 0
                    ? `Category "${name}" contains ${count} items. Deleting it will reassign these items to 'General'. Continue?`
                    : `Are you sure you want to delete category "${name}"?`;

                if (confirm(warningMsg)) {
                    await db.deleteCategory(id);
                    showToast(`Category "${name}" deleted.`, 'info');
                    renderCategories();
                    renderMenuItems();
                    renderOverview();
                }
            });
        });
    }

    if (categoriesSearchInput) {
        categoriesSearchInput.addEventListener('input', () => renderCategories());
    }

    function openCategoryModal(cat = null) {
        categoryForm.reset();
        if (cat) {
            document.getElementById('categoryModalTitle').textContent = 'Edit Bakery Category';
            document.getElementById('categoryId').value = cat.id;
            document.getElementById('categoryNameInput').value = cat.name;
            document.getElementById('categoryDescInput').value = cat.desc || '';
            document.getElementById('categoryOrderInput').value = cat.displayOrder || 1;
        } else {
            document.getElementById('categoryModalTitle').textContent = 'Add Bakery Category';
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryOrderInput').value = '';
        }
        categoryModal.classList.add('open');
    }

    function closeCategoryModal() {
        categoryModal.classList.remove('open');
    }

    if (openAddCategoryBtn) openAddCategoryBtn.addEventListener('click', () => openCategoryModal());
    if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    if (cancelCategoryModalBtn) cancelCategoryModalBtn.addEventListener('click', closeCategoryModal);

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('categoryId').value;
            const name = document.getElementById('categoryNameInput').value.trim();
            const desc = document.getElementById('categoryDescInput').value.trim();
            const displayOrder = Number(document.getElementById('categoryOrderInput').value) || 1;

            if (id) {
                await db.updateCategory(id, { name, desc, displayOrder });
                showToast(`Category "${name}" updated successfully!`, 'success');
            } else {
                await db.addCategory({ name, desc, displayOrder });
                showToast(`Category "${name}" created!`, 'success');
            }

            closeCategoryModal();
            renderCategories();
            renderMenuItems();
            renderOverview();
        });
    }

    // ----------------------------------------------------
    // 5. Orders Management
    // ----------------------------------------------------
    const ordersSearchInput = document.getElementById('ordersSearchInput');
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const orderDetailsContent = document.getElementById('orderDetailsContent');
    const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
    const dismissOrderModalBtn = document.getElementById('dismissOrderModalBtn');

    async function renderOrders() {
        const orders = await db.getOrders();
        const query = (ordersSearchInput.value || '').toLowerCase().trim();
        const status = orderStatusFilter.value;

        const filtered = orders.filter(o => {
            const matchesStatus = status === 'ALL' || o.status === status;
            const matchesQuery = !query ||
                o.id.toLowerCase().includes(query) ||
                (o.customerName || '').toLowerCase().includes(query) ||
                (o.customerEmail || '').toLowerCase().includes(query) ||
                (o.orderText || '').toLowerCase().includes(query);
            return matchesStatus && matchesQuery;
        });

        if (filtered.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <div class="empty-state-icon">🛍️</div>
                            <h3>No orders match your filter</h3>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        ordersTableBody.innerHTML = filtered.map(o => {
            const dateStr = new Date(o.createdAt).toLocaleDateString('en-IN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const hasPhoto = !!o.referencePhoto;

            return `
                <tr>
                    <td><strong>#${o.id.replace('ord_', '')}</strong></td>
                    <td>
                        <div style="font-weight: 600;">${escapeHtml(o.customerName || 'Customer')}</div>
                        <div style="font-size: 0.8rem; color: var(--text-light);">${escapeHtml(o.customerEmail || 'N/A')}</div>
                    </td>
                    <td>
                        <div style="max-width: 240px; font-size: 0.85rem; color: var(--text-main); white-space: pre-line; max-height: 44px; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(o.orderText || 'Direct checkout')}
                        </div>
                        ${hasPhoto ? `
                            <div style="margin-top: 0.35rem;">
                                <span class="pill pill-success btn-photo-badge" data-id="${o.id}" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; padding: 0.2rem 0.55rem;" title="Click to view & download photo">
                                    📸 Photo Attached · 📥 Download
                                </span>
                            </div>
                        ` : ''}
                    </td>
                    <td><span class="pill pill-neutral">${escapeHtml(o.channel || 'Direct')}</span></td>
                    <td><strong>₹${o.total || 0}</strong></td>
                    <td>
                        <select class="filter-select order-status-select" data-id="${o.id}" style="padding: 0.35rem 0.75rem; font-size: 0.82rem;">
                            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                            <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>👩‍🍳 Preparing</option>
                            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                        </select>
                    </td>
                    <td style="color: var(--text-light); font-size: 0.82rem;">${dateStr}</td>
                    <td>
                        <div class="row-actions">
                            ${hasPhoto ? `
                                <button class="btn-icon-action btn-quick-download-photo" data-id="${o.id}" title="Download Reference Photo">
                                    📥
                                </button>
                            ` : ''}
                            <button class="btn-icon-action btn-view-order" data-id="${o.id}" title="View Order Details">
                                👁️
                            </button>
                            <button class="btn-icon-action btn-icon-delete btn-delete-order" data-id="${o.id}" title="Delete Order">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Helper to trigger photo download
        function downloadOrderReferencePhoto(order) {
            if (!order || !order.referencePhoto) {
                showToast('No reference photo attached to this order.', 'warning');
                return;
            }
            const a = document.createElement('a');
            a.href = order.referencePhoto;
            const cleanId = order.id.replace('ord_', '');
            a.download = `crustora_order_${cleanId}_inspiration.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast(`📥 Reference photo for Order #${cleanId} downloaded!`, 'success');
        }

        // Quick download buttons from table row
        ordersTableBody.querySelectorAll('.btn-quick-download-photo').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const order = await db.getOrder(id);
                if (order) downloadOrderReferencePhoto(order);
            });
        });

        // Photo badge click in table row
        ordersTableBody.querySelectorAll('.btn-photo-badge').forEach(badge => {
            badge.addEventListener('click', async () => {
                const id = badge.getAttribute('data-id');
                const order = await db.getOrder(id);
                if (order) openOrderDetailsModal(order);
            });
        });

        // Attach status change dropdowns
        ordersTableBody.querySelectorAll('.order-status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const id = sel.getAttribute('data-id');
                const newStatus = sel.value;
                await db.updateOrderStatus(id, newStatus);
                showToast(`Order status updated to ${newStatus}.`, 'success');
                renderOrders();
                renderOverview();
            });
        });

        // View Order Details Modal
        ordersTableBody.querySelectorAll('.btn-view-order').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const order = await db.getOrder(id);
                if (order) openOrderDetailsModal(order);
            });
        });

        // Delete Order
        ordersTableBody.querySelectorAll('.btn-delete-order').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete order #${id}?`)) {
                    await db.deleteOrder(id);
                    showToast('Order record deleted.', 'info');
                    renderOrders();
                    renderOverview();
                }
            });
        });
    }

    ordersSearchInput.addEventListener('input', () => renderOrders());
    orderStatusFilter.addEventListener('change', () => renderOrders());

    function openOrderDetailsModal(order) {
        const dateStr = new Date(order.createdAt).toLocaleString('en-IN');
        const hasPhoto = !!order.referencePhoto;

        orderDetailsContent.innerHTML = `
            <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--primary-border); padding-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4 style="font-size: 1.15rem; color: var(--accent-dark);">Order #${order.id}</h4>
                    <span class="pill pill-neutral">${escapeHtml(order.channel || 'Direct')}</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted);">
                    <strong>Customer:</strong> ${escapeHtml(order.customerName)} (${escapeHtml(order.customerEmail)})
                </div>
                <div style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.25rem;">
                    <strong>Placed on:</strong> ${dateStr}
                </div>
            </div>

            ${hasPhoto ? `
                <!-- Customer Reference Photo Card -->
                <div class="order-ref-photo-card" style="margin-bottom: 1.25rem; background: #fff5f9; border: 1.5px solid rgba(244, 114, 182, 0.4); border-radius: var(--radius-md); padding: 1.15rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <span style="font-weight: 700; color: var(--accent-dark); font-size: 0.95rem;">📸 Customer Reference Photo / Inspiration</span>
                        <span class="pill pill-success" style="font-size: 0.72rem;">Stored in System</span>
                    </div>
                    <div style="display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap;">
                        <a href="${escapeHtml(order.referencePhoto)}" target="_blank" title="Click to view full image" style="display: block; width: 110px; height: 110px; border-radius: 10px; overflow: hidden; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(219,39,119,0.18); flex-shrink: 0; background: #fff;">
                            <img src="${escapeHtml(order.referencePhoto)}" alt="Inspiration Preview" style="width: 100%; height: 100%; object-fit: cover;">
                        </a>
                        <div style="flex: 1; min-width: 190px;">
                            <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 0.75rem; line-height: 1.45;">
                                The customer uploaded this reference photo with their custom order. You can download it directly to your device or view it in high resolution.
                            </p>
                            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                                <button type="button" class="btn-download-modal-photo" style="padding: 0.5rem 1rem; background: var(--accent-gradient); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(219,39,119,0.25);">
                                    <span>📥 Download Reference Photo</span>
                                </button>
                                <button type="button" class="btn-open-full-photo" style="padding: 0.5rem 0.9rem; background: #fff; color: var(--text-main); border: 1px solid var(--primary-border); border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
                                    <span>🔍 View Full Size</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div style="margin-bottom: 1rem;">
                <h5 style="margin-bottom: 0.5rem; color: var(--text-main); font-size: 0.95rem;">Order Text / Items:</h5>
                <pre style="background: #fff4f8; padding: 1rem; border-radius: var(--radius-sm); font-family: var(--font-body); white-space: pre-wrap; font-size: 0.9rem; border: 1px solid var(--primary-border); color: var(--text-main);">${escapeHtml(order.orderText || 'No detailed text recorded.')}</pre>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 0.75rem 1rem; border-radius: var(--radius-sm);">
                <span>Total Amount:</span>
                <strong style="font-size: 1.25rem; color: var(--accent-dark);">₹${order.total || 0}</strong>
            </div>
        `;

        if (hasPhoto) {
            const dlBtn = orderDetailsContent.querySelector('.btn-download-modal-photo');
            const viewBtn = orderDetailsContent.querySelector('.btn-open-full-photo');

            if (dlBtn) {
                dlBtn.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = order.referencePhoto;
                    const cleanId = order.id.replace('ord_', '');
                    a.download = `crustora_order_${cleanId}_inspiration.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    showToast(`📥 Reference photo for Order #${cleanId} downloaded!`, 'success');
                });
            }

            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    window.open(order.referencePhoto, '_blank');
                });
            }
        }

        orderDetailsModal.classList.add('open');
    }

    closeOrderModalBtn.addEventListener('click', () => orderDetailsModal.classList.remove('open'));
    dismissOrderModalBtn.addEventListener('click', () => orderDetailsModal.classList.remove('open'));

    // ----------------------------------------------------
    // 7. Settings, Backup, Restore & Reset
    // ----------------------------------------------------
    const changePinForm = document.getElementById('changePinForm');
    const newAdminPin = document.getElementById('newAdminPin');
    const exportDatabaseBtn = document.getElementById('exportDatabaseBtn');
    const triggerImportBtn = document.getElementById('triggerImportBtn');
    const importDatabaseInput = document.getElementById('importDatabaseInput');
    const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');

    changePinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = newAdminPin.value.trim();
        if (pin.length < 4) {
            showToast('PIN must be at least 4 characters long.', 'warning');
            return;
        }
        await db.updateSettings({ adminPin: pin });
        newAdminPin.value = '';
        showToast('Admin Passcode updated successfully! 🔒', 'success');
    });

    exportDatabaseBtn.addEventListener('click', async () => {
        try {
            const jsonString = await db.exportDatabaseJSON();
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `crustora-bakery-db-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Database exported successfully as JSON file!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to export database.', 'error');
        }
    });

    triggerImportBtn.addEventListener('click', () => {
        importDatabaseInput.click();
    });

    importDatabaseInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target.result;
                await db.importDatabaseJSON(content);
                showToast('Database restored successfully from backup! 🎉', 'success');
                loadAllData();
            } catch (err) {
                showToast(`Restore failed: ${err.message}`, 'error');
            }
            importDatabaseInput.value = '';
        };
        reader.readAsText(file);
    });

    resetDefaultsBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all menu items and demo records back to factory defaults? This will erase custom additions.')) {
            await db.resetToDefaultData();
            showToast('Menu items and sample records restored to defaults! 🌸', 'success');
            loadAllData();
        }
    });

    // ----------------------------------------------------
    // 8. Reactive Event Listener & Loader
    // ----------------------------------------------------
    window.addEventListener('crustora_db_change', () => {
        loadAllData();
    });

    function loadAllData() {
        renderOverview();
        renderMenuItems();
        renderCategories();
        renderOrders();
    }

    // Helper: Escape HTML string
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Initialize Auth
    checkAuthStatus();
});
