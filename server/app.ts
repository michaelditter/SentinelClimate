// Shared Express app factory — used by both the long-running local server
// (server/index.ts) and the Vercel serverless function (api/index.ts).
// Deliberately does NOT import server/vite.ts: that module pulls the whole
// vite toolchain into the bundle, which has no place in a serverless function.

import fs from "fs";
import path from "path";
import express, { type Express, type Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { registerRoutes } from "./routes";

// Minimal .env loader — no dependency. Every process.env read in this
// codebase happens at request time, so loading here is early enough.
// Never overrides variables already set in the environment.
export function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  // Strip a UTF-8 BOM so the first key isn't silently dropped.
  const contents = fs.readFileSync(envPath, "utf-8").replace(/^﻿/, "");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    // dotenv-compatible: allow "export KEY=..." lines.
    const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, "");
    let value = trimmed.slice(eq + 1).trim();
    const quote = value[0] === '"' || value[0] === "'" ? value[0] : "";
    if (quote) {
      // Quoted value: take up to the matching close quote; anything after
      // (e.g. an inline comment) is ignored.
      const end = value.indexOf(quote, 1);
      if (end !== -1) value = value.slice(1, end);
    } else {
      // Unquoted value: cut at the first inline comment.
      const hash = value.indexOf("#");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function logLine(message: string): void {
  const t = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`${t} [express] ${message}`);
}

export async function createApp(): Promise<{ app: Express; server: Server }> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (reqPath.startsWith("/api")) {
        let line = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (line.length > 80) {
          line = line.slice(0, 79) + "…";
        }
        logLine(line);
      }
    });

    next();
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(status).json({ message });
  });

  return { app, server };
}
