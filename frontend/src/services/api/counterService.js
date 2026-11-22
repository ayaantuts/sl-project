import { httpClient } from './client';

export async function getQueue(serviceId) {
  const res = await httpClient.get(`/api/queue/${serviceId}`);
  console.log('getQueue response:', res);
  return res;
}

export async function callNext(serviceId, counterId) {
  return httpClient.post(`/api/queue/${serviceId}/call-next`, { counterId });
}

export async function markArrived(id) {
  return httpClient.patch(`/api/token/${id}/arrived`);
}

export async function completeToken(id, notes) {
  return httpClient.patch(`/api/token/${id}/complete`, { notes });
}

export async function transferToken(id, { nextServiceId, notes }) {
  return httpClient.patch(`/api/token/${id}/transfer`, { nextServiceId, notes });
}

export async function markNoShow(id) {
  return httpClient.patch(`/api/token/${id}/no-show`);
}

export async function setPriority(id, { priorityTier, reason }) {
  return httpClient.patch(`/api/token/${id}/priority`, { priorityTier, reason });
}

export async function getServiceChangeRequests(domainId) {
  return httpClient.get(`/api/service-change/${domainId}`);
}

export async function decideServiceChange(id, decision) {
  return httpClient.patch(`/api/service-change/${id}`, { decision });
}

export async function getDisplayBoard(domainId) {
  return httpClient.get(`/api/queue/display/${domainId}`);
}
