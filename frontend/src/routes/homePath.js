import { ROLES } from '../config/appConfig';

export function homePathFor(role) {
  if (role === ROLES.USER) return '/my-tokens';
  if (role === ROLES.MODERATOR) return '/console';
  if (role === ROLES.ADMIN) return '/analytics';
  return '/login';
}
