// Long-running server entry (local dev, Replit, any Node host).
// The Vercel serverless entry is api/index.ts; both share server/app.ts.

import { createApp, loadEnv } from "./app";
import { setupVite, serveStatic, log } from "./vite";

loadEnv();

(async () => {
  const { app, server } = await createApp();

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
