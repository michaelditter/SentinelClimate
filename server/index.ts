import fs from "fs";
import path from "path";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Minimal .env loader — no dependency. Runs before the server starts; every
// process.env read in this codebase happens at request time, so loading here
// is early enough. Never overrides variables already set in the environment.
(() => {
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
})();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve API and client on the same port. Defaults to 5000; override with
  // PORT (on macOS, AirPlay Receiver already listens on 5000).
  const port = Number(process.env.PORT) || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    // SO_REUSEPORT is Linux-only; passing true on macOS throws ENOTSUP at boot
    reusePort: process.platform === "linux",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
