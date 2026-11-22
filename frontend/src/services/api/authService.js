import { tokenStorage } from '../../utils/storage';
import { decodeJwt } from '../../utils/jwt';
import { httpClient } from './client';

export async function login({ email, password }) {
  const data = await httpClient.post('/api/auth/login', { email, password });
  tokenStorage.set(data.jwtToken);
  try {
    const { user } = await getMe();
    return { token: data.jwtToken, user };
  } catch {
    // Fallback: role from the JWT payload (backend signs { id, role })
    const payload = decodeJwt(data.jwtToken) || {};
    return { token: data.jwtToken, user: { _id: data.user.id, ...data.user, role: payload.role } };
  }
}

export async function register({ name, email, password, role }) {
  const body = { name, email, password, ...(role ? { role } : {}) };
  return httpClient.post('/api/auth/register', body);
}

export async function getMe() {
  return httpClient.get('/api/auth/me');
}

export function logout() {
  tokenStorage.clear();
}

export const hasStoredSession = () => Boolean(tokenStorage.get());
