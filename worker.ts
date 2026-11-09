/**
 * Cloudflare Workers Edge Entrypoint for HouseSim
 * Serves static Vite build assets and provides edge API endpoints for scene presets and health checks.
 */

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Edge API endpoint for worker readiness & Chromebook optimization headers
    if (url.pathname === '/api/edge-info') {
      return new Response(
        JSON.stringify({
          app: 'HouseSim',
          runtime: 'Cloudflare Workers Edge',
          chromebookOptimized: true,
          webglHardwareAcceleration: 'enabled',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Permissions-Policy': 'camera=(self), microphone=(self)',
          },
        }
      );
    }

    // Serve SPA static assets via Cloudflare Workers Assets binding
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Permissions-Policy', 'camera=(self), microphone=(self)');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response('HouseSim Cloudflare Worker Active', { status: 200 });
  },
};
