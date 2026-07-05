// National county autocomplete: GET /api/counties/search?q=<name>
// Backs the "analyze any US county" search box in the UI.

import type { Express } from "express";
import { searchCounties } from "../config/nationalCounties";

export function registerCountySearchRoutes(app: Express): void {
  app.get("/api/counties/search", (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      res.status(400).json({ error: "Query must be at least 2 characters" });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? Math.min(25, Math.max(1, rawLimit)) : 12;
    res.json(searchCounties(q, limit));
  });
}
