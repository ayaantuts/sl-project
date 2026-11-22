import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config/appConfig';

export const EVENTS = Object.freeze({
  QUEUE_UPDATED: 'queue:updated',
  TOKEN_UPDATED: 'token:updated',
  TOKEN_CALLED: 'token:called',
  TOKEN_SHIFTED: 'token:shifted',
});

const listeners = new Map();

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event)?.delete(callback);
}

export function emitLocal(event, payload) {
  listeners.get(event)?.forEach((cb) => cb(payload));
  listeners.get('*')?.forEach((cb) => cb(event, payload));
}

let socket = null;
function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
    Object.values(EVENTS).forEach((evt) => socket.on(evt, (payload) => emitLocal(evt, payload)));
  }
  return socket;
}

export function joinRoom(room) {
  getSocket()?.emit('join_room', room);
}
export function leaveRoom(room) {
  getSocket()?.emit('leave_room', room);
}
