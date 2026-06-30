import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      // ponytail: serves DATA_DIR at /data in dev — set via npm run dev:local
      name: "local-data",
      configureServer(server) {
        const dir = process.env.DATA_DIR;
        if (!dir) return;
        const abs = path.resolve(dir);
        server.middlewares.use("/data", (req, res, next) => {
          const file = path.join(abs, req.url ?? "");
          fs.stat(file, (err, stat) => {
            if (err || !stat.isFile()) return next();
            res.setHeader("Content-Type", "application/json");
            fs.createReadStream(file).pipe(res);
          });
        });
      },
    },
  ],
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
