// ================================
// Responses Viewer Page
// ================================

import { store } from '../store.js';
import {
  escapeHtml,
  formatDate,
  formatFileSize,
  showToast,
  showConfirm,
} from '../utils.js';

let selectedResponseId = null;

export async function renderResponses(container, formId, signal) {
  // Show loading
  container.innerHTML = `
    <div class="loading-page">
      <div class="spinner"></div>
      <span class="loading-text">Đang tải phản hồi...</span>
    </div>
  `;

  const form = await store.getForm(formId);

  if (!form) {
    container.innerHTML = `
      <div class="page-404">
        <h1>😔</h1>
        <p>Biểu mẫu không tồn tại</p>
        <a href="#/" class="btn btn-primary">Về trang chủ</a>
      </div>
    `;
    return;
  }

  selectedResponseId = null;
  await renderResponsesPage(container, form, signal);
}

async function renderResponsesPage(container, form, signal) {
  const responses = await store.getResponses(form.id);

  container.innerHTML = `
    <nav class="nav">
      <a href="#/" class="nav-brand">
        <span class="brand-icon">📝</span>
        <span>Hong<span class="brand-accent">Ngoc</span>Form</span>
      </a>
      <div class="nav-actions">
        <a href="#/" class="nav-link">← Quay lại</a>
      </div>
    </nav>
    <main class="page">
      <div class="container">
        <div class="page-header">
          <div>
            <h1 class="page-title">📊 Phản hồi</h1>
            <p class="page-subtitle">${escapeHtml(form.title)}</p>
          </div>
          <div class="nav-actions">
            ${
              responses.length > 0
                ? `<button class="btn btn-secondary btn-sm" id="export-btn">📥 Xuất JSON</button>`
                : ''
            }
            <a href="#/form/${form.id}" class="btn btn-secondary btn-sm">👁️ Xem biểu mẫu</a>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card card">
            <div class="stat-value">${responses.length}</div>
            <div class="stat-label">Tổng phản hồi</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">${form.questions.length}</div>
            <div class="stat-label">Câu hỏi</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">${responses.length > 0 ? formatDate(responses[responses.length - 1].submittedAt).split(',')[0] : '—'}</div>
            <div class="stat-label">Phản hồi gần nhất</div>
          </div>
        </div>

        <!-- Response Detail or List -->
        <div id="responses-content">
          ${selectedResponseId ? renderResponseDetail(form, responses) : renderResponseList(form, responses)}
        </div>
      </div>
    </main>
  `;

  setupResponsesEvents(container, form, signal);
}

function renderResponseList(form, responses) {
  if (responses.length === 0) {
    return `
      <div class="no-responses">
        <div class="no-responses-icon">📭</div>
        <p>Chưa có phản hồi nào</p>
        <p style="font-size: 0.8rem; margin-top: 8px;">Chia sẻ liên kết biểu mẫu để nhận phản hồi</p>
      </div>
    `;
  }

  return `
    <div class="response-list-header">
      <h2>Tất cả phản hồi (${responses.length})</h2>
    </div>
    <div class="response-list">
      ${responses
        .map((resp, i) => {
          // Get preview text from first text/choice answer
          let preview = '';
          for (const q of form.questions) {
            const answer = resp.answers[q.id];
            if ((q.type === 'text' || q.type === 'choice') && answer) {
              preview = typeof answer === 'string' ? answer : '';
              if (preview) break;
            }
          }

          return `
            <div class="response-item card" data-response-id="${resp.id}" data-response-index="${i}">
              <div class="response-item-header">
                <span class="response-item-number">Phản hồi #${i + 1}</span>
                <span class="response-item-date">${formatDate(resp.submittedAt)}</span>
              </div>
              ${preview ? `<div class="response-item-preview">${escapeHtml(preview)}</div>` : ''}
            </div>
          `;
        })
        .reverse()
        .join('')}
    </div>
  `;
}

function renderResponseDetail(form, responses) {
  const resp = responses.find((r) => r.id === selectedResponseId);
  if (!resp) {
    selectedResponseId = null;
    return renderResponseList(form, responses);
  }

  const index = responses.indexOf(resp);

  return `
    <div class="response-detail card">
      <div class="response-detail-header">
        <div>
          <div class="response-detail-title">Phản hồi #${index + 1}</div>
          <div class="response-detail-date">${formatDate(resp.submittedAt)}</div>
        </div>
        <div class="response-detail-actions">
          <button class="btn btn-sm btn-secondary" id="back-to-list-btn">← Danh sách</button>
          <button class="btn btn-sm btn-danger" id="delete-response-btn" data-response-id="${resp.id}">🗑️ Xóa</button>
        </div>
      </div>
      <div class="response-answer-list">
        ${form.questions
          .map((q) => {
            const answer = resp.answers[q.id];
            return `
              <div class="response-answer">
                <div class="response-answer-label">${escapeHtml(q.text)}</div>
                ${renderAnswerValue(q, answer)}
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderAnswerValue(question, answer) {
  if (
    !answer ||
    (typeof answer === 'string' && !answer.trim())
  ) {
    return '<div class="response-answer-value empty">Không có câu trả lời</div>';
  }

  switch (question.type) {
    case 'text':
      return `<div class="response-answer-value">${escapeHtml(answer)}</div>`;

    case 'choice':
      return `<div class="response-answer-value">🔘 ${escapeHtml(answer)}</div>`;

    case 'file':
      if (typeof answer === 'object') {
        const isImage = answer.type && answer.type.startsWith('image/');
        // Support both Supabase (url) and localStorage (data) modes
        const src = answer.url || answer.data;

        if (src && isImage) {
          return `
            <div class="response-answer-value">
              📎 ${escapeHtml(answer.name)} (${formatFileSize(answer.size)})
              <br>
              <img
                src="${src}"
                alt="${escapeHtml(answer.name)}"
                class="response-answer-image"
                data-full-src="${src}"
              >
            </div>
          `;
        } else if (src) {
          return `
            <div class="response-answer-value">
              <a href="${src}" target="_blank" download="${escapeHtml(answer.name)}" class="response-answer-file-link">
                📄 ${escapeHtml(answer.name)} (${formatFileSize(answer.size)}) — Tải xuống
              </a>
            </div>
          `;
        }
      }
      return '<div class="response-answer-value empty">Tệp không khả dụng</div>';

    default:
      return `<div class="response-answer-value">${escapeHtml(String(answer))}</div>`;
  }
}

function setupResponsesEvents(container, form, signal) {
  container.addEventListener(
    'click',
    async (e) => {
      // Click response item to view detail
      const responseItem = e.target.closest('.response-item');
      if (responseItem) {
        selectedResponseId = responseItem.dataset.responseId;
        const contentEl = container.querySelector('#responses-content');
        const responses = await store.getResponses(form.id);
        if (contentEl) {
          contentEl.innerHTML = renderResponseDetail(form, responses);
        }
        return;
      }

      // Back to list
      if (e.target.closest('#back-to-list-btn')) {
        selectedResponseId = null;
        const contentEl = container.querySelector('#responses-content');
        const responses = await store.getResponses(form.id);
        if (contentEl) {
          contentEl.innerHTML = renderResponseList(form, responses);
        }
        return;
      }

      // Delete response
      const deleteBtn = e.target.closest('#delete-response-btn');
      if (deleteBtn) {
        const responseId = deleteBtn.dataset.responseId;
        const confirmed = await showConfirm(
          'Xóa phản hồi?',
          'Phản hồi này sẽ bị xóa vĩnh viễn.'
        );
        if (confirmed) {
          deleteBtn.disabled = true;
          deleteBtn.textContent = '⏳';
          try {
            await store.deleteResponse(form.id, responseId);
            selectedResponseId = null;
            showToast('Đã xóa phản hồi', 'success');
            await renderResponsesPage(container, form, signal);
          } catch (err) {
            showToast('Lỗi khi xóa: ' + err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = '🗑️ Xóa';
          }
        }
        return;
      }

      // Export button
      if (e.target.closest('#export-btn')) {
        const exportBtn = e.target.closest('#export-btn');
        exportBtn.disabled = true;
        exportBtn.textContent = '⏳ Đang xuất...';
        try {
          const jsonData = await store.exportResponses(form.id);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${form.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}_responses.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Đã xuất dữ liệu phản hồi!', 'success');
        } catch (err) {
          showToast('Lỗi khi xuất: ' + err.message, 'error');
        }
        exportBtn.disabled = false;
        exportBtn.textContent = '📥 Xuất JSON';
        return;
      }

      // Image lightbox
      const img = e.target.closest('.response-answer-image');
      if (img) {
        const fullSrc = img.dataset.fullSrc;
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = `<img src="${fullSrc}" alt="Ảnh phóng to">`;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
        return;
      }
    },
    { signal }
  );
}
