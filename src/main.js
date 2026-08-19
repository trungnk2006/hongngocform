// ================================
// HongNgocForm - Main Entry Point with Admin Auth Guard
// ================================

import './style.css';
import { isAdminAuthenticated } from './auth.js';
import { renderAdminLogin } from './pages/login.js';
import { renderHome } from './pages/home.js';
import { renderBuilder } from './pages/builder.js';
import { renderFill } from './pages/fill.js';
import { renderResponses } from './pages/responses.js';

let currentAbortController = null;

function parseRoute(hash) {
  const clean = hash.replace(/^#\/?/, '');
  const parts = clean.split('/').filter(Boolean);

  if (parts.length === 0) return { path: '/', id: null };
  if (parts.length === 1) return { path: '/' + parts[0], id: null };
  return { path: '/' + parts[0], id: parts[1] };
}

async function route() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  const app = document.getElementById('app');
  const hash = window.location.hash || '#/';
  const { path, id } = parseRoute(hash);

  window.scrollTo(0, 0);

  // 1. PUBLIC ROUTE: Form Fill Page (Teachers / Respondents)
  // Zero authentication required! Anyone with the link can fill and submit.
  if (path === '/form') {
    if (id) {
      await renderFill(app, id, signal);
    } else {
      window.location.hash = '#/';
    }
    return;
  }

  // 2. PROTECTED ADMIN ROUTES: (Dashboard, Create Form, Edit Form, View Responses)
  // Check if admin passcode has been verified for this session
  if (!isAdminAuthenticated()) {
    renderAdminLogin(app, () => route());
    return;
  }

  // Admin is authenticated -> proceed to protected page
  try {
    switch (path) {
      case '/':
        await renderHome(app, signal);
        break;
      case '/create':
        await renderBuilder(app, null, signal);
        break;
      case '/edit':
        if (id) await renderBuilder(app, id, signal);
        else window.location.hash = '#/';
        break;
      case '/responses':
        if (id) await renderResponses(app, id, signal);
        else window.location.hash = '#/';
        break;
      default:
        render404(app);
    }
  } catch (err) {
    console.error('Route error:', err);
    app.innerHTML = `
      <div class="page-404">
        <h1>⚠️</h1>
        <p>Đã xảy ra lỗi khi tải trang.<br><small style="color:var(--text-muted)">${err.message || ''}</small></p>
        <a href="#/" class="btn btn-primary btn-lg">🏠 Về trang chủ</a>
      </div>
    `;
  }
}

function render404(app) {
  app.innerHTML = `
    <div class="page-404">
      <h1>404</h1>
      <p>Trang không tìm thấy</p>
      <a href="#/" class="btn btn-primary btn-lg">🏠 Về trang chủ</a>
    </div>
  `;
}

// Initialize router
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
