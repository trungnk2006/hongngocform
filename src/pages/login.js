// ================================
// Admin Login / Passcode Lock Screen
// ================================

import { verifyAdminPin, getAdminPin, setCustomAdminPin } from '../auth.js';
import { showToast } from '../utils.js';

export function renderAdminLogin(container, onSuccess) {
  const currentPin = getAdminPin();
  const isDefaultPin = currentPin === '123456';

  container.innerHTML = `
    <nav class="nav">
      <a href="#/" class="nav-brand">
        <span class="brand-icon">📝</span>
        <span>Hong<span class="brand-accent">Ngoc</span>Form</span>
      </a>
    </nav>

    <main class="page" style="display: flex; align-items: center; justify-content: center; min-height: 80vh;">
      <div class="card" style="max-width: 420px; width: 100%; text-align: center; padding: 36px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid var(--border-subtle);">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 1.8rem; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);">
          🔒
        </div>
        
        <h2 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Khu Vực Quản Trị</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5;">
          Trang này dành riêng cho người tạo biểu mẫu để xem câu trả lời và quản lý form. Vui lòng nhập mã PIN quản trị.
        </p>

        <form id="admin-login-form">
          <div class="form-group" style="margin-bottom: 20px;">
            <input
              type="password"
              id="admin-pin-input"
              class="form-input"
              placeholder="Nhập mã PIN Admin"
              autofocus
              autocomplete="current-password"
              style="text-align: center; font-size: 1.3rem; letter-spacing: 4px; font-weight: bold; padding: 14px;"
            >
          </div>

          <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-bottom: 16px;">
            🔓 Mở Khóa Quản Trị
          </button>
        </form>

        ${
          isDefaultPin
            ? `<div style="background: #fefce8; border: 1px dashed #fde047; border-radius: 8px; padding: 10px 14px; font-size: 0.82rem; color: #854d0e; text-align: left; margin-top: 12px;">
                💡 <b>Mã PIN mặc định:</b> <code>123456</code><br>
                (Bạn có thể đổi mã PIN này sau khi đăng nhập)
               </div>`
            : ''
        }
      </div>
    </main>
  `;

  const form = container.querySelector('#admin-login-form');
  const input = container.querySelector('#admin-pin-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = input.value;
    if (verifyAdminPin(pin)) {
      showToast('Đăng nhập quản trị thành công!', 'success');
      onSuccess();
    } else {
      input.classList.add('shake', 'error');
      showToast('Mã PIN không chính xác. Vui lòng thử lại!', 'error');
      setTimeout(() => input.classList.remove('shake'), 500);
      input.value = '';
      input.focus();
    }
  });
}
