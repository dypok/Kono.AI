# US-FRONT-004 — Rediseño Global Liquid Glass, Enrutamiento SPA, Login Mock & Sidebar

**Tipo:** Story | **SP:** 8 | **Prioridad:** Alta (P0) | **Asignado:** Sayder & Dylan  
**Rama sugerida:** `feature/front-liquid-glass-routing-layout`  
**Estado:** 🚀 TO DO  

---

## 📖 Historia de Usuario
> "Como usuario de Kono.ai, quiero navegar por una aplicación moderna con estética **Liquid Glass & Titanio/Crema Alabastro**, que cuente con autenticación de acceso (Login Mock), un Sidebar colapsable con navegación fluida y enrutamiento SPA para el Dashboard de Auditoría, Plantillas, Reportes de Conciliación y Configuración, para operar en una experiencia inmersiva, limpia y sin fatiga visual."

---

## 🎯 Criterios de Aceptación (DoD Específico)

### 1. 🌈 Estética Liquid Glass & Paleta Titanio/Crema
- [ ] Aplicación del sistema de diseño **"Silver Titanium & Warm Alabaster Liquid Glass"**:
  - Fondo base: `#0D1117` con gradientes radiales ambientales suaves.
  - Paneles flotantes: `backdrop-blur-2xl bg-[#FAF8F5]/[0.05] border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rounded-2xl`.
  - Tipografía en Blanco Crema cálido (`#FAF8F5`) y Gris Platino (`#94A3B8`). Monospace para cifras contables.

### 2. 🔐 Módulo de Autenticación (Login Mock)
- [ ] Pantalla de Login Liquid Glass (`/login`):
  - Card central translúcida con la mascota **Kono** plateada animada.
  - Inputs para Correo y Contraseña con validación visual.
  - Botón de acceso con animación de carga simulada y persistencia de sesión mock en `localStorage`/Zustand (`isAuthenticated: true`).
  - Redirección automática a `/dashboard` tras autenticación.
  - Protección de rutas (`ProtectedRoute`): si no está autenticado, redirige a `/login`.

### 3. 🧭 Sidebar de Navegación "Liquid Glass"
- [ ] Sidebar colapsable y flotante en el layout general (`/app/*`):
  - **Header:** Logotipo de Kono.ai con la moneda plateada brillante y selector de Workspace ("Finanzas Corporativas").
  - **Enlaces de Navegación con Iconos (Lucide-React):**
    - 📊 **Auditoría & Facturas (`/dashboard`):** Visor Split-Screen de documentos y validador Kono.
    - 📁 **Plantillas de Proveedor (`/templates`):** Gestor de plantillas aprendidas (`vendor_templates`).
    - 📈 **Conciliación & Reportes (`/analytics`):** Métricas de lotes, KPIs de ahorro y exportación.
    - ⚙️ **Configuración & Integraciones (`/settings`):** Configuración de n8n, Webhooks y credenciales IMAP.
  - **Footer del Sidebar:** Estado de conexión WebSocket en vivo (punto verde pulsante) y perfil de usuario con botón "Cerrar Sesión".

### 4. 🔀 Enrutamiento SPA con React Router v6
- [ ] Configuración de `react-router-dom`:
  - `/login`: Vista de autenticación.
  - `/dashboard`: Visor Split-Screen y auditoría en tiempo real.
  - `/templates`: Vista de plantillas de proveedor.
  - `/analytics`: Vista de métricas y exportación ERP.
  - `/settings`: Vista de configuración y conectores n8n.
  - `*`: Redirección por defecto a `/dashboard` o `/login`.

---

## 📋 Subtasks Desglosadas

### ⚛️ [FRONT-ROUTER & AUTH] Enrutamiento & Estado de Sesión
- [ ] Instalar `react-router-dom` y `lucide-react`.
- [ ] Crear store de autenticación en `src/store/authStore.ts` con Zustand.
- [ ] Crear componente `src/components/auth/ProtectedRoute.tsx`.
- [ ] Crear vista `src/pages/LoginPage.tsx` con card Liquid Glass y mascota Kono.

### 🧭 [FRONT-LAYOUT] Layout Maestro & Sidebar Liquid Glass
- [ ] Crear `src/components/layout/AppLayout.tsx` con contenedor general y ambient glow.
- [ ] Crear `src/components/layout/LiquidSidebar.tsx` con diseño colapsable, badges de estado y micro-interacciones.
- [ ] Crear barra superior `src/components/layout/TopNavbar.tsx` con métricas en tiempo real ($0 tokens, latencia).

### 📄 [FRONT-PAGES] Estructura de Vistas SPA
- [ ] Configurar `src/pages/DashboardPage.tsx` integrando el visor Split-Screen.
- [ ] Crear `src/pages/TemplatesPage.tsx` para visualización y gestión de `vendor_templates`.
- [ ] Crear `src/pages/AnalyticsPage.tsx` con reportes de lotes y botón de exportación CSV/JSON.
- [ ] Crear `src/pages/SettingsPage.tsx` con estado de servicios (Rust, Python, Redis, n8n).

### 🧪 [TESTS & VERIFICACIÓN]
- [ ] Validar navegación entre todas las rutas sin recargar la página.
- [ ] Probar persistencia de sesión mock y redirección en logout.
