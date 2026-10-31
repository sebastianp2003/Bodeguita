const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  msg.textContent = '';
  msg.classList.remove('success-msg', 'error-msg');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const submitButton = form.querySelector('button[type="submit"]');

  if (!email || !password) {
    msg.textContent = 'Por favor, completa todos los campos.';
    msg.classList.add('error-msg');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Iniciando sesión...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error || 'No fue posible iniciar sesión.';
      msg.classList.add('error-msg');
      return;
    }

    msg.textContent = '¡Bienvenido a Bodeguita! Redirigiendo...';
    msg.classList.add('success-msg');

    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    msg.textContent = 'No se pudo conectar con el servidor. Inténtalo nuevamente.';
    msg.classList.add('error-msg');

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Iniciar sesión';
  }
});