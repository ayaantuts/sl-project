import { httpClient } from './client';

export async function getDependents() {
  return httpClient.get('/api/dependent');
}

export async function createDependent(payload) {
  return httpClient.post('/api/dependent', payload);
}

export async function deleteDependent(id) {
  return httpClient.delete(`/api/dependent/${id}`);
}

export async function getDomainAnalytics(domainId) {
  return httpClient.get(`/api/analytics/${domainId}`);
}

export async function checkHealth() {
  const body = await httpClient.get('/', { raw: true });
  return body.data;
}
