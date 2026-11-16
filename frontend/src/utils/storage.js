import { STORAGE_KEYS } from '../config/appConfig';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const session = {
  get(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const tokenStorage = {
  get: () => session.get(STORAGE_KEYS.authToken) ?? storage.get(STORAGE_KEYS.authToken),
  set: (token) => {
    session.set(STORAGE_KEYS.authToken, token);
    storage.set(STORAGE_KEYS.authToken, token);
  },
  clear: () => {
    session.remove(STORAGE_KEYS.authToken);
    storage.remove(STORAGE_KEYS.authToken);
  },
};
