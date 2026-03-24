import type { APIContext } from 'astro';

export function getPublicOrigin(context: APIContext): string {
  if (context.site) {
    return context.site.toString().replace(/\/+$/, '');
  }

  const proto = context.request.headers.get('x-forwarded-proto');
  const host = context.request.headers.get('x-forwarded-host');
  if (proto && host) {
    return `${proto}://${host}`;
  }

  return context.url.origin;
}
