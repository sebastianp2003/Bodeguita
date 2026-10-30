// public/js/app.js
// Logica del catalogo. Nota de seguridad: usamos textContent (nunca
// innerHTML con datos del servidor) para pintar informacion de productos.
// Esto es una defensa en profundidad contra XSS (A03:2021) en el cliente,
// complementaria al escape que ya hace el backend con express-validator.

const navAuth = document.getElementById('navAuth');
const productGrid = document.getElementById('productGrid');
const adminPanel = document.getElementById('adminPanel');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const productForm = document.getElementById('productForm');
const productMsg = document.getElementById('productMsg');

let currentUser = null;

async function loadSession() {
  const res = await fetch('/api/auth/session');
  const data = await res.json();
  if (data.authenticated) {
    currentUser = data.user;
    navAuth.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = `Hola, ${currentUser.name} `;
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Cerrar sesion';
    logoutBtn.onclick = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    };
    navAuth.appendChild(span);
    navAuth.appendChild(logoutBtn);

    if (currentUser.role === 'admin') {
      adminPanel.classList.remove('hidden');
    }
  } else {
    navAuth.innerHTML = '';
    const loginLink = document.createElement('a');
    loginLink.href = '/login.html';
    loginLink.textContent = 'Iniciar sesion';
    const registerLink = document.createElement('a');
    registerLink.href = '/register.html';
    registerLink.textContent = 'Registrarme';
    navAuth.appendChild(loginLink);
    navAuth.appendChild(registerLink);
  }
}

function renderProducts(products) {
  productGrid.innerHTML = '';
  if (products.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No se encontraron productos.';
    productGrid.appendChild(p);
    return;
  }
  for (const prod of products) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const h3 = document.createElement('h3');
    h3.textContent = prod.name; // textContent = seguro contra XSS
    const desc = document.createElement('p');
    desc.textContent = prod.description;
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = `$${Number(prod.price).toLocaleString('es-CO')}`;
    const stock = document.createElement('p');
    stock.className = 'stock';
    stock.textContent = `Stock: ${prod.stock} | Categoria: ${prod.category}`;

    card.appendChild(h3);
    card.appendChild(desc);
    card.appendChild(price);
    card.appendChild(stock);
    productGrid.appendChild(card);
  }
}

async function loadProducts(query = '') {
  const url = query ? `/api/products?q=${encodeURIComponent(query)}` : '/api/products';
  const res = await fetch(url);
  const data = await res.json();
  renderProducts(data.products || []);
}

searchBtn.addEventListener('click', () => loadProducts(searchInput.value.trim()));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadProducts(searchInput.value.trim());
});

if (productForm) {
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    productMsg.textContent = '';
    const body = {
      name: document.getElementById('p_name').value,
      description: document.getElementById('p_description').value,
      price: Number(document.getElementById('p_price').value),
      category: document.getElementById('p_category').value,
      stock: Number(document.getElementById('p_stock').value),
    };
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      productMsg.textContent = data.error || 'Error al crear el producto.';
      productMsg.style.color = '#dc2626';
    } else {
      productMsg.textContent = 'Producto agregado correctamente.';
      productMsg.style.color = '#16a34a';
      productForm.reset();
      loadProducts();
    }
  });
}

loadSession();
loadProducts();
