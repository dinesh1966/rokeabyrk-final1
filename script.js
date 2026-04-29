// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyBQcdDPRCNgF7yfAJpqdH2EFriGKTdvMKA",
  authDomain: "rokeya-3ccaa.firebaseapp.com",
  projectId: "rokeya-3ccaa",
  storageBucket: "rokeya-3ccaa.firebasestorage.app",
  messagingSenderId: "474801043436",
  appId: "1:474801043436:web:e12c0bf29704e4319072c9",
  measurementId: "G-H1GBK81D1Z"
};

let db = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  if (typeof firebase.analytics === 'function') {
    firebase.analytics();
  }
  console.log("Firebase Connected to rokeya-3ccaa!");
}

// Initial Data
const defaultProducts = [
  ...Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Kanjivaram Silk Saree ${i + 1}`,
    category: 'sarees',
    price: 18000 + (Math.floor(Math.random() * 15) * 1000),
    image: i % 2 === 0 ? 'luxury_red_saree.png' : 'emerald_green_saree.png',
    imageHover: i % 2 === 0 ? 'emerald_green_saree.png' : 'luxury_red_saree.png',
    description: "Authentic hand-woven silk with gold zari.",
    stock: i % 8 === 0 ? 'Out of Stock' : 'In Stock'
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: i + 21,
    name: `Imperial Jewel Set ${i + 1}`,
    category: 'imitation',
    price: 4500 + (Math.floor(Math.random() * 20) * 500),
    image: 'temple_jewellery_set.png',
    imageHover: 'saforio_instagram_jewel_1.png',
    description: "Premium kemp stone traditional set.",
    stock: i % 10 === 0 ? 'Out of Stock' : 'In Stock'
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: i + 41,
    name: `Essence Minimal Link ${i + 1}`,
    category: 'minimalistic',
    price: 1500 + (Math.floor(Math.random() * 10) * 200),
    image: 'minimal_jewellery_piece.png',
    imageHover: 'temple_jewellery_set.png',
    description: "Lightweight contemporary design.",
    stock: 'In Stock'
  }))
];

let products = JSON.parse(localStorage.getItem('saforio_products')) || defaultProducts;

// Migration: Ensure all products have 'image', 'imageHover' and 'id'
products = products.map(p => ({
  ...p,
  id: p.id || Date.now() + Math.random(),
  image: p.image || p.img,
  imageHover: p.imageHover || p.imgHover || p.image || p.img
}));

let cart = JSON.parse(localStorage.getItem('saforio_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('saforio_wishlist')) || [];
let users = JSON.parse(localStorage.getItem('saforio_users')) || [];
let currentCategory = 'sarees';
let currentUser = JSON.parse(localStorage.getItem('saforio_currentUser')) || null;
let modalHistory = [];

function saveProducts() {
  localStorage.setItem('saforio_products', JSON.stringify(products));
  renderAll();
}

// --- FIRESTORE PRODUCT SYNC ---
async function loadProducts() {
  if (db) {
    try {
      const snapshot = await db.collection("products").get();
      if (!snapshot.empty) {
        const fsProducts = [];
        snapshot.forEach(doc => fsProducts.push(doc.data()));
        products = fsProducts;
        localStorage.setItem('saforio_products', JSON.stringify(products));
        renderAll();
      } else if (products.length > 0) {
        // If Firestore is empty but we have local products/defaults, upload them to initialize Firestore
        console.log("Initializing Firestore with products...");
        products.forEach(p => {
          db.collection("products").doc(p.id.toString()).set(p);
        });
      }
    } catch (err) {
      console.error("Firestore product load error:", err);
    }
  }
}

async function loadUsers() {
  if (db) {
    try {
      const snapshot = await db.collection("users").get();
      if (!snapshot.empty) {
        const fsUsers = [];
        snapshot.forEach(doc => fsUsers.push(doc.data()));
        users = fsUsers;
        localStorage.setItem('saforio_users', JSON.stringify(users));
      }
    } catch (err) {
      console.error("Firestore users load error:", err);
    }
  }
}

loadProducts();
loadUsers();

function saveUsers() {
  localStorage.setItem('saforio_users', JSON.stringify(users));
}

// --- CART & PAYMENT ---

function toggleCart() {
  const modal = document.getElementById('cartModal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
  document.body.classList.toggle('modal-open', modal.style.display === 'flex');
  renderCart();
}

window.toggleMobileMenu = () => {
  const menu = document.getElementById('mobileMenu');
  if (menu) {
    menu.classList.toggle('active');
    document.body.classList.toggle('modal-open', menu.classList.contains('active'));
  }
}

function addToCart(productId) {
  const p = products.find(prod => prod.id == productId);
  if (!p || p.stock === "Out of Stock") return;
  cart.push(p);
  localStorage.setItem('saforio_cart', JSON.stringify(cart));
  updateCartIcon();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem('saforio_cart', JSON.stringify(cart));
  renderCart();
  updateCartIcon();
}

function updateCartIcon() {
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.innerText = cart.length;
}

// --- WISHLIST LOGIC ---

function toggleWishlist() {
  const modal = document.getElementById('wishlistModal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
  document.body.classList.toggle('modal-open', modal.style.display === 'flex');
  renderWishlist();
}

function addToWishlist(productId) {
  if (!currentUser) { openAuth(); return; }
  const index = wishlist.findIndex(p => p.id == productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    const p = products.find(prod => prod.id == productId);
    if (p) wishlist.push(p);
  }
  localStorage.setItem('saforio_wishlist', JSON.stringify(wishlist));
  updateWishlistIcon();
  renderGrid();
}

function removeFromWishlist(index) {
  wishlist.splice(index, 1);
  localStorage.setItem('saforio_wishlist', JSON.stringify(wishlist));
  updateWishlistIcon();
  renderWishlist();
  renderGrid();
}

function updateWishlistIcon() {
  const countEl = document.getElementById('wish-count');
  if (countEl) countEl.innerText = wishlist.length;
}

function renderWishlist() {
  const list = document.getElementById('wishlist-items');
  if (!list) return;
  list.innerHTML = '';
  if (wishlist.length === 0) {
    list.innerHTML = '<div style="text-align:center; margin-top: 40px; color: #888;">Your wishlist is empty. ✿</div>';
  }
  wishlist.forEach((item, index) => {
    list.innerHTML += `
      <div class="cart-item">
        <img src="${item.image || item.img}" style="width:50px">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price}</div>
          <button class="btn-primary" style="margin-top:5px; font-size:9px; padding:6px 10px;" onclick="wishToCart(${index})">Move to Cart</button>
        </div>
        <button class="btn-remove" onclick="removeFromWishlist(${index})">&times;</button>
      </div>`;
  });
}

function wishToCart(index) {
  const p = wishlist[index];
  addToCart(p.id);
  wishlist.splice(index, 1);
  localStorage.setItem('saforio_wishlist', JSON.stringify(wishlist));
  updateWishlistIcon();
  renderWishlist();
  renderGrid();
}

function moveAllToCart() {
  if (wishlist.length === 0) return alert("Wishlist is empty!");
  wishlist.forEach(p => addToCart(p.id));
  wishlist = [];
  localStorage.setItem('saforio_wishlist', JSON.stringify(wishlist));
  updateWishlistIcon();
  renderWishlist();
  renderGrid();
  toggleWishlist();
  toggleCart();
}

function renderCart() {
  const list = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!list) return;
  list.innerHTML = '';
  let total = 0;
  cart.forEach((item, index) => {
    total += parseInt(item.price);
    list.innerHTML += `
      <div class="cart-item">
        <img src="${item.image || item.img}" style="width:50px">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price}</div>
        </div>
        <button class="btn-remove" onclick="removeFromCart(${index})">&times;</button>
      </div>`;
  });
  if (totalEl) totalEl.innerText = `₹${total}`;
}

function openCheckout() {
  if (cart.length === 0) { alert("Your cart is empty!"); return; }
  document.getElementById('cartModal').style.display = 'none';
  document.getElementById('checkoutModal').style.display = 'flex';
}

function closeCheckout() {
  document.getElementById('checkoutModal').style.display = 'none';
}

function handleOrder(e) {
  e.preventDefault();
  const name = document.getElementById('orderName').value;
  const phone = document.getElementById('orderPhone').value;
  const address = document.getElementById('orderAddress').value;
  let totalAmount = cart.reduce((sum, item) => sum + parseInt(item.price), 0);

  const options = {
    "key": "rzp_live_SEMSm8iPbUKAu9",
    "amount": totalAmount * 100,
    "currency": "INR",
    "name": "ROKEA by RK Boutique",
    "description": "Payment for " + name,
    "handler": function (response) {
      alert("Payment Successful! ID: " + response.razorpay_payment_id);

      const orderData = {
        items: cart,
        total: totalAmount,
        customer: { name, phone, address },
        paymentId: response.razorpay_payment_id,
        date: new Date().toISOString()
      };

      // Save to localStorage
      const orders = JSON.parse(localStorage.getItem('saforio_orders')) || [];
      orders.push({ id: Date.now(), ...orderData, date: new Date().toLocaleDateString() });
      localStorage.setItem('saforio_orders', JSON.stringify(orders));

      // Save to Firebase Firestore
      if (db) {
        db.collection("orders").add(orderData)
          .then(() => console.log("Order saved to Firestore!"))
          .catch((error) => console.error("Firestore order error:", error));
      }

      cart = [];
      localStorage.removeItem('saforio_cart');
      updateCartIcon();
      closeCheckout();
    },
    "prefill": { "name": name, "contact": phone },
    "theme": { "color": "#C9A84C" }
  };

  const rzp1 = new Razorpay(options);
  rzp1.on('payment.failed', function (response) {
    alert("Payment Failed! Reason: " + response.error.description);
  });
  rzp1.open();
}

// AUTH LOGIC
const authModal = document.getElementById('authModal');
const loginView = document.getElementById('loginView');
const regView = document.getElementById('registerView');

window.openAuth = () => {
  if (authModal) { authModal.style.display = 'flex'; document.body.classList.add('modal-open'); }
}
window.closeAuth = () => {
  if (authModal) { authModal.style.display = 'none'; document.body.classList.remove('modal-open'); }
}
window.toggleAuth = (showLogin) => {
  if (loginView) loginView.style.display = showLogin ? 'block' : 'none';
  if (regView) regView.style.display = showLogin ? 'none' : 'block';
}

window.handleRegister = () => {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value;
  const pass = document.getElementById('regPass').value;
  if (!name || !email || !pass) return alert('Fill all fields');

  const userData = { name, email, phone, pass, date: new Date().toISOString() };

  // Save to localStorage
  users.push({ ...userData, date: new Date().toLocaleDateString() });
  saveUsers();

  // Save to Firestore
  if (db) {
    db.collection("users").add(userData)
      .then(() => console.log("User saved to Firestore!"))
      .catch(err => console.error("Firestore user error:", err));
  }

  alert('Account created! Please login.');
  toggleAuth(true);
}

window.handleAuth = () => {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;

  if (email === 'admin' && pass === 'admin@123') {
    closeAuth();
    document.getElementById('adminModal').style.display = 'flex';
    renderAll();
    return;
  }

  const user = users.find(u => u.email === email && u.pass === pass);
  if (user) {
    currentUser = user;
    localStorage.setItem('saforio_currentUser', JSON.stringify(user));
    updateUserUI();
    closeAuth();
  } else {
    alert('Invalid credentials');
  }
}

function updateUserUI() {
  const link = document.getElementById('userLinkCont');
  if (currentUser && link) {
    link.innerHTML = `<span style="font-size:10px;color:var(--gold);margin-right:15px">HELLO, ${currentUser.name.split(' ')[0].toUpperCase()}</span><a href="javascript:void(0)" onclick="logoutUser()">Logout</a>`;
  }
}

window.logoutUser = () => {
  localStorage.removeItem('saforio_currentUser');
  location.reload();
}

window.toggleAdminMenu = (forceClose = false) => {
  if (window.innerWidth > 1024) return;
  const navLinks = document.querySelector('.admin-nav-links');
  const toggleBtn = document.querySelector('.admin-menu-toggle');
  if (!navLinks || !toggleBtn) return;

  if (forceClose) {
    navLinks.classList.remove('active');
    toggleBtn.classList.remove('active');
  } else {
    navLinks.classList.toggle('active');
    toggleBtn.classList.toggle('active');
  }
}


// =============================================
// ADMIN DASHBOARD TABS
// =============================================

window.switchAdminTab = (tab) => {
  document.getElementById('viewProducts').style.display = tab === 'products' ? 'block' : 'none';
  document.getElementById('viewCustomers').style.display = tab === 'customers' ? 'block' : 'none';
  document.getElementById('viewLeads').style.display = tab === 'leads' ? 'block' : 'none';
  document.getElementById('viewOrders').style.display = tab === 'orders' ? 'block' : 'none';

  document.getElementById('tabProducts').classList.toggle('active', tab === 'products');
  document.getElementById('tabCustomers').classList.toggle('active', tab === 'customers');
  document.getElementById('tabLeads').classList.toggle('active', tab === 'leads');
  document.getElementById('tabOrders').classList.toggle('active', tab === 'orders');

  const titleEl = document.getElementById('adminTabTitle');
  if (tab === 'products') titleEl.innerText = 'Product Management';
  else if (tab === 'customers') titleEl.innerText = 'Customer Records';
  else if (tab === 'leads') titleEl.innerText = 'Consultation Leads';
  else titleEl.innerText = 'Order & Payment History';

  document.getElementById('addBtnTop').style.display = tab === 'products' ? 'block' : 'none';

  if (tab === 'customers') renderAdminCustomers();
  if (tab === 'leads') renderAdminLeads();
  if (tab === 'orders') renderAdminOrders();

  // Auto-close menu on mobile after switching tab
  window.toggleAdminMenu(true);
}

// =============================================
// ADMIN: LEADS — Firestore + localStorage fallback
// =============================================

function renderAdminLeads() {
  const list = document.getElementById('adminLeadList');
  if (!list) return;

  // Show loading state
  list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Loading leads...</td></tr>';

  if (db) {
    db.collection("leads")
      .orderBy("date", "desc")
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--muted);">No leads captured yet.</td></tr>';
          return;
        }
        list.innerHTML = snapshot.docs.map((doc) => {
          const l = doc.data();
          const dateStr = l.date ? new Date(l.date).toLocaleDateString('en-IN') : 'N/A';
          return `
            <tr>
              <td><strong>${l.name || 'N/A'}</strong></td>
              <td>${l.phone || 'N/A'}</td>
              <td><span class="badge" style="background:var(--ivory); padding:5px 10px; font-size:10px; border:1px solid var(--gold);">${l.interest || 'N/A'}</span></td>
              <td>${dateStr}</td>
              <td><button class="admin-btn btn-delete" onclick="deleteFirebaseLead('${doc.id}')">Delete</button></td>
            </tr>`;
        }).join('');
      })
      .catch((err) => {
        console.error("Firestore leads fetch error:", err);
        renderAdminLeadsLocal(); // fallback
      });
  } else {
    renderAdminLeadsLocal();
  }
}

function renderAdminLeadsLocal() {
  const list = document.getElementById('adminLeadList');
  if (!list) return;
  const leads = JSON.parse(localStorage.getItem('saforio_leads')) || [];
  if (leads.length === 0) {
    list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--muted);">No leads captured yet.</td></tr>';
    return;
  }
  list.innerHTML = leads.map((l, idx) => `
    <tr>
      <td><strong>${l.name}</strong></td>
      <td>${l.phone}</td>
      <td><span class="badge" style="background:var(--ivory); padding:5px 10px; font-size:10px; border:1px solid var(--gold);">${l.interest}</span></td>
      <td>${l.date}</td>
      <td><button class="admin-btn btn-delete" onclick="deleteLocalLead(${idx})">Delete</button></td>
    </tr>`).join('');
}

window.deleteFirebaseLead = (docId) => {
  if (!confirm('Delete this lead?')) return;
  db.collection("leads").doc(docId).delete()
    .then(() => { console.log("Lead deleted from Firestore"); renderAdminLeads(); })
    .catch(err => console.error("Delete lead error:", err));
}

window.deleteLocalLead = (idx) => {
  if (!confirm('Delete this lead record?')) return;
  const leads = JSON.parse(localStorage.getItem('saforio_leads')) || [];
  leads.splice(idx, 1);
  localStorage.setItem('saforio_leads', JSON.stringify(leads));
  renderAdminLeadsLocal();
}

// Legacy alias
window.deleteLead = window.deleteLocalLead;

// =============================================
// ADMIN: CUSTOMERS — Firestore + localStorage fallback
// =============================================

function renderAdminCustomers() {
  const list = document.getElementById('adminCustomerList');
  if (!list) return;

  list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--muted);">Loading customers...</td></tr>';

  if (db) {
    db.collection("users")
      .orderBy("date", "desc")
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);">No customers registered yet.</td></tr>';
          return;
        }
        list.innerHTML = snapshot.docs.map((doc) => {
          const u = doc.data();
          const dateStr = u.date ? new Date(u.date).toLocaleDateString('en-IN') : 'N/A';
          return `
            <tr>
              <td><strong>${u.name || 'N/A'}</strong></td>
              <td>${u.email || 'N/A'}</td>
              <td>${u.phone || 'N/A'}</td>
              <td>${dateStr}</td>
            </tr>`;
        }).join('');
      })
      .catch((err) => {
        console.error("Firestore customers fetch error:", err);
        renderAdminCustomersLocal(); // fallback
      });
  } else {
    renderAdminCustomersLocal();
  }
}

function renderAdminCustomersLocal() {
  const list = document.getElementById('adminCustomerList');
  if (!list) return;
  if (users.length === 0) {
    list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);">No customers yet.</td></tr>';
    return;
  }
  list.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>${u.date}</td>
    </tr>`).join('');
}

// =============================================
// ADMIN: ORDERS — Firestore + localStorage fallback
// =============================================

function renderAdminOrders() {
  const list = document.getElementById('adminOrderList');
  if (!list) return;

  list.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">Loading orders...</td></tr>';

  if (db) {
    db.collection("orders")
      .orderBy("date", "desc")
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          list.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">No orders found.</td></tr>';
          return;
        }
        list.innerHTML = snapshot.docs.map((doc) => {
          const o = doc.data();
          const dateStr = o.date ? new Date(o.date).toLocaleDateString('en-IN') : 'N/A';
          const itemNames = (o.items || []).map(i => i.name).join(', ');
          const shortId = doc.id.slice(0, 8).toUpperCase();
          return `
            <tr>
              <td><strong>#${shortId}</strong></td>
              <td>${o.customer?.name || 'N/A'}</td>
              <td>${o.customer?.phone || 'N/A'}</td>
              <td>₹${(o.total || 0).toLocaleString('en-IN')}</td>
              <td><span class="badge" style="background:var(--ivory); padding:5px 10px; font-size:10px; border:1px solid var(--gold);">${o.paymentId || 'N/A'}</span></td>
              <td>${dateStr}</td>
              <td>
                <button class="admin-btn btn-edit" onclick="alert('Items:\\n\\n${itemNames.replace(/'/g, "\\'")}')">View Items</button>
              </td>
            </tr>`;
        }).join('');
      })
      .catch((err) => {
        console.error("Firestore orders fetch error:", err);
        renderAdminOrdersLocal(); // fallback
      });
  } else {
    renderAdminOrdersLocal();
  }
}

function renderAdminOrdersLocal() {
  const list = document.getElementById('adminOrderList');
  const orders = JSON.parse(localStorage.getItem('saforio_orders')) || [];
  if (orders.length === 0) {
    list.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">No orders found.</td></tr>';
    return;
  }
  list.innerHTML = orders.map((o) => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${o.customer.name}</td>
      <td>${o.customer.phone}</td>
      <td>₹${o.total.toLocaleString()}</td>
      <td><span class="badge" style="background:var(--ivory); padding:5px 10px; font-size:10px; border:1px solid var(--gold);">${o.paymentId || 'N/A'}</span></td>
      <td>${o.date}</td>
      <td><button class="admin-btn btn-edit" onclick="viewOrderItems(${o.id})">View Items</button></td>
    </tr>`).join('');
}

window.viewOrderItems = (orderId) => {
  const orders = JSON.parse(localStorage.getItem('saforio_orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (order) {
    const itemNames = order.items.map(item => item.name).join('\n');
    alert(`Items for Order #${order.id}:\n\n${itemNames}`);
  }
}

// =============================================
// PRODUCT GRID
// =============================================

function renderGrid() {
  const grid = document.getElementById('main-product-grid');
  if (!grid) return;
  const filtered = products.filter(p => p.category === currentCategory);
  grid.innerHTML = filtered.map((p) => {
    const inWishlist = wishlist.find(w => w.id == p.id);
    return `
    <div class="product-card" style="animation: fadeInUp 0.5s ease forwards; display: flex; flex-direction: column; height: 100%;" onclick="openProductDetail(${p.id})">
      <div class="product-img ${p.stock === 'Out of Stock' ? 'out-of-stock' : ''}">
        <img src="${p.image || p.img}" alt="${p.name}" class="img-main">
        <img src="${p.imageHover || p.imgHover || p.image || p.img}" class="img-hover" alt="${p.name}">
        <div class="product-wish ${inWishlist ? 'active' : ''}" onclick="event.stopPropagation(); addToWishlist(${p.id})">
          ${inWishlist ? '♥' : '♡'}
        </div>
      </div>
      <div class="product-info" style="display: flex; flex-direction: column; flex-grow: 1;">
        <div class="product-type">${p.category.toUpperCase()}</div>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-price"><span class="price-main">₹${p.price}</span></div>
        <button class="btn-primary" style="margin-top: auto; width:100%; font-size:10px; padding:10px;" onclick="event.stopPropagation(); addToCart(${p.id})" ${p.stock === "Out of Stock" ? 'disabled' : ''}>
          ${p.stock === "Out of Stock" ? 'Sold Out' : 'Add to Cart'}
        </button>
      </div>
    </div>`;
  }).join('');
}

window.switchCategory = (cat) => {
  currentCategory = cat;
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.cat === cat);
  });
  renderGrid();
}

function renderAdminList() {
  const list = document.getElementById('adminProductList');
  if (!list) return;
  list.innerHTML = products.map((p, idx) => `
    <div class="admin-item">
      <div class="admin-img" style="width:40px;height:40px;border-radius:4px;flex-shrink:0; background:url('${p.image || p.img}') center/cover"></div>
      <div class="admin-item-info">
        <div style="font-size:12px; font-weight:600;">${p.name}</div>
        <div style="font-size:10px; color:var(--muted)">${p.category} • ₹${p.price.toLocaleString()} • ${p.stock.toUpperCase()}</div>
      </div>
      <div class="admin-item-actions">
        <button class="admin-btn btn-edit" onclick="editProduct(${idx})">Edit</button>
        <button class="admin-btn btn-delete" onclick="deleteProduct(${idx})">Delete</button>
      </div>
    </div>`).join('');
}

function renderAll() {
  renderGrid();
  renderAdminList();
}

const adminModal = document.getElementById('adminModal');
const productForm = document.getElementById('productForm');

if (productForm) {
  productForm.onsubmit = (e) => {
    e.preventDefault();
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const newProd = {
      name: document.getElementById('prodName').value,
      category: document.getElementById('prodCategory').value,
      price: parseInt(document.getElementById('prodPrice').value),
      image: document.getElementById('prodImg').value,
      imageHover: document.getElementById('prodImgHover').value,
      extraImages: document.getElementById('prodExtraImgs') ? document.getElementById('prodExtraImgs').value.split(',').map(s => s.trim()).filter(Boolean) : [],
      stock: document.getElementById('prodStock').value,
      description: document.getElementById('prodDesc').value
    };
    if (editIndex > -1) {
      newProd.id = products[editIndex].id;
      products[editIndex] = newProd;
    } else {
      newProd.id = Date.now();
      products.unshift(newProd);
    }

    // Sync to Firestore
    if (db) {
      db.collection("products").doc(newProd.id.toString()).set(newProd)
        .then(() => console.log("Product synced to Cloud"))
        .catch(err => console.error("Cloud sync error:", err));
    }

    saveProducts();
    currentCategory = newProd.category;
    switchCategory(currentCategory);
    productForm.reset();
    document.getElementById('editIndex').value = "-1";
    document.getElementById('submitBtn').innerText = "Save Product";
    alert("Successfully Saved: " + newProd.name);
  };
}

window.editProduct = (idx) => {
  const p = products[idx];
  document.getElementById('editIndex').value = idx;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodImg').value = p.image || p.img;
  document.getElementById('prodImgHover').value = p.imageHover || p.imgHover || p.image || p.img;
  if (document.getElementById('prodExtraImgs')) document.getElementById('prodExtraImgs').value = p.extraImages ? p.extraImages.join(', ') : "";
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodDesc').value = p.description || "";
  document.getElementById('submitBtn').innerText = "Update Product";
  if (adminModal) adminModal.querySelector('.admin-main').scrollTop = 0;
};

window.deleteProduct = (idx) => {
  if (confirm('Delete this product permanently?')) {
    const p = products[idx];
    products.splice(idx, 1);
    saveProducts();
    if (db && p.id) {
      db.collection("products").doc(p.id.toString()).delete()
        .then(() => console.log("Product deleted from cloud"))
        .catch(err => console.error("Cloud delete error:", err));
    }
  }
};

// Full Story Logic
const storyModal = document.getElementById('storyModal');
window.openFullStory = () => { if (storyModal) storyModal.style.display = 'flex'; }
window.closeFullStory = () => { if (storyModal) storyModal.style.display = 'none'; }

// Close modals on background click
window.onclick = (e) => {
  if (e.target === adminModal) return;
  if (e.target === authModal) closeAuth();
  if (e.target === storyModal) closeFullStory();
  if (e.target === document.getElementById('leadModal')) closeLeadModal();
  if (e.target === document.getElementById('productDetailModal')) closeProductDetail();
}

// PRODUCT DETAIL LOGIC
window.openProductDetail = (productId, fromBack = false) => {
  const p = products.find(prod => prod.id == productId);
  if (!p) return;

  const modal = document.getElementById('productDetailModal');
  const viewport = modal.querySelector('.modal-viewport');
  if (viewport) viewport.scrollTop = 0;

  if (!fromBack) {
    const currentId = document.getElementById('detailName').getAttribute('data-id');
    if (currentId && currentId != productId) modalHistory.push(currentId);
  }
  document.getElementById('detailName').setAttribute('data-id', productId);

  const backBtn = document.getElementById('detailPrevBtn');
  if (backBtn) backBtn.style.display = modalHistory.length > 0 ? 'inline' : 'none';

  const mainImg = document.getElementById('detailMainImg');
  const name = document.getElementById('detailName');
  const catBreadcrumb = document.getElementById('detailCategoryBreadcrumb');
  const nameBreadcrumb = document.getElementById('detailNameBreadcrumb');
  const price = document.getElementById('detailPrice');
  const desc = document.getElementById('detailDesc');
  const stock = document.getElementById('detailStockStatus');
  const btn = document.getElementById('detailAddToCartBtn');
  const buyBtn = document.getElementById('detailBuyNowBtn');
  const thumbs = document.getElementById('detailThumbnails');
  const qtyVal = document.getElementById('detailQtyVal');
  const qtyMinus = document.getElementById('detailQtyMinus');
  const qtyPlus = document.getElementById('detailQtyPlus');

  let currentQty = 1;
  if (qtyVal) qtyVal.innerText = currentQty;
  if (qtyMinus) qtyMinus.onclick = () => { if (currentQty > 1) { currentQty--; qtyVal.innerText = currentQty; } };
  if (qtyPlus) qtyPlus.onclick = () => { currentQty++; qtyVal.innerText = currentQty; };

  mainImg.src = p.image || p.img;
  name.innerText = p.name;
  if (catBreadcrumb) catBreadcrumb.innerText = p.category;
  if (nameBreadcrumb) nameBreadcrumb.innerText = p.name;
  price.innerText = `₹${p.price.toLocaleString()}`;
  desc.innerHTML = p.description ? p.description.replace(/\n/g, '<br>') : "An exquisite highlight of our premium collection, offering impeccable style and timeless elegance.";
  stock.innerText = p.stock === 'Out of Stock' ? 'Currently Unavailable' : 'Available for Immediate Dispatch';

  if (p.stock === 'Out of Stock') {
    btn.innerText = 'Sold Out'; btn.disabled = true; btn.style.opacity = '0.5';
    if (buyBtn) { buyBtn.disabled = true; buyBtn.style.opacity = '0.5'; }
  } else {
    btn.innerText = 'Add to Cart'; btn.disabled = false; btn.style.opacity = '1';
    if (buyBtn) { buyBtn.disabled = false; buyBtn.style.opacity = '1'; }

    btn.onclick = () => {
      for (let i = 0; i < currentQty; i++) cart.push(p);
      localStorage.setItem('saforio_cart', JSON.stringify(cart));
      updateCartIcon();
      closeProductDetail();
      toggleCart();
    };
    if (buyBtn) {
      buyBtn.onclick = () => {
        for (let i = 0; i < currentQty; i++) cart.push(p);
        localStorage.setItem('saforio_cart', JSON.stringify(cart));
        updateCartIcon();
        closeProductDetail();
        openCheckout();
      };
    }
  }

  const images = [p.image || p.img, p.imageHover || p.imgHover || p.image || p.img];
  if (p.extraImages) images.push(...p.extraImages);
  const uniqueImages = [...new Set(images)];
  thumbs.innerHTML = uniqueImages.map((img, i) => `
    <img src="${img}" style="width:100%; aspect-ratio:1; object-fit:cover; cursor:pointer; border:1.5px solid ${i === 0 ? '#000' : 'transparent'}; border-radius:4px;" class="thumb-item ${i === 0 ? 'active' : ''}" onclick="switchDetailImage(this, '${img}')">
  `).join('');

  renderRelatedProducts(p.category, p.id);
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function renderRelatedProducts(category, currentId) {
  const slider = document.getElementById('relatedSlider');
  if (!slider) return;
  // Fallback to all products if less than 5 related
  let related = products.filter(p => p.category === category && p.id != currentId);
  if (related.length < 5) related = products.filter(p => p.id != currentId);
  slider.innerHTML = related.map((p, idx) => `
    <div class="slider-item" onclick="openProductDetail(${p.id})" style="flex: 0 0 calc(20% - 12px); min-width: 190px; cursor: pointer; display: flex; flex-direction: column; background: #fff; border: 1px solid #eaeaea; border-radius: 6px; overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease;" onmouseover="this.style.boxShadow='0 8px 20px rgba(0,0,0,0.06)';" onmouseout="this.style.boxShadow='none';">
      <div style="position: relative; width: 100%; aspect-ratio: 4/5; background: #fafafa;">
         <img src="${p.imageHover || p.imgHover || p.image || p.img}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover;">
         <div style="position: absolute; top: 12px; left: 12px; border: 1px solid rgba(0,0,0,0.3); color: #222; padding: 4px 14px; font-size: 10px; border-radius: 20px; background: rgba(255,255,255,0.85); display: ${idx % 3 === 0 ? 'none' : 'block'}">Best Seller</div>
      </div>
      <div style="padding: 16px 15px; display: flex; flex-direction: column; flex-grow: 1;">
         <div style="font-family: 'Poppins', sans-serif; font-size: 11px; color: #444; text-transform: uppercase; margin-bottom: 12px; font-weight: 500; letter-spacing: 0px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.5; height: 33px;">${p.name}</div>
         <div style="font-size: 13px; color: #111; font-weight: 600; margin-top: auto;">₹${p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>`).join('');
}

window.scrollSlider = (dir) => {
  const slider = document.getElementById('relatedSlider');
  slider.scrollBy({ left: 300 * dir, behavior: 'smooth' });
}

window.closeProductDetail = () => {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  modalHistory = [];
}

window.modalGoBack = () => {
  if (modalHistory.length > 0) {
    const lastId = modalHistory.pop();
    openProductDetail(lastId, true);
  }
}

window.switchDetailImage = (el, src) => {
  document.getElementById('detailMainImg').src = src;
  const tItems = document.querySelectorAll('.thumb-item');
  tItems.forEach(t => { t.classList.remove('active'); t.style.borderColor = 'transparent'; });
  el.classList.add('active');
  el.style.borderColor = '#000';
}

// LEAD POPUP LOGIC
setTimeout(() => {
  const leadModal = document.getElementById('leadModal');
  if (leadModal && !sessionStorage.getItem('leadShown')) {
    leadModal.style.display = 'flex';
    sessionStorage.setItem('leadShown', 'true');
  }
}, 3000);

window.closeLeadModal = () => {
  const modal = document.getElementById('leadModal');
  if (modal) modal.style.display = 'none';
}

window.handleLead = (e) => {
  e.preventDefault();
  const name = document.getElementById('leadName').value;
  const phone = document.getElementById('leadPhone').value;
  const interest = document.getElementById('leadInterest').value;

  const leadData = { name, phone, interest, date: new Date().toISOString() };

  // Save to localStorage
  const leads = JSON.parse(localStorage.getItem('saforio_leads')) || [];
  leads.push({ name, phone, interest, date: new Date().toLocaleDateString() });
  localStorage.setItem('saforio_leads', JSON.stringify(leads));

  // Save to Firestore
  if (db) {
    db.collection("leads").add(leadData)
      .then(() => console.log("Lead saved to Firestore!"))
      .catch(err => console.error("Firestore lead error:", err));
  }

  alert("Thank you, " + name + "! Our master stylist will contact you shortly.");
  closeLeadModal();
}

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleSheet);

updateUserUI();
updateWishlistIcon();
updateCartIcon();
renderAll();

// AI Stylist Logic
window.handleUserImage = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewImg = document.getElementById('userPhotoPreview');
    const previewCont = document.getElementById('userPreviewCont');
    const zone = document.getElementById('uploadZone');
    const loader = document.getElementById('aiAnalysis');
    if (previewImg) previewImg.src = e.target.result;
    if (zone) zone.style.display = 'none';
    if (previewCont) previewCont.style.display = 'block';
    if (loader) loader.style.display = 'block';
    setTimeout(() => {
      if (loader) loader.style.display = 'none';
      const results = document.getElementById('aiResults');
      if (results) results.style.display = 'block';
      renderRecommendations();
    }, 2500);
  };
  reader.readAsDataURL(file);
}

window.resetStylist = () => {
  const zone = document.getElementById('uploadZone');
  const previewCont = document.getElementById('userPreviewCont');
  const results = document.getElementById('aiResults');
  const input = document.getElementById('userImageInput');
  if (zone) zone.style.display = 'block';
  if (previewCont) previewCont.style.display = 'none';
  if (results) results.style.display = 'none';
  if (input) input.value = '';
}

function renderRecommendations() {
  const recContainer = document.getElementById('stylistRecommendations');
  if (!recContainer) return;
  const shuffled = [...products].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  recContainer.innerHTML = selected.map(p => `
    <div class="product-card" style="background:#fff; padding:15px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.05)">
      <div class="product-img" style="aspect-ratio:3/4; margin-bottom:10px; border-radius:4px;">
        <img src="${p.image || p.img}" class="img-main" style="width:100%; height:100%; object-fit:cover;">
        <img src="${p.imageHover || p.imgHover || p.image || p.img}" class="img-hover" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <div style="font-size:10px; color:var(--muted); margin-top:10px; letter-spacing:1px">${p.category.toUpperCase()}</div>
      <div style="font-family:'Playfair Display',serif; font-size:18px; margin:5px 0; color:var(--dark)">${p.name}</div>
      <div style="color:var(--gold); font-weight:600">₹${p.price.toLocaleString()}</div>
    </div>`).join('');
}