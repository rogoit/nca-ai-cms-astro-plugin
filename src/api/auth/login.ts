import type { APIRoute } from 'astro';
import { z } from 'zod';
import { jsonResponse, jsonError } from '../_utils.js';
import { getEnvVariable } from '../../utils/envUtils.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return jsonError('Username and password are required', 400);
  }

  const { username, password } = result.data;
  const expectedUsername = getEnvVariable('EDITOR_ADMIN');
  const expectedPassword = getEnvVariable('EDITOR_PASSWORD');

  if (username !== expectedUsername || password !== expectedPassword) {
    return jsonError('Invalid credentials', 401);
  }

  const token = btoa(`${username}:${password}`);

  cookies.set('editor-auth', token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return jsonResponse({ success: true });
};
