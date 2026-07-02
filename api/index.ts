// Vercel serverless entry: every /api/* request is rewritten here
// (see vercel.json) and handled by the shared Express app.
//
// The import target is generated during the Vercel build (see
// vercel.json buildCommand): esbuild bundles server/app.ts and its whole
// import tree into server-dist/app.mjs so no TypeScript path resolution
// happens inside the function runtime.

import type { IncomingMessage, ServerResponse } from "http";
// @ts-ignore — build artifact, produced by the buildCommand before functions are traced
import { createApp } from "../server-dist/app.mjs";

// App construction is amortized across invocations of a warm function.
const ready = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { app } = await ready;
  app(req, res);
}
