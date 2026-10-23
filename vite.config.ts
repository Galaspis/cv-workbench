import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function requestPath(req: IncomingMessage) {
  const raw = req.url ?? "/v1/messages";
  return raw.startsWith("/anthropic-api") ? raw.replace(/^\/anthropic-api/, "") || "/v1/messages" : raw;
}

async function handleAnthropic(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const apiKey = String(req.headers["x-api-key"] ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const auth = String(req.headers.authorization ?? "");
  const key = apiKey || auth.replace(/^Bearer\s+/i, "").trim();
  const targetPath = requestPath(req);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);

  try {
    const upstream = await fetch(`https://api.anthropic.com${targetPath}`, {
      method: req.method ?? "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body,
    });
    const text = await upstream.text();
    console.log(`[anthropic-proxy] ${req.method} ${targetPath} → ${upstream.status} keyLen=${key.length}`);
    res.statusCode = upstream.status;
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    res.end(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[anthropic-proxy] ${message}`);
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { type: "proxy_error", message } }));
  }
}

function attachAnthropicProxy(server: ViteDevServer) {
  server.middlewares.use("/anthropic-api", (req, res) => {
    void handleAnthropic(req, res);
  });
}

function anthropicProxyPlugin(): Plugin {
  return {
    name: "anthropic-proxy",
    configureServer(server) {
      attachAnthropicProxy(server);
    },
    configurePreviewServer(server) {
      attachAnthropicProxy(server);
    },
  };
}

export default defineConfig({
  plugins: [react(), anthropicProxyPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
