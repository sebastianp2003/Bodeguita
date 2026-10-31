const form = document.getElementById('registerForm');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  msg.textContent = '';
  msg.classList.remove('success-msg', 'error-msg');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const submitButton = form.querySelector('button[type="submit"]');

  if (!name || !email || !password) {
    msg.textContent = 'Por favor, completa todos los campos.';
    msg.classList.add('error-msg');
    return;
  }

  if (password.length < 8) {
    msg.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    msg.classList.add('error-msg');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Creando cuenta...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error || 'No fue posible completar el registro.';
      msg.classList.add('error-msg');
      return;
    }

    msg.textContent = '¡Registro exitoso! Redirigiendo...';
    msg.classList.add('success-msg');

    setTimeout(() => {
      window.location.href = '/';
    }, 1000);

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    msg.textContent = 'No se pudo conectar con el servidor. Inténtalo nuevamente.';
    msg.classList.add('error-msg');

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Crear cuenta';
  }
});