// ================================
// Form Builder Page
// ================================

import { store } from '../store.js';
import { escapeHtml, generateId, showToast } from '../utils.js';

let formState = null;
let isEditing = false;

export async function renderBuilder(container, formId, signal) {
  if (formId) {
    // Show loading
    container.innerHTML = `
      <div class="loading-page">
        <div class="spinner"></div>
        <span class="loading-text">Đang tải biểu mẫu...</span>
      </div>
    `;

    const form = await store.getForm(formId);
    if (!form) {
      window.location.hash = '#/';
      return;
    }
    formState = JSON.parse(JSON.stringify(form)); // deep clone
    isEditing = true;
  } else {
    formState = {
      id: null,
      title: '',
      description: '',
      questions: [],
    };
    isEditing = false;
  }

  renderPage(container, signal);
}

function renderPage(container, signal) {
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
      <div class="builder-container">
        <div class="builder-header card">
          <input
            type="text"
            class="form-title-input"
            id="form-title"
            value="${escapeHtml(formState.title)}"
            placeholder="Tiêu đề biểu mẫu"
            maxlength="200"
          >
          <textarea
            class="form-desc-input"
            id="form-desc"
            placeholder="Mô tả biểu mẫu (tùy chọn)"
            maxlength="1000"
          >${escapeHtml(formState.description)}</textarea>
        </div>

        <div id="questions-container">
          ${formState.questions.map((q, i) => renderQuestionCard(q, i)).join('')}
        </div>

        <button class="add-question-btn" id="add-question-btn">
          ＋ Thêm câu hỏi
        </button>

        <div class="builder-actions">
          <a href="#/" class="btn btn-secondary">Hủy</a>
          <button class="btn btn-primary btn-lg" id="save-form-btn">
            ${isEditing ? '💾 Cập nhật biểu mẫu' : '✨ Tạo biểu mẫu'}
          </button>
        </div>
      </div>
    </main>
  `;

  setupBuilderEvents(container, signal);
}

function renderQuestionCard(question, index) {
  const total = formState.questions.length;
  return `
    <div class="question-card card" data-index="${index}" data-qid="${question.id}">
      <div class="question-card-header">
        <div class="question-number">${index + 1}</div>
        <select class="question-type-select" data-index="${index}">
          <option value="text" ${question.type === 'text' ? 'selected' : ''}>📝 Văn bản</option>
          <option value="choice" ${question.type === 'choice' ? 'selected' : ''}>🔘 Trắc nghiệm</option>
          <option value="file" ${question.type === 'file' ? 'selected' : ''}>📁 Tải tệp lên</option>
        </select>
        <div class="question-actions">
          ${index > 0 ? `<button class="btn btn-sm btn-icon btn-ghost btn-move-up" data-index="${index}" title="Di chuyển lên">↑</button>` : ''}
          ${index < total - 1 ? `<button class="btn btn-sm btn-icon btn-ghost btn-move-down" data-index="${index}" title="Di chuyển xuống">↓</button>` : ''}
          <button class="btn btn-sm btn-icon btn-danger btn-delete-question" data-index="${index}" title="Xóa câu hỏi">✕</button>
        </div>
      </div>
      <div class="question-card-body">
        <input
          type="text"
          class="question-text-input"
          data-index="${index}"
          value="${escapeHtml(question.text)}"
          placeholder="Nhập nội dung câu hỏi"
          maxlength="500"
        >
        ${question.type === 'choice' ? renderChoiceOptions(question, index) : ''}
        ${question.type === 'file' ? '<p class="file-hint">Người trả lời có thể tải tệp lên (tối đa 2MB)</p>' : ''}
      </div>
      <div class="question-card-footer">
        <label class="toggle-container">
          <input type="checkbox" class="question-required-toggle" data-index="${index}" ${question.required ? 'checked' : ''}>
          <span>Bắt buộc</span>
        </label>
      </div>
    </div>
  `;
}

function renderChoiceOptions(question, qIndex) {
  return `
    <div class="options-list" data-q-index="${qIndex}">
      ${question.options
        .map(
          (opt, oIndex) => `
        <div class="option-item">
          <span class="option-radio">○</span>
          <input
            type="text"
            class="option-text-input"
            data-q-index="${qIndex}"
            data-o-index="${oIndex}"
            value="${escapeHtml(opt)}"
            placeholder="Lựa chọn ${oIndex + 1}"
            maxlength="200"
          >
          ${
            question.options.length > 1
              ? `<button class="btn btn-sm btn-icon btn-ghost btn-remove-option" data-q-index="${qIndex}" data-o-index="${oIndex}" title="Xóa lựa chọn">✕</button>`
              : ''
          }
        </div>
      `
        )
        .join('')}
      <button class="btn-add-option" data-q-index="${qIndex}">＋ Thêm lựa chọn</button>
    </div>
  `;
}

function rerenderQuestions() {
  const questionsContainer = document.getElementById('questions-container');
  if (questionsContainer) {
    questionsContainer.innerHTML = formState.questions
      .map((q, i) => renderQuestionCard(q, i))
      .join('');
  }
}

function setupBuilderEvents(container, signal) {
  // Form title
  const titleInput = container.querySelector('#form-title');
  titleInput.addEventListener('input', (e) => {
    formState.title = e.target.value;
  }, { signal });

  // Form description
  const descInput = container.querySelector('#form-desc');
  descInput.addEventListener('input', (e) => {
    formState.description = e.target.value;
  }, { signal });

  // Add question
  container.querySelector('#add-question-btn').addEventListener('click', () => {
    formState.questions.push({
      id: generateId(),
      text: '',
      type: 'text',
      required: false,
      options: [],
    });
    rerenderQuestions();
    setTimeout(() => {
      const cards = container.querySelectorAll('.question-card');
      const last = cards[cards.length - 1];
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, { signal });

  // Save form
  container.querySelector('#save-form-btn').addEventListener('click', () => {
    saveForm(container, signal);
  }, { signal });

  // Delegated click events
  container.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.btn-delete-question');
    if (delBtn) {
      formState.questions.splice(parseInt(delBtn.dataset.index), 1);
      rerenderQuestions();
      return;
    }

    const upBtn = e.target.closest('.btn-move-up');
    if (upBtn) {
      const idx = parseInt(upBtn.dataset.index);
      [formState.questions[idx - 1], formState.questions[idx]] = [
        formState.questions[idx], formState.questions[idx - 1],
      ];
      rerenderQuestions();
      return;
    }

    const downBtn = e.target.closest('.btn-move-down');
    if (downBtn) {
      const idx = parseInt(downBtn.dataset.index);
      [formState.questions[idx], formState.questions[idx + 1]] = [
        formState.questions[idx + 1], formState.questions[idx],
      ];
      rerenderQuestions();
      return;
    }

    const removeOptBtn = e.target.closest('.btn-remove-option');
    if (removeOptBtn) {
      const qi = parseInt(removeOptBtn.dataset.qIndex);
      const oi = parseInt(removeOptBtn.dataset.oIndex);
      formState.questions[qi].options.splice(oi, 1);
      rerenderQuestions();
      return;
    }

    const addOptBtn = e.target.closest('.btn-add-option');
    if (addOptBtn) {
      const qi = parseInt(addOptBtn.dataset.qIndex);
      formState.questions[qi].options.push(
        `Lựa chọn ${formState.questions[qi].options.length + 1}`
      );
      rerenderQuestions();
      return;
    }
  }, { signal });

  // Delegated change events
  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('question-type-select')) {
      const idx = parseInt(e.target.dataset.index);
      const newType = e.target.value;
      formState.questions[idx].type = newType;
      if (newType === 'choice' && formState.questions[idx].options.length === 0) {
        formState.questions[idx].options = ['Lựa chọn 1', 'Lựa chọn 2'];
      }
      rerenderQuestions();
      return;
    }

    if (e.target.classList.contains('question-required-toggle')) {
      formState.questions[parseInt(e.target.dataset.index)].required = e.target.checked;
      return;
    }
  }, { signal });

  // Delegated input events
  container.addEventListener('input', (e) => {
    if (e.target.classList.contains('question-text-input')) {
      formState.questions[parseInt(e.target.dataset.index)].text = e.target.value;
      return;
    }
    if (e.target.classList.contains('option-text-input')) {
      const qi = parseInt(e.target.dataset.qIndex);
      const oi = parseInt(e.target.dataset.oIndex);
      formState.questions[qi].options[oi] = e.target.value;
      return;
    }
  }, { signal });
}

async function saveForm(container, signal) {
  // Validate title
  if (!formState.title.trim()) {
    showToast('Vui lòng nhập tiêu đề biểu mẫu', 'error');
    const titleEl = container.querySelector('#form-title');
    titleEl.classList.add('error');
    titleEl.focus();
    titleEl.addEventListener('input', () => titleEl.classList.remove('error'), { once: true });
    return;
  }

  if (formState.questions.length === 0) {
    showToast('Vui lòng thêm ít nhất một câu hỏi', 'error');
    return;
  }

  for (let i = 0; i < formState.questions.length; i++) {
    if (!formState.questions[i].text.trim()) {
      showToast(`Câu hỏi ${i + 1} chưa có nội dung`, 'error');
      const inputs = container.querySelectorAll('.question-text-input');
      if (inputs[i]) {
        inputs[i].focus();
        inputs[i].closest('.question-card')?.classList.add('shake');
        setTimeout(() => inputs[i].closest('.question-card')?.classList.remove('shake'), 500);
      }
      return;
    }
    if (formState.questions[i].type === 'choice') {
      if (formState.questions[i].options.length < 2) {
        showToast(`Câu hỏi ${i + 1} cần ít nhất 2 lựa chọn`, 'error');
        return;
      }
      for (let j = 0; j < formState.questions[i].options.length; j++) {
        if (!formState.questions[i].options[j].trim()) {
          showToast(`Câu hỏi ${i + 1} có lựa chọn trống`, 'error');
          return;
        }
      }
    }
  }

  // Disable save button
  const saveBtn = container.querySelector('#save-form-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Đang lưu...';

  try {
    await store.saveForm(formState);
    showToast(isEditing ? 'Đã cập nhật biểu mẫu!' : 'Đã tạo biểu mẫu thành công!', 'success');
    window.location.hash = '#/';
  } catch (err) {
    showToast('Lỗi khi lưu: ' + err.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = isEditing ? '💾 Cập nhật biểu mẫu' : '✨ Tạo biểu mẫu';
  }
}
