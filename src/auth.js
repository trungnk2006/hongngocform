// ================================
// Admin Authentication & Access Control
// ================================

const SESSION_KEY = 'hngf_admin_session';
const PIN_STORAGE_KEY = 'hngf_custom_admin_pin';

// Default PIN if not configured in .env or localStorage
const DEFAULT_PIN = '123456';

export function getAdminPin() {
  const envPin = import.meta.env.VITE_ADMIN_PIN;
  if (envPin && String(envPin).trim()) {
    return String(envPin).trim();
  }
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
}

export function setCustomAdminPin(newPin) {
  if (newPin && String(newPin).trim()) {
    localStorage.setItem(PIN_STORAGE_KEY, String(newPin).trim());
    return true;
  }
  return false;
}

export function isAdminAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function verifyAdminPin(inputPin) {
  const correctPin = getAdminPin();
  if (String(inputPin).trim() === correctPin) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }
  return false;
}

export function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY);
}
