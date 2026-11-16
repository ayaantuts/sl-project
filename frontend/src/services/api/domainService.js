import { httpClient } from './client';

export async function getDomains() {
  return httpClient.get('/api/domain');
}

export async function getPublicDomains() {
  return httpClient.get('/api/domain/');
}

export async function getDomainById(id) {
  const { domains } = await getDomains();
  return domains.find((d) => d._id === id) || null;
}

export async function createDomain(payload) {
  return httpClient.post('/api/domain', payload);
}

export async function updateDomain(id, payload) {
  return httpClient.put(`/api/domain/${id}`, payload);
}

export async function deleteDomain(id) {
  return httpClient.delete(`/api/domain/${id}`);
}
