import { getEnvVariable } from './envUtils.js';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/login'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

export function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/editor';
}

export function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  try {
    const decoded = atob(cookieValue);
    const [username, password] = decoded.split(':');
    const expectedUsername = getEnvVariable('EDITOR_ADMIN');
    const expectedPassword = getEnvVariable('EDITOR_PASSWORD');
    return username === expectedUsername && password === expectedPassword;
  } catch {
    return false;
  }
}
