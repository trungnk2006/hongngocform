// ================================
// Home Page - Dashboard
// ================================

import { store } from '../store.js';
import { isConfigured } from '../supabase.js';
import { adminLogout, setCustomAdminPin } from '../auth.js';
import { escapeHtml, formatDate, showToast, showConfirm } from '../utils.js';

export async function renderHome(container, signal) {
  // Show loading
  container.innerHTML = `
    <div class="loading-page">
      <div class="spinner"></div>
      <span class="loading-text">Đang tải...</span>
    </div>
  `;

  const forms = await store.getAllForms();

  container.innerHTML = `
    <nav class="nav">
      <a href="#/" class="nav-brand">
        <span class="brand-icon">📝</span>
        <span>Hong<span class="brand-accent">Ngoc</span>Form</span>
      </a>
      <div class="nav-actions">
        ${
          isConfigured
            ? `<span style="font-size: 0.78rem; font-weight: 600; padding: 5px 12px; border-radius: 20px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;" title="Dữ liệu đồng bộ trực tuyến qua Supabase">
                ☁️ Supabase Online
              </span>`
            : `<span style="font-size: 0.78rem; font-weight: 600; padding: 5px 12px; border-radius: 20px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;" title="Chưa kết nối Supabase, dữ liệu chỉ lưu trên máy bạn">
                💾 Chế độ Offline
              </span>`
        }
        <a href="#/create" class="btn btn-primary btn-sm">
          <span>＋</span>
          <span class="btn-label">Tạo biểu mẫu</span>
        </a>
        <button class="btn btn-secondary btn-sm" id="btn-change-pin" title="Đổi mã PIN Admin">
          🔑 Đổi PIN
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-admin-logout" title="Đăng xuất Admin">
          🔒 Thoát
        </button>
      </div>
    </nav>
    <main class="page">
      <div class="container">
        <div class="page-header">
          <div>
            <h1 class="page-title">Biểu mẫu của tôi</h1>
            <p class="page-subtitle">Tạo và quản lý biểu mẫu trực tuyến dễ dàng</p>
          </div>
        </div>
        ${forms.length === 0 ? renderEmptyState() : renderFormGrid(forms)}
      </div>
    </main>
  `;

  setupHomeEvents(container, signal);
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h2>Chưa có biểu mẫu nào</h2>
      <p>Bắt đầu bằng cách tạo biểu mẫu đầu tiên hoặc dùng mẫu có sẵn</p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary btn-lg" id="btn-create-sample">✨ Tạo biểu mẫu Thầy Cô giáo (Mẫu sẵn)</button>
        <a href="#/create" class="btn btn-secondary btn-lg">＋ Tạo biểu mẫu tùy chỉnh</a>
      </div>
    </div>
  `;
}

function renderFormGrid(forms) {
  return `
    <div class="card-grid">
      ${forms
        .map(
          (form) => `
        <div class="form-card card" data-form-id="${form.id}">
          <div class="form-card-header">
            <h3 class="form-card-title">${escapeHtml(form.title)}</h3>
            <span class="form-card-date">${formatDate(form.updatedAt)}</span>
          </div>
          ${form.description ? `<p class="form-card-desc">${escapeHtml(form.description)}</p>` : ''}
          <div class="form-card-meta">
            <span>📄 ${form.questions.length} câu hỏi</span>
            <span>•</span>
            <span>💬 ${form.responseCount || 0} phản hồi</span>
          </div>
          <div class="form-card-actions">
            <a href="#/form/${form.id}" class="btn btn-sm btn-secondary" title="Xem biểu mẫu">
              👁️ Xem
            </a>
            <a href="#/edit/${form.id}" class="btn btn-sm btn-secondary" title="Chỉnh sửa">
              ✏️ Sửa
            </a>
            <a href="#/responses/${form.id}" class="btn btn-sm btn-secondary" title="Xem phản hồi">
              📊 Phản hồi
            </a>
            <button class="btn btn-sm btn-secondary btn-copy-link" data-form-id="${form.id}" title="Sao chép liên kết">
              🔗 Link
            </button>
            <button class="btn btn-sm btn-icon btn-danger btn-delete-form" data-form-id="${form.id}" title="Xóa biểu mẫu">
              🗑️
            </button>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function setupHomeEvents(container, signal) {
  container.addEventListener(
    'click',
    async (e) => {
      // Logout
      if (e.target.closest('#btn-admin-logout')) {
        adminLogout();
        showToast('Đã đăng xuất khu vực quản trị', 'info');
        window.location.hash = '#/';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }

      // Change PIN
      if (e.target.closest('#btn-change-pin')) {
        const newPin = prompt('Nhập mã PIN Admin mới (tối thiểu 4 ký tự):');
        if (newPin && newPin.trim().length >= 4) {
          setCustomAdminPin(newPin.trim());
          showToast('Đã cập nhật mã PIN Admin mới!', 'success');
        } else if (newPin !== null) {
          showToast('Mã PIN cần ít nhất 4 ký tự', 'error');
        }
        return;
      }

      // Create sample form
      if (e.target.closest('#btn-create-sample')) {
        const btn = e.target.closest('#btn-create-sample');
        btn.disabled = true;
        btn.textContent = '⏳ Đang tạo...';
        try {
          const sampleForm = {
            title: 'Biểu Mẫu Xác Nhận Hoàn Thành Bài Thi',
            description: 'Thầy cô vui lòng điền thông tin và tải ảnh minh chứng kết quả thi để nhà trường xác nhận.',
            questions: [
              {
                id: 'q_' + Math.random().toString(36).substr(2, 9),
                text: 'Họ tên của thầy cô?',
                type: 'text',
                required: true,
                options: [],
              },
              {
                id: 'q_' + Math.random().toString(36).substr(2, 9),
                text: 'Thầy cô thuộc tổ nào?',
                type: 'choice',
                required: true,
                options: ['Khoa học xã hội', 'Khoa học tự nhiên'],
              },
              {
                id: 'q_' + Math.random().toString(36).substr(2, 9),
                text: 'Thầy cô vui lòng tải ảnh minh chứng kết quả hoàn thành bài thi để xác nhận',
                type: 'file',
                required: true,
                options: [],
              },
            ],
          };
          await store.saveForm(sampleForm);
          showToast('Đã tạo biểu mẫu mẫu thành công!', 'success');
          await renderHome(container, signal);
        } catch (err) {
          showToast('Lỗi khi tạo: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '✨ Tạo biểu mẫu Thầy Cô giáo (Mẫu sẵn)';
        }
        return;
      }

      // Copy link
      const copyBtn = e.target.closest('.btn-copy-link');
      if (copyBtn) {
        e.preventDefault();
        const formId = copyBtn.dataset.formId;
        const url = `${window.location.origin}${window.location.pathname}#/form/${formId}`;
        try {
          await navigator.clipboard.writeText(url);
          showToast('Đã sao chép liên kết!', 'success');
        } catch {
          prompt('Sao chép liên kết:', url);
        }
      }

      // Delete form
      const deleteBtn = e.target.closest('.btn-delete-form');
      if (deleteBtn) {
        e.preventDefault();
        const formId = deleteBtn.dataset.formId;
        const confirmed = await showConfirm(
          'Xóa biểu mẫu?',
          'Biểu mẫu và tất cả phản hồi sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.'
        );
        if (confirmed) {
          deleteBtn.disabled = true;
          deleteBtn.textContent = '⏳';
          try {
            await store.deleteForm(formId);
            showToast('Đã xóa biểu mẫu', 'success');
            await renderHome(container, signal);
          } catch (err) {
            showToast('Lỗi khi xóa: ' + err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = '🗑️';
          }
        }
      }
    },
    { signal }
  );
}
