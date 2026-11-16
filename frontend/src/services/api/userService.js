import { httpClient } from './client';

export async function getUsers() {
  return httpClient.get('/api/user');
}

export async function deleteUser(id) {
  return httpClient.delete(`/api/user/${id}`);
}

export { register as createUser } from './authService';
