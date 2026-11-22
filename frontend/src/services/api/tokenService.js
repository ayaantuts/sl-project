import { httpClient } from './client';

export async function joinQueue(payload) {
  return httpClient.post('/api/token', payload);
}

export async function getMyTokens() {
  return httpClient.get('/api/token');
}

export async function trackToken(ticketNumber) {
  return httpClient.get(`/api/token/track/${encodeURIComponent(ticketNumber)}`);
}

export async function cancelToken(id) {
  return httpClient.patch(`/api/token/${id}/cancel`);
}

export async function rejoinQueue(id) {
  return httpClient.patch(`/api/token/${id}/rejoin`);
}

export async function checkIn(id) {
  return httpClient.patch(`/api/token/${id}/check-in`);
}

export async function requestServiceChange(id, { toServiceId, reason }) {
  return httpClient.post(`/api/token/${id}/service-change`, { toServiceId, reason });
}

export async function getTokenEvents(id) {
  return httpClient.get(`/api/token/${id}/events`);
}

export async function completeToken(id) {
  return httpClient.patch(`/api/token/${id}/complete`);
}

export async function transferToken(id, toCounterId) {
  return httpClient.patch(`/api/token/${id}/transfer`, { toCounterId });
}

export async function markTokenNoShow(id) {
  return httpClient.patch(`/api/token/${id}/no-show`);
}

export async function setTokenPriority(id, priorityTier) {
  return httpClient.patch(`/api/token/${id}/priority`, { priorityTier });
}