import type { APIRoute } from 'astro';
import { jsonResponse } from '../_utils.js';

export const GET: APIRoute = async () => {
  return jsonResponse({ authenticated: true });
};
