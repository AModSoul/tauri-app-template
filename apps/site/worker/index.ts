// The site's Worker. Cloudflare serves the pages Astro built in `dist` by itself; requests for
// the paths in wrangler.jsonc's `run_worker_first` (`/api/*`) come here first. Add a route to
// `ROUTES`, and anything else that reaches the Worker is handed to the static assets.
//
// It runs on Cloudflare's runtime, not in a browser or Node: `Env` and the runtime's types come
// from `pnpm --filter site cf-typegen` (worker-configuration.d.ts).

/** A route's handler: the request, and the Worker's bindings. */
type Handler = (request: Request, env: Env) => Response | Promise<Response>;

/** The Worker's routes, by method and path. */
const ROUTES: Record<string, Handler> = {
  /** Says the Worker is up. An example: replace it with the site's first real route. */
  "GET /api/health": () => json({ ok: true }),
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const route = ROUTES[`${request.method} ${url.pathname}`];
    if (route) return route(request, env);
    if (url.pathname.startsWith("/api/")) {
      const known = Object.keys(ROUTES).some((key) => key.endsWith(` ${url.pathname}`));
      return known
        ? json({ error: "Method not allowed" }, 405)
        : json({ error: "No such endpoint" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/** A JSON response, never cached by browsers or Cloudflare unless a route says otherwise. */
function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
