// ================================
// Utility Functions
// ================================

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary dialog-cancel">Hủy</button>
          <button class="btn btn-danger dialog-confirm">Xác nhận</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.dialog-cancel').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector('.dialog-confirm').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateCsv(form, responses) {
  // UTF-8 BOM so Microsoft Excel correctly displays Vietnamese characters
  const BOM = '\uFEFF';

  // Build CSV headers: STT, Thời gian gửi, and form questions
  const headers = [
    'STT',
    'Thời gian gửi',
    ...(form.questions || []).map((q) => q.text || 'Câu hỏi'),
  ];

  const escapeCsvCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = '';
    if (typeof val === 'object') {
      if (val.name) {
        str = val.url ? `${val.name} (${val.url})` : val.name;
      } else {
        str = JSON.stringify(val);
      }
    } else {
      str = String(val);
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [headers.map(escapeCsvCell).join(',')];

  responses.forEach((resp, index) => {
    const row = [
      index + 1,
      formatDate(resp.submittedAt),
      ...(form.questions || []).map((q) => {
        const answer = resp.answers ? resp.answers[q.id] : '';
        return answer !== undefined ? answer : '';
      }),
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  });

  return BOM + rows.join('\r\n');
}

