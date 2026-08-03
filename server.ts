import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check route
const SERVER_BUILD_VERSION = "2026.07.27.0315";
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    version: SERVER_BUILD_VERSION,
    uptime: Math.floor(process.uptime()),
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OMNI-V50 Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
