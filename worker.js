export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const newHeaders = new Headers(response.headers);

    // Security Hardening Headers
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Immutable caching for hashed assets in /assets/
    const url = new URL(request.url);
    if (url.pathname.startsWith('/assets/')) {
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('sw.js') || url.pathname.endsWith('.webmanifest')) {
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    const hasNoBody = response.status === 101 || response.status === 204 || response.status === 205 || response.status === 304;

    return new Response(hasNoBody ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
