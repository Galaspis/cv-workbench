// Client for the hub's document store API (GET/PUT /api/data/<app>).
// The documents themselves stay in the app's own localStorage key; here we only remember the
// server version this device last saw and whether it has edits the server hasn't got yet.

export class CloudConflict extends Error {}
export class CloudUnavailable extends Error {}

export function cloudStore(app: string) {
  const path = `/api/data/${app}`;
  const versionKey = `cvw.cloud.${app}.version`;
  const pendingKey = `cvw.cloud.${app}.pending`;

  const read = (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const write = (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage blocked: sync still works for this session */
    }
  };

  let version = Number(read(versionKey) || 0);

  return {
    /** 0 means this device has never synced with the server. */
    get version() {
      return version;
    },
    get pending() {
      return read(pendingKey) === "1";
    },
    markPending() {
      write(pendingKey, "1");
    },

    async load<T>(): Promise<{ doc: T | null; version: number }> {
      let r: Response;
      try {
        r = await fetch(path, { credentials: "include", cache: "no-store" });
      } catch {
        throw new CloudUnavailable("offline");
      }
      if (r.status === 404) return { doc: null, version: 0 };
      const type = r.headers.get("Content-Type") ?? "";
      // The local dev server answers every path with index.html, so anything but JSON means "no store here".
      if (!r.ok || !type.includes("application/json")) throw new CloudUnavailable(`load failed (${r.status})`);
      const doc = (await r.json()) as T;
      return { doc, version: Number(r.headers.get("X-Version") || 0) };
    },

    async save(doc: unknown, expected: number) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (expected) headers["If-Match"] = String(expected);
      let r: Response;
      try {
        r = await fetch(path, { method: "PUT", credentials: "include", headers, body: JSON.stringify(doc) });
      } catch {
        throw new CloudUnavailable("offline");
      }
      if (r.status === 409) throw new CloudConflict("another device saved first");
      if (r.status === 400) throw new Error("Too large to sync (5 MB limit). Try smaller photos.");
      if (!r.ok) throw new CloudUnavailable(`save failed (${r.status})`);
      version = (await r.json()).version;
      write(versionKey, String(version));
      write(pendingKey, null);
      return version;
    },

    /** Server copy accepted as-is (nothing local to send). */
    accept(v: number) {
      version = v;
      write(versionKey, String(v));
      write(pendingKey, null);
    },
  };
}
