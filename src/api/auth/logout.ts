import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('editor-auth', { path: '/' });
  return redirect('/login', 302);
};
