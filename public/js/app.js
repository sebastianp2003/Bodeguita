
/*
==================================================
 BODEGUITA - FUNCIONAMIENTO DEL CATÁLOGO
==================================================

- Gestión de sesión.
- Inicio y cierre de sesión.
- Búsqueda de productos.
- Visualización del catálogo.
- Administración de productos.
- Protección contra XSS mediante textContent.
*/

const navAuth = document.getElementById('navAuth');
const productGrid = document.getElementById('productGrid');
const adminPanel = document.getElementById('adminPanel');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const productForm = document.getElementById('productForm');
const productMsg = document.getElementById('productMsg');

let currentUser = null;
let searchTimeout = null;


/* =========================================
   UTILIDADES
========================================= */

function createElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (content !== undefined) {
        element.textContent = content;
    }

    return element;
}

function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(price) || 0);
}

function showMessage(element, message, type = 'error') {
    if (!element) return;

    element.textContent = message;
    element.className = type === 'success'
        ? 'success-msg'
        : 'error-msg';
}


/* =========================================
   GESTIÓN DE SESIÓN
========================================= */

async function loadSession() {

    try {

        const res = await fetch('/api/auth/session', {
            credentials: 'same-origin'
        });

        if (!res.ok) {
            throw new Error('No se pudo consultar la sesión.');
        }

        const data = await res.json();

        if (data.authenticated) {

            currentUser = data.user;

            navAuth.replaceChildren();

            const welcome = createElement(
                'span',
                'user-welcome',
                `Hola, ${currentUser.name}`
            );

            const logoutBtn = createElement(
                'button',
                'logout-button',
                'Cerrar sesión'
            );

            logoutBtn.type = 'button';

            logoutBtn.addEventListener('click', logout);

            navAuth.appendChild(welcome);
            navAuth.appendChild(logoutBtn);

            if (currentUser.role === 'admin' && adminPanel) {
                adminPanel.classList.remove('hidden');
            }

        } else {

            currentUser = null;

            navAuth.replaceChildren();

            const loginLink = createElement(
                'a',
                '',
                'Iniciar sesión'
            );

            loginLink.href = '/login.html';

            const registerLink = createElement(
                'a',
                '',
                'Crear cuenta'
            );

            registerLink.href = '/register.html';

            navAuth.appendChild(loginLink);
            navAuth.appendChild(registerLink);

            if (adminPanel) {
                adminPanel.classList.add('hidden');
            }

        }

    } catch (error) {

        console.error('Error de sesión:', error);

        currentUser = null;

        if (navAuth) {
            navAuth.replaceChildren();

            const loginLink = createElement(
                'a',
                '',
                'Iniciar sesión'
            );

            loginLink.href = '/login.html';

            navAuth.appendChild(loginLink);
        }
    }
}


/* =========================================
   CERRAR SESIÓN
========================================= */

async function logout() {

    try {

        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (!res.ok) {
            throw new Error('No se pudo cerrar la sesión.');
        }

        window.location.href = '/login.html';

    } catch (error) {

        console.error('Error al cerrar sesión:', error);

        alert('No fue posible cerrar la sesión. Intenta nuevamente.');
    }
}


/* =========================================
   MOSTRAR PRODUCTOS
========================================= */

function renderProducts(products) {

    productGrid.replaceChildren();

    if (!products || products.length === 0) {

        const empty = createElement(
            'div',
            'empty-products'
        );

        const icon = createElement(
            'span',
            'empty-icon',
            '🛍️'
        );

        const title = createElement(
            'h3',
            '',
            'No encontramos productos'
        );

        const description = createElement(
            'p',
            '',
            'Intenta buscar con otro nombre o categoría.'
        );

        empty.appendChild(icon);
        empty.appendChild(title);
        empty.appendChild(description);

        productGrid.appendChild(empty);

        return;
    }

    for (const prod of products) {

        const card = createElement(
            'article',
            'product-card'
        );

        const imageArea = createElement(
            'div',
            'product-image-placeholder'
        );

        const imageIcon = createElement(
            'span',
            '',
            '🛍️'
        );

        imageArea.appendChild(imageIcon);

        const category = createElement(
            'span',
            'product-category',
            prod.category || 'General'
        );

        const name = createElement(
            'h3',
            '',
            prod.name
        );

        const description = createElement(
            'p',
            'product-description',
            prod.description
        );

        const price = createElement(
            'p',
            'price',
            formatPrice(prod.price)
        );

        const stock = createElement(
            'p',
            'stock',
            `Disponibles: ${prod.stock}`
        );

        card.appendChild(imageArea);
        card.appendChild(category);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(price);
        card.appendChild(stock);

        productGrid.appendChild(card);
    }
}


/* =========================================
   CARGAR PRODUCTOS
========================================= */

async function loadProducts(query = '') {

    if (!productGrid) return;

    productGrid.setAttribute('aria-busy', 'true');

    const loading = createElement(
        'p',
        'loading-products',
        'Cargando productos...'
    );

    productGrid.replaceChildren(loading);

    try {

        const url = query
            ? `/api/products?q=${encodeURIComponent(query)}`
            : '/api/products';

        const res = await fetch(url, {
            credentials: 'same-origin'
        });

        if (!res.ok) {
            throw new Error('No se pudieron cargar los productos.');
        }

        const data = await res.json();

        renderProducts(data.products || []);

    } catch (error) {

        console.error('Error cargando productos:', error);

        productGrid.replaceChildren();

        const message = createElement(
            'p',
            'error-msg',
            'No fue posible cargar los productos. Intenta nuevamente.'
        );

        productGrid.appendChild(message);

    } finally {

        productGrid.setAttribute('aria-busy', 'false');
    }
}


/* =========================================
   BÚSQUEDA DE PRODUCTOS
========================================= */

if (searchBtn && searchInput) {

    searchBtn.addEventListener('click', () => {

        loadProducts(searchInput.value.trim());

    });

    searchInput.addEventListener('keydown', (event) => {

        if (event.key === 'Enter') {

            event.preventDefault();

            loadProducts(searchInput.value.trim());
        }
    });

    // Búsqueda automática mientras se escribe.

    searchInput.addEventListener('input', () => {

        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {

            loadProducts(searchInput.value.trim());

        }, 350);
    });
}


/* =========================================
   AGREGAR PRODUCTOS - ADMINISTRADOR
========================================= */

if (productForm) {

    productForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        if (!productMsg) return;

        showMessage(productMsg, 'Registrando producto...');

        const body = {

            name: document.getElementById('p_name').value.trim(),

            description: document.getElementById('p_description').value.trim(),

            price: Number(document.getElementById('p_price').value),

            category: document.getElementById('p_category').value.trim(),

            stock: Number(document.getElementById('p_stock').value)

        };

        if (
            !body.name ||
            !body.description ||
            !body.category ||
            !Number.isFinite(body.price) ||
            !Number.isFinite(body.stock) ||
            body.price < 0 ||
            body.stock < 0
        ) {

            showMessage(
                productMsg,
                'Verifica los datos ingresados.'
            );

            return;
        }

        const submitButton = productForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Guardando...';
        }

        try {

            const res = await fetch('/api/products', {

                method: 'POST',

                credentials: 'same-origin',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(body)

            });

            const data = await res.json();

            if (!res.ok) {

                throw new Error(
                    data.error || 'No se pudo agregar el producto.'
                );
            }

            showMessage(
                productMsg,
                '¡Producto agregado correctamente!',
                'success'
            );

            productForm.reset();

            await loadProducts(
                searchInput ? searchInput.value.trim() : ''
            );

        } catch (error) {

            console.error('Error agregando producto:', error);

            showMessage(
                productMsg,
                error.message || 'Ocurrió un error al registrar el producto.'
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = '+ Agregar producto';
            }
        }
    });
}


/* =========================================
   INICIALIZACIÓN
========================================= */

async function initializeStore() {

    await loadSession();

    await loadProducts();

}

initializeStore();
