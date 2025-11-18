const API_URL = 'https://dummyjson.com/products';
const AUTH_LOGIN_URL = 'https://dummyjson.com/auth/login';

const estado = {
  productos: [],
};

const STORAGE_KEY = 'carrito_items_v1';

const carrito = {
  items: [],
  agregarItem(producto) {
    const existente = this.items.find(it => it.id === producto.id);
    if (existente) {
      existente.qty += 1;
    } else {
      this.items.push({ ...producto, qty: 1 });
    }
    this.save();
    showToast('Artículo añadido al carrito', 'success');
  },
  quitarItem(id) {
    this.items = this.items.filter(it => it.id !== id);
    this.save();
  },
  vaciar() {
    this.items = [];
    this.save();
    this.renderizarCarrito();
    showToast('Carrito vaciado', 'warn');
  },
  calcularTotal() {
    return this.items.reduce((s, it) => s + it.price * it.qty, 0);
  },
  renderizarCarrito() {
    const cont = document.getElementById('carrito-items');
    const totalNode = document.getElementById('carrito-total');
    if (this.items.length === 0) {
      cont.innerText = 'El carrito está vacío';
      totalNode.innerText = '';
      return;
    }
    cont.innerHTML = '';
    this.items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'carrito-item';
      row.innerHTML = `
        <img src="${it.image}" alt="${escapeHtml(it.title)}">
        <div class="meta">
          <div class="title">${escapeHtml(it.title)}</div>
          <div class="price">$${it.price.toFixed(2)}</div>
        </div>
        <input class="qty" type="number" min="1" value="${it.qty}" data-id="${it.id}">
        <button class="remove" data-id="${it.id}">Eliminar</button>
      `;
      cont.appendChild(row);
    });
    totalNode.innerText = 'Total: $' + this.calcularTotal().toFixed(2);
  },
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('No se pudo guardar el carrito en localStorage', e);
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        this.items = data;
      }
    } catch (e) {
      console.warn('Error leyendo carrito desde localStorage', e);
      this.items = [];
    }
  }
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '<', '>': '>', '"': '&quot;', "'": '&#39;' })[s]);
}

async function fetchProductos() {
  const loading = document.getElementById('loading');
  const catalogo = document.getElementById('catalogo-productos');
  try {
    loading.style.display = 'flex';
    catalogo.innerHTML = '';
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Error al recuperar productos');

    const data = await res.json();
    const productosArray = data.products;

    estado.productos = productosArray.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      image: p.thumbnail,
      description: generarDescripcionPersonalizada(p)
    }));

    renderProductos(estado.productos);
    loading.style.display = 'none';
  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    catalogo.innerHTML = '<p>Error cargando productos. Intenta recargar.</p>';
  }
}

function generarDescripcionPersonalizada(p) {
  return `¡Descubre ${p.title.split(' ')[0]}! Producto de la categoría ${p.category}. Calidad garantizada.`;
}

function renderProductos(productos) {
  const catalogo = document.getElementById('catalogo-productos');
  catalogo.innerHTML = '';
  productos.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.image}" alt="${escapeHtml(p.title)}">
      <div class="product-card-content">
        <h3>${escapeHtml(p.title)}</h3>
        <p class="desc">${escapeHtml(p.description)}</p>
        <div class="price">$${p.price.toFixed(2)}</div>
        <button data-id="${p.id}">Añadir al carrito</button>
      </div>
    `;
    const btn = card.querySelector('button');
    btn.addEventListener('click', () => {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Debes iniciar sesión para añadir al carrito', 'warn');
        return;
      }
      carrito.agregarItem(p);
      carrito.renderizarCarrito();
    });
    catalogo.appendChild(card);
  });
}

function updateAddButtons() {
  const isLogged = !!localStorage.getItem('token');
  document.querySelectorAll('#catalogo-productos button').forEach(b => b.disabled = !isLogged);
}

// 
async function loginConApi(username, password) {
  // 🔍 LOGS DE DEPURACIÓN - Ver qué se envía realmente
  console.log("🔍 Usuario enviado:", JSON.stringify(username));
  console.log("🔐 Contraseña enviada:", JSON.stringify(password));
  console.log("📦 Body final:", JSON.stringify({ username, password }));

  const res = await fetch(AUTH_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Credenciales inválidas');
  }

  return await res.json(); 
}

function setupAuth() {
  const modalOverlay = document.getElementById('modal-overlay');
  const loginModalBtn = document.getElementById('login-btn');
  const modalCloseBtn = document.getElementById('modal-close');
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  const logoutBtn = document.getElementById('logout');

  if (loginModalBtn) {
    loginModalBtn.addEventListener('click', () => {
      modalOverlay.classList.add('visible');
    });
  }
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('visible');
    });
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('visible');
      }
    });
  }

  const token = localStorage.getItem('token');
  if (token) {
    const storedName = localStorage.getItem('user_name') || 'Usuario';
    status.innerText = `Conectado: ${storedName}`;
    loginModalBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    status.innerText = 'No has iniciado sesión';
    loginModalBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

  
    if (!username || !password) {
      showToast('Nombre de usuario y contraseña son obligatorios', 'error');
      return;
    }

    try {
      
      const userData = await loginConApi(username, password);

      localStorage.setItem('token', userData.token);
      localStorage.setItem('user_name', userData.firstName + ' ' + userData.lastName);
      localStorage.setItem('user_email', userData.email);

      status.innerText = `Conectado: ${userData.firstName}`;
      loginModalBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
      updateAddButtons();
      modalOverlay.classList.remove('visible');
      showToast(`¡Bienvenido, ${userData.firstName}!`, 'success');
    } catch (err) {
      console.error('Error de login:', err);
      showToast(err.message || 'Error al iniciar sesión', 'error');
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');

    status.innerText = 'No has iniciado sesión';
    loginModalBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    updateAddButtons();
    showToast('Sesión cerrada', 'warn');
  });
}

function setupCarritoEvents() {
  const cont = document.getElementById('carrito-items');
  cont.addEventListener('click', (e) => {
    if (e.target.matches('.remove')) {
      const id = Number(e.target.dataset.id);
      carrito.quitarItem(id);
      carrito.renderizarCarrito();
    }
  });
  cont.addEventListener('change', (e) => {
    if (e.target.matches('.qty')) {
      const id = Number(e.target.dataset.id);
      const it = carrito.items.find(x => x.id === id);
      const val = Number(e.target.value) || 1;
      if (it) {
        it.qty = Math.max(1, val);
        carrito.save();
        carrito.renderizarCarrito();
      }
    }
  });

  const vaciarBtn = document.getElementById('vaciar-carrito');
  if (vaciarBtn) {
    vaciarBtn.addEventListener('click', () => {
      carrito.vaciar();
      carrito.renderizarCarrito();
    });
  }
}

// Toast helper
function showToast(message, type = 'success', timeout = 3000) {
  const root = document.getElementById('toast');
  if (!root) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.innerText = message;
  root.appendChild(node);
  setTimeout(() => { node.remove(); }, timeout);
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', () => {
  carrito.load();
  fetchProductos();
  setupAuth();
  setupCarritoEvents();
  carrito.renderizarCarrito();
  updateAddButtons();

  // Modo oscuro
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme === 'dark' || (savedTheme === null && systemPrefersDark);

    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    }

    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isNowDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
    });
  }
});
