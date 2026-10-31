# Bodeguita — Registro de usuarios y catálogo de productos

Bodeguita es una aplicación web desarrollada para la actividad de **Seguridad de Software (Fase 2)**. Permite registrar usuarios, iniciar sesión y consultar un catálogo de productos. También cuenta con un rol de administrador que puede gestionar los productos.

El proyecto fue desarrollado con Node.js, Express y SQLite, incorporando diferentes mecanismos de protección y buenas prácticas de seguridad alineadas con **OWASP Top 10 2021**.

## Tecnologías utilizadas

- **Node.js:** entorno de ejecución de JavaScript en el servidor.
- **Express:** framework para gestionar rutas y solicitudes HTTP.
- **SQLite (better-sqlite3):** almacenamiento de usuarios y productos mediante consultas preparadas.
- **bcrypt:** generación y verificación de hashes de contraseñas.
- **Helmet:** configuración de cabeceras HTTP de seguridad y Content Security Policy.
- **express-session:** gestión de sesiones de usuario.
- **better-sqlite3-session-store:** almacenamiento persistente de sesiones en SQLite.
- **express-validator:** validación de datos recibidos por el servidor.
- **express-rate-limit:** limitación de solicitudes para reducir intentos automatizados.
- **HTML, CSS y JavaScript:** desarrollo de la interfaz y las interacciones del frontend.
- **dotenv:** administración de variables de entorno.

## Requisitos previos

Para ejecutar el proyecto se necesita:

- Node.js instalado.
- npm.
- Git (opcional, para clonar el repositorio).

## Instalación y ejecución

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/sebastianp2003/MiPortafolio.git
   ```

   > Si Bodeguita se encuentra en otro repositorio, reemplaza esta URL por la correspondiente.

2. Entrar en la carpeta del proyecto:

   ```bash
   cd secure-app
   ```

3. Instalar las dependencias:

   ```bash
   npm install
   ```

4. Crear el archivo `.env` a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

   En Windows PowerShell también puedes utilizar:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Configurar las variables de entorno en `.env`:

   ```env
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=coloca_aqui_una_cadena_larga_y_aleatoria
   ADMIN_NAME=Administrador
   ADMIN_EMAIL=admin@bodeguita.local
   ADMIN_PASSWORD=coloca_una_contrasena_segura
   ```

   La contraseña del administrador debe cumplir los requisitos de seguridad establecidos por el proyecto.

6. Inicializar los datos de prueba:

   ```bash
   npm run seed
   ```

7. Iniciar el servidor:

   ```bash
   npm start
   ```

8. Abrir la aplicación en el navegador:

   http://localhost:3000

**Importante:** el administrador se configura mediante las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El archivo `.env` no debe compartirse ni subirse a GitHub. El proceso de inicialización no reemplaza las credenciales de un administrador que ya exista.

## Funcionalidades principales

### Usuarios
- Registro de nuevos usuarios.
- Validación de nombre, correo y contraseña.
- Inicio y cierre de sesión.
- Mantenimiento de sesiones de usuario.

### Catálogo de productos
- Consulta de productos disponibles.
- Búsqueda por nombre o descripción.
- Visualización de precios, categorías y existencias.
- Registro de nuevos productos por parte del administrador.
- Eliminación de productos por parte del administrador.

### Roles y permisos

La aplicación maneja dos roles:

- **Usuario:** puede consultar y buscar productos.
- **Administrador:** puede realizar las operaciones de gestión de productos, además de las funciones de consulta.

## Controles de seguridad aplicados

El proyecto incorpora medidas relacionadas con diferentes categorías del estándar OWASP Top 10 2021.

| Categoría OWASP | Control aplicado | Ubicación |
|---|---|---|
| A01 - Broken Access Control | Verificación de autenticación y rol de administrador desde el servidor para restringir las operaciones de productos. | `middleware/auth.js`, `routes/products.js` |
| A02 - Cryptographic Failures | Uso de bcrypt con factor de costo 12 para almacenar hashes de contraseñas, evitando guardarlas en texto plano. | `routes/auth.js` |
| A03 - Injection | Consultas SQL preparadas y parametrizadas para evitar que los datos del usuario se interpreten como instrucciones SQL. | `config/db.js`, `routes/auth.js`, `routes/products.js` |
| A03 - Injection (XSS) | Validación de entradas y uso de `textContent` en el frontend para mostrar los datos sin interpretarlos directamente como HTML. | `routes/`, `public/js/app.js` |
| A04 - Insecure Design | Política de contraseñas con mínimo de ocho caracteres, mayúsculas, minúsculas y números; bloqueo temporal después de cinco intentos fallidos. | `routes/auth.js` |
| A05 - Security Misconfiguration | Uso de Helmet, configuración de Content Security Policy, desactivación de `X-Powered-By` y manejo controlado de errores. | `server.js` |
| A07 - Identification and Authentication Failures | Limitación de solicitudes de inicio de sesión, mensajes de error genéricos, regeneración de sesiones al autenticar y configuración de cookies seguras. | `routes/auth.js`, `server.js` |
| A08 - Software and Data Integrity Failures | Gestión de dependencias mediante npm y recomendación de revisar vulnerabilidades conocidas con `npm audit`. | `package.json`, `package-lock.json` |

### Medidas adicionales

- **Bloqueo de cuentas:** después de cinco intentos fallidos, la cuenta queda bloqueada durante 15 minutos.
- **Rate limiting:** limita las solicitudes de inicio de sesión durante una ventana de tiempo para dificultar ataques automatizados.
- **Cookies:** se configuran con `httpOnly`, `sameSite` y `secure` según el entorno.
- **Sesiones:** se regeneran después de una autenticación correcta para reducir el riesgo de fijación de sesión.
- **Validación del servidor:** los datos se verifican en el backend, sin depender exclusivamente de las validaciones del navegador.
- **Restricciones en SQLite:** se utilizan claves foráneas y restricciones para mantener la integridad de los datos.

## Relación con la Fase 1

En la primera fase se analizaron sitios web reales para identificar posibles debilidades en sus mecanismos de seguridad.

Uno de los hallazgos fue la ausencia de determinadas cabeceras de seguridad, como Content Security Policy y Strict-Transport-Security, en las respuestas de uno de los sitios analizados.

A partir de estos resultados, en Bodeguita se incorporaron mecanismos de protección desde el desarrollo, como Helmet, CSP, validaciones de entrada, consultas parametrizadas y controles de autenticación y autorización.

De esta manera, el proyecto permite aplicar de forma práctica varios de los conceptos estudiados durante la evaluación de seguridad de aplicaciones web.

## Estructura del proyecto

```text
secure-app/
├── server.js
├── config/
│   ├── db.js
│   └── seed.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   └── products.js
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── login.js
│   │   └── register.js
│   ├── index.html
│   ├── login.html
│   └── register.html
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Backlog de Scrum sugerido

### Sprint 1 — Registro y autenticación
- Como usuario quiero registrarme con una contraseña segura.
- Como usuario quiero iniciar sesión de forma segura.
- Como usuario quiero cerrar mi sesión.
- Como visitante quiero consultar el catálogo de productos.

### Sprint 2 — Gestión del catálogo
- Como administrador quiero agregar productos al catálogo.
- Como administrador quiero eliminar productos.
- Como usuario quiero buscar productos por nombre o descripción.
- Como usuario quiero consultar los precios y las existencias.

### Sprint 3 — Seguridad y fortalecimiento
- Como equipo queremos implementar cabeceras de seguridad HTTP mediante Helmet.
- Como equipo queremos proteger las contraseñas mediante bcrypt.
- Como equipo queremos limitar los intentos de inicio de sesión.
- Como equipo queremos implementar controles de acceso por roles.
- Como equipo queremos documentar los controles de seguridad aplicados según OWASP.
- Como equipo queremos evaluar las vulnerabilidades y dependencias del proyecto.

## Aspectos pendientes de fortalecimiento

Aunque Bodeguita incorpora diferentes mecanismos de seguridad, existen mejoras que pueden desarrollarse en futuras versiones:

- Implementar protección CSRF mediante tokens.
- Configurar HTTPS y certificados TLS para producción.
- Fortalecer el registro de eventos y la auditoría de actividades.
- Realizar pruebas de seguridad y análisis de vulnerabilidades.
- Revisar periódicamente las dependencias mediante `npm audit`.
- Implementar una operación para editar productos y completar las funcionalidades CRUD.

## Autoría y propósito académico

Proyecto desarrollado como parte de la actividad de **Seguridad de Software — Fase 2**, con el propósito de aplicar conceptos de seguridad web, autenticación, autorización, protección de datos y prevención de vulnerabilidades en una aplicación funcional.

**Bodeguita — Seguridad y gestión de productos en una aplicación web.**