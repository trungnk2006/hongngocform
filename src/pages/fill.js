// ================================
// Form Fill Page (Public)
// ================================

import { store } from '../store.js';
import {
  escapeHtml,
  formatFileSize,
  showToast,
  readFileAsDataUrl,
} from '../utils.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function renderFill(container, formId, signal) {
  // Show loading
  container.innerHTML = `
    <div class="loading-page">
      <div class="spinner"></div>
      <span class="loading-text">Đang tải biểu mẫu...</span>
    </div>
  `;

  const form = await store.getForm(formId);

  if (!form) {
    container.innerHTML = `
      <div class="page-404">
        <h1>😔</h1>
        <p>Biểu mẫu không tồn tại hoặc đã bị xóa</p>
        <a href="#/" class="btn btn-primary">Về trang chủ</a>
      </div>
    `;
    return;
  }

  // Track file data for each file question
  // fileData stores both the File object (for upload) and base64 data (for preview)
  const fileData = {};

  container.innerHTML = `
    <div class="fill-page">
      <div class="fill-container">
        <div class="fill-header card">
          <h1 class="fill-title">${escapeHtml(form.title)}</h1>
          ${form.description ? `<p class="fill-desc">${escapeHtml(form.description)}</p>` : ''}
          ${form.questions.some((q) => q.required) ? '<div class="fill-required-note"><span class="required-star">*</span> Câu hỏi bắt buộc</div>' : ''}
        </div>

        <form id="fill-form" novalidate>
          ${form.questions.map((q, i) => renderFillQuestion(q, i)).join('')}
          <div class="fill-submit-section">
            <button type="submit" class="btn btn-primary btn-lg" id="submit-form-btn">
              ✨ Gửi biểu mẫu
            </button>
          </div>
        </form>

        <div class="fill-branding">
          Hệ thống khảo sát trực tuyến <b>HongNgocForm</b>
        </div>
      </div>
    </div>
  `;

  setupFillEvents(container, form, fileData, signal);
}

function renderFillQuestion(question, index) {
  return `
    <div class="fill-question card" data-qid="${question.id}">
      <label class="fill-question-label">
        ${escapeHtml(question.text)}
        ${question.required ? '<span class="required-star"> *</span>' : ''}
      </label>
      <div class="fill-question-input">
        ${getQuestionInputHtml(question)}
      </div>
      <div class="fill-question-error" id="error-${question.id}"></div>
    </div>
  `;
}

function getQuestionInputHtml(question) {
  switch (question.type) {
    case 'text':
      return `
        <input
          type="text"
          class="form-input fill-input"
          name="${question.id}"
          id="input-${question.id}"
          placeholder="Nhập câu trả lời của bạn"
          autocomplete="off"
        >
      `;

    case 'choice':
      return question.options
        .map(
          (opt, i) => `
          <label class="radio-option">
            <input type="radio" name="${question.id}" value="${escapeHtml(opt)}" id="input-${question.id}-${i}">
            <span class="radio-custom"></span>
            <span class="radio-label">${escapeHtml(opt)}</span>
          </label>
        `
        )
        .join('');

    case 'file':
      return `
        <div class="dropzone" id="dropzone-${question.id}" data-qid="${question.id}">
          <div class="dropzone-content">
            <div class="dropzone-icon">📁</div>
            <p class="dropzone-text">Kéo thả tệp vào đây hoặc <span class="dropzone-link">chọn tệp</span></p>
            <p class="dropzone-hint">Tối đa 2MB • Hình ảnh, PDF, Word</p>
          </div>
          <input
            type="file"
            class="dropzone-input"
            id="file-${question.id}"
            data-qid="${question.id}"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          >
        </div>
        <div class="file-preview-container" id="preview-${question.id}"></div>
      `;

    default:
      return '';
  }
}

function setupFillEvents(container, form, fileData, signal) {
  // File input handling
  form.questions.forEach((q) => {
    if (q.type === 'file') {
      const fileInput = container.querySelector(`#file-${q.id}`);
      const dropzone = container.querySelector(`#dropzone-${q.id}`);

      if (fileInput) {
        fileInput.addEventListener(
          'change',
          (e) => {
            handleFileSelect(e.target.files[0], q.id, container, fileData);
          },
          { signal }
        );
      }

      if (dropzone) {
        dropzone.addEventListener(
          'dragover',
          (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
          },
          { signal }
        );

        dropzone.addEventListener(
          'dragleave',
          () => {
            dropzone.classList.remove('dragover');
          },
          { signal }
        );

        dropzone.addEventListener(
          'drop',
          (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files[0]) {
              handleFileSelect(
                e.dataTransfer.files[0],
                q.id,
                container,
                fileData
              );
            }
          },
          { signal }
        );
      }
    }
  });

  // File preview remove button
  container.addEventListener(
    'click',
    (e) => {
      const removeBtn = e.target.closest('.file-preview-remove');
      if (removeBtn) {
        const qid = removeBtn.dataset.qid;
        delete fileData[qid];
        const previewContainer = container.querySelector(`#preview-${qid}`);
        if (previewContainer) previewContainer.innerHTML = '';
        const dropzone = container.querySelector(`#dropzone-${qid}`);
        if (dropzone) dropzone.style.display = '';
        const fileInput = container.querySelector(`#file-${qid}`);
        if (fileInput) fileInput.value = '';
      }
    },
    { signal }
  );

  // Form submission
  const formEl = container.querySelector('#fill-form');
  formEl.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      await handleSubmit(container, form, fileData, signal);
    },
    { signal }
  );
}

async function handleFileSelect(file, questionId, container, fileData) {
  if (!file) return;

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    showToast(
      `Tệp "${file.name}" vượt quá 2MB. Vui lòng chọn tệp nhỏ hơn.`,
      'error'
    );
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);

    // Store both the File object (for Supabase upload) and the data URL (for preview)
    fileData[questionId] = {
      name: file.name,
      size: file.size,
      type: file.type,
      data: dataUrl, // for local preview
      file: file, // original File for upload
    };

    // Show preview
    const previewContainer = container.querySelector(
      `#preview-${questionId}`
    );
    const dropzone = container.querySelector(`#dropzone-${questionId}`);
    const isImage = file.type.startsWith('image/');

    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="file-preview">
          ${
            isImage
              ? `<img src="${dataUrl}" class="file-preview-thumb" alt="${escapeHtml(file.name)}">`
              : `<div class="file-preview-icon">📄</div>`
          }
          <div class="file-preview-info">
            <div class="file-preview-name">${escapeHtml(file.name)}</div>
            <div class="file-preview-size">${formatFileSize(file.size)}</div>
          </div>
          <button type="button" class="file-preview-remove" data-qid="${questionId}" title="Xóa tệp">✕</button>
        </div>
      `;
    }

    // Hide dropzone
    if (dropzone) dropzone.style.display = 'none';

    // Clear error
    const errorEl = container.querySelector(`#error-${questionId}`);
    if (errorEl) errorEl.textContent = '';
  } catch (err) {
    showToast('Không thể đọc tệp. Vui lòng thử lại.', 'error');
  }
}

async function handleSubmit(container, form, fileData, signal) {
  // Clear all errors
  container
    .querySelectorAll('.fill-question-error')
    .forEach((el) => (el.textContent = ''));

  // Validate first (before any uploads)
  const answers = {};
  let hasError = false;
  let firstErrorEl = null;

  for (const q of form.questions) {
    switch (q.type) {
      case 'text': {
        const input = container.querySelector(`#input-${q.id}`);
        const value = input ? input.value.trim() : '';
        answers[q.id] = value;

        if (q.required && !value) {
          showFieldError(container, q.id, 'Vui lòng nhập câu trả lời');
          if (!hasError) firstErrorEl = input;
          hasError = true;
        }
        break;
      }

      case 'choice': {
        const selected = container.querySelector(
          `input[name="${q.id}"]:checked`
        );
        const value = selected ? selected.value : '';
        answers[q.id] = value;

        if (q.required && !value) {
          showFieldError(container, q.id, 'Vui lòng chọn một đáp án');
          if (!hasError)
            firstErrorEl = container.querySelector(`[data-qid="${q.id}"]`);
          hasError = true;
        }
        break;
      }

      case 'file': {
        const fileInfo = fileData[q.id] || null;

        if (q.required && !fileInfo) {
          showFieldError(container, q.id, 'Vui lòng tải tệp lên');
          if (!hasError)
            firstErrorEl = container.querySelector(`#dropzone-${q.id}`);
          hasError = true;
        }
        // File answers will be set after upload
        break;
      }
    }
  }

  if (hasError) {
    showToast('Vui lòng điền đầy đủ các câu hỏi bắt buộc', 'error');
    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const card = firstErrorEl.closest('.fill-question');
      if (card) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 500);
      }
    }
    return;
  }

  // Disable submit button
  const submitBtn = container.querySelector('#submit-form-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang gửi...';
  }

  try {
    // Upload files via store.uploadFile
    for (const q of form.questions) {
      if (q.type === 'file') {
        const fileInfo = fileData[q.id];
        if (fileInfo && fileInfo.file) {
          if (submitBtn)
            submitBtn.textContent = `⏳ Đang tải lên ${fileInfo.name}...`;
          const uploadResult = await store.uploadFile(
            fileInfo.file,
            form.id,
            q.id
          );
          answers[q.id] = {
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type,
            ...uploadResult, // { url, storagePath } (Firebase) or { data } (localStorage)
          };
        } else {
          answers[q.id] = null;
        }
      }
    }

    if (submitBtn) submitBtn.textContent = '⏳ Đang lưu phản hồi...';

    // Save response
    await store.saveResponse(form.id, { answers });

    // Show success overlay
    container.innerHTML = `
      <div class="success-overlay">
        <div class="success-content">
          <div class="success-checkmark">✓</div>
          <h2>Đã gửi thành công!</h2>
          <p>Cảm ơn bạn đã hoàn thành biểu mẫu.<br>Phản hồi của bạn đã được ghi nhận.</p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" id="submit-another-btn">📝 Gửi phản hồi khác</button>
          </div>
        </div>
      </div>
    `;

    container
      .querySelector('#submit-another-btn')
      ?.addEventListener(
        'click',
        () => {
          window.location.hash = `#/form/${form.id}`;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        },
        { signal }
      );
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Lỗi khi gửi phản hồi: ' + err.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '✨ Gửi biểu mẫu';
    }
  }
}

function showFieldError(container, questionId, message) {
  const errorEl = container.querySelector(`#error-${questionId}`);
  if (errorEl) errorEl.textContent = message;
}
