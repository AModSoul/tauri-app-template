import { describe, expect, it, vi } from "vitest";

import worker from "./index";

/** The Worker's bindings, with static assets that answer every request with "asset". */
function testEnv() {
  const fetch = vi.fn<(request: Request) => Promise<Response>>(async () => new Response("asset"));
  // A test double with only the parts of the bindings the Worker uses, so it's no full `Env`.
  const env = { ASSETS: { fetch } } as unknown as Env;
  return { env, assets: fetch };
}

const call = (path: string, method = "GET") =>
  worker.fetch(new Request(`https://example.com${path}`, { method }), testEnv().env);

describe("the site's Worker", () => {
  it("answers its routes", async () => {
    const response = await call("/api/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("refuses a method a route doesn't take, and a path it doesn't have", async () => {
    expect((await call("/api/health", "POST")).status).toBe(405);
    const missing = await call("/api/nothing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "No such endpoint" });
  });

  it("hands everything else to the static assets", async () => {
    const { env, assets } = testEnv();
    const response = await worker.fetch(new Request("https://example.com/download"), env);
    expect(await response.text()).toBe("asset");
    expect(assets).toHaveBeenCalledOnce();
  });
});
