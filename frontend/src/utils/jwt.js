/** Decode the payload of a JWT without verifying it (the server verifies). */
export function decodeJwt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function isJwtExpired(payload, now = Date.now()) {
  return !payload || Boolean(payload.exp && payload.exp * 1000 < now);
}