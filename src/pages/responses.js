// ================================
// Responses Viewer Page
// ================================

import { store } from '../store.js';
import {
  escapeHtml,
  formatDate,
  formatFileSize,
  generateCsv,
  showToast,
  showConfirm,
} from '../utils.js';

let selectedResponseId = null;
let selectedFilterDate = '';
let currentForm = null;
let cachedResponses = [];
let selectedResponseIds = new Set();

function getLocalDateString(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

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

  currentForm = form;
  selectedResponseId = null;
  selectedFilterDate = '';
  selectedResponseIds.clear();
  cachedResponses = await store.getResponses(form.id);

  renderResponsesPageSkeleton(container, signal);
}

function getFilteredResponses() {
  if (!selectedFilterDate) return cachedResponses;
  return cachedResponses.filter(
    (r) => getLocalDateString(r.submittedAt) === selectedFilterDate
  );
}

function renderResponsesPageSkeleton(container, signal) {
  const allResponses = cachedResponses;
  const filteredResponses = getFilteredResponses();
  const form = currentForm;

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
          <div class="nav-actions" id="header-actions">
            ${
              allResponses.length > 0
                ? `
                  <button class="btn btn-primary btn-sm" id="export-csv-btn">📊 Xuất CSV (Excel)</button>
                  <button class="btn btn-secondary btn-sm" id="export-btn">📥 Xuất JSON</button>
                `
                : ''
            }
            <a href="#/form/${form.id}" class="btn btn-secondary btn-sm">👁️ Xem biểu mẫu</a>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card card">
            <div class="stat-value" id="stat-total-responses">${allResponses.length}</div>
            <div class="stat-label">Tổng phản hồi</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value" id="stat-filtered-responses">${selectedFilterDate ? filteredResponses.length : form.questions.length}</div>
            <div class="stat-label" id="stat-filtered-label">${selectedFilterDate ? 'Khớp bộ lọc' : 'Câu hỏi'}</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value" id="stat-latest-response">${allResponses.length > 0 ? formatDate(allResponses[allResponses.length - 1].submittedAt).split(',')[0] : '—'}</div>
            <div class="stat-label">Phản hồi gần nhất</div>
          </div>
        </div>

        <!-- Filter Toolbar -->
        ${
          allResponses.length > 0
            ? `
              <div class="filter-toolbar card" id="filter-toolbar-container">
                <div class="filter-toolbar-left">
                  <label for="filter-date-input" class="filter-label">
                    <span class="filter-icon">📅</span> Lọc theo ngày:
                  </label>
                  <div class="filter-input-wrapper">
                    <input 
                      type="date" 
                      id="filter-date-input" 
                      class="filter-date-input" 
                      value="${selectedFilterDate}"
                    />
                    <button 
                      class="btn-clear-date" 
                      id="clear-date-btn" 
                      title="Xóa chọn ngày" 
                      style="${selectedFilterDate ? '' : 'display: none;'}"
                    >✕</button>
                  </div>
                  <div class="filter-quick-buttons">
                    <button class="btn btn-sm ${selectedFilterDate === getLocalDateString(Date.now()) ? 'btn-primary' : 'btn-secondary'}" id="filter-today-btn">Hôm nay</button>
                    <button class="btn btn-sm ${!selectedFilterDate ? 'btn-primary' : 'btn-secondary'}" id="filter-all-btn">Tất cả</button>
                  </div>
                </div>
                <div class="filter-toolbar-right">
                  <span class="filter-count-badge" id="filter-count-badge">
                    ${
                      selectedFilterDate
                        ? `Ngày <strong>${formatDisplayDate(selectedFilterDate)}</strong>: <strong>${filteredResponses.length}</strong> / ${allResponses.length} phản hồi`
                        : `Tổng số: <strong>${allResponses.length}</strong> phản hồi`
                    }
                  </span>
                  ${
                    selectedFilterDate && filteredResponses.length > 0
                      ? `<button class="btn btn-danger btn-sm" id="delete-by-date-btn" title="Xóa tất cả phản hồi trong ngày ${formatDisplayDate(selectedFilterDate)}">🗑️ Xóa tất cả ngày này (${filteredResponses.length})</button>`
                      : ''
                  }
                </div>
              </div>
            `
            : ''
        }

        <!-- Response Detail or List -->
        <div id="responses-content">
          ${
            selectedResponseId
              ? renderResponseDetail(form, allResponses)
              : renderResponseList(form, filteredResponses, allResponses.length, selectedFilterDate)
          }
        </div>
      </div>
    </main>
  `;

  // Apply indeterminate state if needed
  const selectAllCheckbox = container.querySelector('#select-all-responses');
  if (selectAllCheckbox) {
    selectAllCheckbox.indeterminate = selectAllCheckbox.dataset.indeterminate === 'true';
  }

  setupResponsesEvents(container, signal);
}

function updateFilterView(container) {
  const allResponses = cachedResponses;
  const filteredResponses = getFilteredResponses();
  const form = currentForm;

  // Prune any deleted responses from selection
  const currentIds = new Set(cachedResponses.map((r) => r.id));
  for (const id of Array.from(selectedResponseIds)) {
    if (!currentIds.has(id)) {
      selectedResponseIds.delete(id);
    }
  }

  // 1. Update date input value
  const dateInput = container.querySelector('#filter-date-input');
  if (dateInput && dateInput.value !== selectedFilterDate) {
    dateInput.value = selectedFilterDate;
  }

  // 2. Update clear button visibility
  const clearBtn = container.querySelector('#clear-date-btn');
  if (clearBtn) {
    clearBtn.style.display = selectedFilterDate ? 'flex' : 'none';
  }

  // 3. Update quick buttons
  const todayStr = getLocalDateString(Date.now());
  const todayBtn = container.querySelector('#filter-today-btn');
  if (todayBtn) {
    todayBtn.className = `btn btn-sm ${selectedFilterDate === todayStr ? 'btn-primary' : 'btn-secondary'}`;
  }

  const allBtn = container.querySelector('#filter-all-btn');
  if (allBtn) {
    allBtn.className = `btn btn-sm ${!selectedFilterDate ? 'btn-primary' : 'btn-secondary'}`;
  }

  // 4. Update right toolbar (badge + delete by date button)
  const rightEl = container.querySelector('.filter-toolbar-right');
  if (rightEl) {
    rightEl.innerHTML = `
      <span class="filter-count-badge" id="filter-count-badge">
        ${
          selectedFilterDate
            ? `Ngày <strong>${formatDisplayDate(selectedFilterDate)}</strong>: <strong>${filteredResponses.length}</strong> / ${allResponses.length} phản hồi`
            : `Tổng số: <strong>${allResponses.length}</strong> phản hồi`
        }
      </span>
      ${
        selectedFilterDate && filteredResponses.length > 0
          ? `<button class="btn btn-danger btn-sm" id="delete-by-date-btn" title="Xóa tất cả phản hồi trong ngày ${formatDisplayDate(selectedFilterDate)}">🗑️ Xóa tất cả ngày này (${filteredResponses.length})</button>`
          : ''
      }
    `;
  }

  // 5. Update stat cards
  const statFilteredVal = container.querySelector('#stat-filtered-responses');
  const statFilteredLabel = container.querySelector('#stat-filtered-label');
  if (statFilteredVal && statFilteredLabel) {
    statFilteredVal.textContent = selectedFilterDate ? filteredResponses.length : form.questions.length;
    statFilteredLabel.textContent = selectedFilterDate ? 'Khớp bộ lọc' : 'Câu hỏi';
  }

  // 6. Update responses content
  const contentEl = container.querySelector('#responses-content');
  if (contentEl) {
    if (selectedResponseId) {
      contentEl.innerHTML = renderResponseDetail(form, allResponses);
    } else {
      contentEl.innerHTML = renderResponseList(form, filteredResponses, allResponses.length, selectedFilterDate);
      // Apply indeterminate state
      const selectAllCheckbox = contentEl.querySelector('#select-all-responses');
      if (selectAllCheckbox) {
        selectAllCheckbox.indeterminate = selectAllCheckbox.dataset.indeterminate === 'true';
      }
    }
  }
}

function renderResponseList(form, responses, totalCount, filterDate) {
  if (totalCount === 0) {
    return `
      <div class="no-responses">
        <div class="no-responses-icon">📭</div>
        <p>Chưa có phản hồi nào</p>
        <p style="font-size: 0.8rem; margin-top: 8px;">Chia sẻ liên kết biểu mẫu để nhận phản hồi</p>
      </div>
    `;
  }

  if (responses.length === 0) {
    return `
      <div class="no-responses card">
        <div class="no-responses-icon">🔍</div>
        <p>Không có phản hồi nào trong ngày <strong>${formatDisplayDate(filterDate)}</strong></p>
        <p style="font-size: 0.85rem; margin-top: 12px;">
          <button class="btn btn-sm btn-primary" id="reset-filter-btn">Xem tất cả phản hồi</button>
        </p>
      </div>
    `;
  }

  const selectedInCurrentView = responses.filter((r) => selectedResponseIds.has(r.id));
  const isAllSelected = responses.length > 0 && selectedInCurrentView.length === responses.length;
  const isSomeSelected = selectedInCurrentView.length > 0 && !isAllSelected;

  return `
    <div class="response-list-header">
      <div class="response-list-title-wrap">
        <h2>${filterDate ? `Phản hồi ngày ${formatDisplayDate(filterDate)} (${responses.length})` : `Tất cả phản hồi (${responses.length})`}</h2>
        <label class="select-all-label" title="Chọn tất cả phản hồi đang hiển thị">
          <input 
            type="checkbox" 
            id="select-all-responses" 
            class="response-select-checkbox"
            ${isAllSelected ? 'checked' : ''}
            ${isSomeSelected ? 'data-indeterminate="true"' : ''}
          />
          <span>Chọn tất cả (${responses.length})</span>
        </label>
      </div>
      ${
        selectedInCurrentView.length > 0
          ? `
            <div class="bulk-actions-bar">
              <span class="bulk-count-badge">Đã chọn <strong>${selectedInCurrentView.length}</strong></span>
              <button class="btn btn-danger btn-sm" id="bulk-delete-btn" title="Xóa các phản hồi đã chọn">
                🗑️ Xóa đã chọn (${selectedInCurrentView.length})
              </button>
              <button class="btn btn-secondary btn-sm" id="bulk-export-csv-btn" title="Xuất các phản hồi đã chọn sang file CSV">
                📊 Xuất đã chọn
              </button>
              <button class="btn btn-secondary btn-sm" id="bulk-deselect-btn" title="Bỏ chọn tất cả">
                ✕ Bỏ chọn
              </button>
            </div>
          `
          : ''
      }
    </div>
    <div class="response-list">
      ${responses
        .map((resp, i) => {
          const isSelected = selectedResponseIds.has(resp.id);
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
            <div class="response-item card ${isSelected ? 'selected' : ''}" data-response-id="${resp.id}" data-response-index="${i}">
              <div class="response-item-header">
                <div class="response-item-header-left">
                  <label class="response-checkbox-label" title="Chọn phản hồi này" onclick="event.stopPropagation()">
                    <input 
                      type="checkbox" 
                      class="response-select-checkbox item-checkbox" 
                      data-response-id="${resp.id}" 
                      ${isSelected ? 'checked' : ''}
                    />
                  </label>
                  <span class="response-item-number">Phản hồi #${i + 1}</span>
                </div>
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
    return renderResponseList(form, getFilteredResponses(), responses.length, selectedFilterDate);
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

function setupResponsesEvents(container, signal) {
  // Date input change event
  const dateInput = container.querySelector('#filter-date-input');
  if (dateInput) {
    dateInput.addEventListener(
      'input',
      (e) => {
        selectedFilterDate = e.target.value;
        selectedResponseId = null;
        selectedResponseIds.clear();
        updateFilterView(container);
      },
      { signal }
    );
  }

  // Checkbox change listener
  container.addEventListener(
    'change',
    (e) => {
      // Select All checkbox
      if (e.target.closest('#select-all-responses')) {
        const selectAll = e.target.closest('#select-all-responses');
        const filtered = getFilteredResponses();
        if (selectAll.checked) {
          filtered.forEach((r) => selectedResponseIds.add(r.id));
        } else {
          filtered.forEach((r) => selectedResponseIds.delete(r.id));
        }
        updateFilterView(container);
        return;
      }

      // Individual response checkbox
      if (e.target.closest('.item-checkbox')) {
        const chk = e.target.closest('.item-checkbox');
        const respId = chk.dataset.responseId;
        if (chk.checked) {
          selectedResponseIds.add(respId);
        } else {
          selectedResponseIds.delete(respId);
        }
        updateFilterView(container);
        return;
      }
    },
    { signal }
  );

  container.addEventListener(
    'click',
    async (e) => {
      // "Hôm nay" button
      if (e.target.closest('#filter-today-btn')) {
        selectedFilterDate = getLocalDateString(Date.now());
        selectedResponseId = null;
        selectedResponseIds.clear();
        updateFilterView(container);
        return;
      }

      // "Tất cả" button or "reset-filter-btn" or "clear-date-btn"
      if (
        e.target.closest('#filter-all-btn') ||
        e.target.closest('#reset-filter-btn') ||
        e.target.closest('#clear-date-btn')
      ) {
        selectedFilterDate = '';
        selectedResponseId = null;
        selectedResponseIds.clear();
        updateFilterView(container);
        return;
      }

      // Bulk Deselect button
      if (e.target.closest('#bulk-deselect-btn')) {
        selectedResponseIds.clear();
        updateFilterView(container);
        return;
      }

      // Bulk Delete button
      const bulkDeleteBtn = e.target.closest('#bulk-delete-btn');
      if (bulkDeleteBtn) {
        const targetResponses = getFilteredResponses().filter((r) => selectedResponseIds.has(r.id));
        if (targetResponses.length === 0) return;

        const count = targetResponses.length;
        const confirmed = await showConfirm(
          `Xóa ${count} phản hồi đã chọn?`,
          `Thao tác này sẽ xóa vĩnh viễn ${count} phản hồi đã chọn khỏi hệ thống. Bạn có chắc chắn muốn xóa không?`
        );

        if (confirmed) {
          bulkDeleteBtn.disabled = true;
          bulkDeleteBtn.textContent = '⏳ Đang xóa...';
          try {
            await store.deleteResponses(
              currentForm.id,
              targetResponses.map((r) => r.id)
            );
            targetResponses.forEach((r) => selectedResponseIds.delete(r.id));
            cachedResponses = await store.getResponses(currentForm.id);
            showToast(`Đã xóa thành công ${count} phản hồi!`, 'success');

            if (cachedResponses.length === 0) {
              renderResponsesPageSkeleton(container, signal);
            } else {
              const totalStat = container.querySelector('#stat-total-responses');
              if (totalStat) totalStat.textContent = cachedResponses.length;
              const latestStat = container.querySelector('#stat-latest-response');
              if (latestStat) {
                latestStat.textContent =
                  cachedResponses.length > 0
                    ? formatDate(cachedResponses[cachedResponses.length - 1].submittedAt).split(',')[0]
                    : '—';
              }
              updateFilterView(container);
            }
          } catch (err) {
            showToast('Lỗi khi xóa: ' + err.message, 'error');
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.textContent = `🗑️ Xóa đã chọn (${count})`;
          }
        }
        return;
      }

      // Bulk Export CSV button
      const bulkExportCsvBtn = e.target.closest('#bulk-export-csv-btn');
      if (bulkExportCsvBtn) {
        const targetResponses = cachedResponses.filter((r) => selectedResponseIds.has(r.id));
        if (targetResponses.length === 0) {
          showToast('Vui lòng chọn ít nhất một phản hồi để xuất', 'warning');
          return;
        }
        bulkExportCsvBtn.disabled = true;
        const originalText = bulkExportCsvBtn.textContent;
        bulkExportCsvBtn.textContent = '⏳ Đang xuất...';
        try {
          const csvData = generateCsv(currentForm, targetResponses);
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const safeTitle = currentForm.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
          a.href = url;
          a.download = `${safeTitle}_selected_${targetResponses.length}_responses.csv`;
          a.click();
          URL.revokeObjectURL(url);
          showToast(`Đã xuất ${targetResponses.length} phản hồi đã chọn sang file Excel (CSV)!`, 'success');
        } catch (err) {
          showToast('Lỗi khi xuất CSV: ' + err.message, 'error');
        }
        bulkExportCsvBtn.disabled = false;
        bulkExportCsvBtn.textContent = originalText;
        return;
      }

      // Click response item to view detail (ignore if clicked on checkbox label or input)
      const responseItem = e.target.closest('.response-item');
      if (responseItem && !e.target.closest('.response-checkbox-label') && !e.target.closest('.response-select-checkbox')) {
        selectedResponseId = responseItem.dataset.responseId;
        const contentEl = container.querySelector('#responses-content');
        if (contentEl) {
          contentEl.innerHTML = renderResponseDetail(currentForm, cachedResponses);
        }
        return;
      }

      // Back to list
      if (e.target.closest('#back-to-list-btn')) {
        selectedResponseId = null;
        updateFilterView(container);
        return;
      }

      // Delete single response
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
            await store.deleteResponse(currentForm.id, responseId);
            cachedResponses = await store.getResponses(currentForm.id);
            selectedResponseId = null;
            showToast('Đã xóa phản hồi', 'success');
            renderResponsesPageSkeleton(container, signal);
          } catch (err) {
            showToast('Lỗi khi xóa: ' + err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = '🗑️ Xóa';
          }
        }
        return;
      }

      // Delete all responses on selected date
      const deleteByDateBtn = e.target.closest('#delete-by-date-btn');
      if (deleteByDateBtn) {
        const targetResponses = getFilteredResponses();
        if (targetResponses.length === 0) return;

        const dateLabel = formatDisplayDate(selectedFilterDate);
        const count = targetResponses.length;
        const confirmed = await showConfirm(
          `Xóa tất cả phản hồi ngày ${dateLabel}?`,
          `Thao tác này sẽ xóa vĩnh viễn toàn bộ ${count} phản hồi đã gửi trong ngày ${dateLabel}. Bạn có chắc chắn muốn xóa không?`
        );

        if (confirmed) {
          deleteByDateBtn.disabled = true;
          deleteByDateBtn.textContent = '⏳ Đang xóa...';
          try {
            await store.deleteResponses(
              currentForm.id,
              targetResponses.map((r) => r.id)
            );
            cachedResponses = await store.getResponses(currentForm.id);
            selectedResponseId = null;
            showToast(
              `Đã xóa thành công ${count} phản hồi trong ngày ${dateLabel}!`,
              'success'
            );

            if (cachedResponses.length === 0) {
              renderResponsesPageSkeleton(container, signal);
            } else {
              const totalStat = container.querySelector('#stat-total-responses');
              if (totalStat) totalStat.textContent = cachedResponses.length;
              const latestStat = container.querySelector('#stat-latest-response');
              if (latestStat) {
                latestStat.textContent =
                  cachedResponses.length > 0
                    ? formatDate(cachedResponses[cachedResponses.length - 1].submittedAt).split(',')[0]
                    : '—';
              }
              updateFilterView(container);
            }
          } catch (err) {
            showToast('Lỗi khi xóa: ' + err.message, 'error');
            deleteByDateBtn.disabled = false;
            deleteByDateBtn.textContent = `🗑️ Xóa tất cả ngày này (${count})`;
          }
        }
        return;
      }

      // Export CSV button
      const exportCsvBtn = e.target.closest('#export-csv-btn');
      if (exportCsvBtn) {
        exportCsvBtn.disabled = true;
        const originalText = exportCsvBtn.textContent;
        exportCsvBtn.textContent = '⏳ Đang xuất CSV...';
        try {
          const targetResponses = getFilteredResponses();

          if (targetResponses.length === 0) {
            showToast('Không có dữ liệu phản hồi để xuất', 'warning');
            exportCsvBtn.disabled = false;
            exportCsvBtn.textContent = originalText;
            return;
          }

          const csvData = generateCsv(currentForm, targetResponses);
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const dateSuffix = selectedFilterDate ? `_${selectedFilterDate}` : '';
          const safeTitle = currentForm.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
          a.href = url;
          a.download = `${safeTitle}${dateSuffix}_responses.csv`;
          a.click();
          URL.revokeObjectURL(url);
          showToast(`Đã xuất ${targetResponses.length} phản hồi sang file Excel (CSV)!`, 'success');
        } catch (err) {
          showToast('Lỗi khi xuất CSV: ' + err.message, 'error');
        }
        exportCsvBtn.disabled = false;
        exportCsvBtn.textContent = originalText;
        return;
      }

      // Export JSON button
      if (e.target.closest('#export-btn')) {
        const exportBtn = e.target.closest('#export-btn');
        exportBtn.disabled = true;
        exportBtn.textContent = '⏳ Đang xuất...';
        try {
          const jsonData = await store.exportResponses(currentForm.id);
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = `${currentForm.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}_responses.json`;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Đã xuất dữ liệu phản hồi JSON!', 'success');
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

