// Auto-generated endpoint: /utils/tempmail-gist
// Scraper: tempmail.mjs

export default {
  route: {
    method: "get",
    path: "/utils/tempmail-gist",
    auth: false,
    tags: ["Scraper"],
    summary: "Temp Mail (Gist ESM)",
    description: "Temp Mail (Gist ESM) — tempmail.mjs",
  },
  handler: async (req, reply) => {
    try {
      const { join } = await import("path")
      const { pathToFileURL } = await import("url")
      const scraperPath = join(import.meta.dirname, "scrapers", "tempmail.mjs")
      let mod
      try {
        mod = await import(pathToFileURL(scraperPath).href)
      } catch(e) {
        const { createRequire } = await import("module")
        const require = createRequire(import.meta.url)
        mod = require(scraperPath)
      }
      const fn = mod.getEmail || mod.default?.getEmail || (typeof mod.default === "function" ? mod.default : null)
      if (typeof fn !== "function") {
        return { status: "error", error: "Function not found", available: Object.keys(mod) }
      }
      const q = req.query || {}
      const result = await fn(q.url || q.q || q.text || q.prompt || q, q)
      return { status: "success", data: result }
    } catch(e) {
      return { status: "error", error: e.message }
    }
  }
}
