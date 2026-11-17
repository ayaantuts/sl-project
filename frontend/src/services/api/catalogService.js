import { httpClient } from './client';

export async function getServices({ domainId } = {}) {
  return httpClient.get(`/api/service/${domainId}`);
}

export async function createService(payload) {
  return httpClient.post('/api/service', payload);
}

export async function updateService(id, payload) {
  return httpClient.put(`/api/service/${id}`, payload);
}

export async function deleteService(id) {
  return httpClient.delete(`/api/service/${id}`);
}
