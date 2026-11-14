import axios from 'axios';
import { API_BASE_URL } from '../../config/appConfig';
import { tokenStorage } from '../../utils/storage';

export class ApiClientError extends Error {
  constructor(status, message, data = null) {
    super(message || 'Something went wrong');
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Same header the backend `protect` middleware reads: "Authorization: Bearer <jwt>"
http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Extract `data` from a backend envelope, or throw if the envelope reports failure. */
export function unwrap(body) {
  if (body && body.success === false) {
    throw new ApiClientError(body.statusCode || 400, body.data?.message || body.message, body.data);
  }
  return body && Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : body;
}

/** Convert axios errors into ApiClientError. */
export function normalizeError(err) {
  if (err instanceof ApiClientError) return err;
  if (err?.isMockHttpError) {
    return new ApiClientError(err.status, err.body?.data?.message, err.body?.data);
  }
  if (err?.response) {
    const body = err.response.data;
    return new ApiClientError(
      err.response.status,
      body?.data?.message || body?.message || err.message,
      body?.data ?? null,
    );
  }
  if (err?.request) return new ApiClientError(0, 'Cannot reach the WaitLess server. Check your connection.');
  return new ApiClientError(500, err?.message || 'Unexpected error');
}

async function request(config) {
  try {
    const res = await http.request(config);
    return config.raw ? res.data : unwrap(res.data);
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Real HTTP helpers. `raw: true` returns the body untouched (used for GET / health). */
export const httpClient = {
  get: (url, config = {}) => request({ ...config, method: 'get', url }),
  post: (url, data, config = {}) => request({ ...config, method: 'post', url, data }),
  put: (url, data, config = {}) => request({ ...config, method: 'put', url, data }),
  patch: (url, data, config = {}) => request({ ...config, method: 'patch', url, data }),
  delete: (url, config = {}) => request({ ...config, method: 'delete', url }),
};