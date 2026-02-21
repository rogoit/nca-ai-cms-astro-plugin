import { defineMiddleware } from 'astro:middleware';
import { getEnvVariable } from './utils/envUtils.js';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/login'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/editor';
}

function isAuthenticated(cookieValue: string | undefined): boolean {
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

export const onRequest = defineMiddleware(async ({ request, cookies, redirect }, next) => {
  const url = new URL(request.url);
  const { pathname } = url;

  if (isPublicPath(pathname)) {
    return next();
  }

  if (!isProtectedPath(pathname)) {
    return next();
  }

  const authCookie = cookies.get('editor-auth')?.value;

  if (isAuthenticated(authCookie)) {
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect('/login', 302);
});
