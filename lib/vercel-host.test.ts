import { test } from "node:test";
import assert from "node:assert/strict";
import { isProtectedVercelHost } from "./vercel-host.ts";

test("flags protected Vercel aliases and deployment URLs", () => {
  assert.ok(isProtectedVercelHost("tracker-jokeduds-projects.vercel.app"));
  assert.ok(isProtectedVercelHost("TRACKER-jokeduds-projects.vercel.app:443"));
  assert.ok(isProtectedVercelHost("tracker-git-main-jokeduds-projects.vercel.app"));
  assert.ok(isProtectedVercelHost("tracker-git-feature-x-jokedud.vercel.app"));
  assert.ok(isProtectedVercelHost("tracker-a1b2c3d4e-jokeduds-projects.vercel.app"));
  assert.ok(isProtectedVercelHost("tracker-k3j9x8z7q.vercel.app"));
});

test("leaves production and custom domains alone", () => {
  assert.equal(isProtectedVercelHost("tracker.vercel.app"), false);
  assert.equal(isProtectedVercelHost("tracker-jokedud.vercel.app"), false);
  assert.equal(isProtectedVercelHost("email-tracker.vercel.app"), false);
  assert.equal(isProtectedVercelHost("go.yourbusiness.com"), false);
  assert.equal(isProtectedVercelHost("tracker-jokeduds-projects.vercel.app.evil.com"), false);
  assert.equal(isProtectedVercelHost("localhost:3000"), false);
  assert.equal(isProtectedVercelHost(null), false);
  assert.equal(isProtectedVercelHost(""), false);
});
