// Auto-generated endpoint: /scraper/clone
// Scraper: scrape-clonewebsite.js

export default {
  route: {
    method: "get",
    path: "/scraper/clone",
    auth: false,
    tags: ["Scraper"],
    summary: "Clone Website",
    description: "Clone Website — scrape-clonewebsite.js",
  },
  handler: async (req, reply) => {
    try {
      const { join } = await import("path")
      const { pathToFileURL } = await import("url")
      const scraperPath = join(import.meta.dirname, "scrapers", "scrape-clonewebsite.js")
      let mod
      try {
        mod = await import(pathToFileURL(scraperPath).href)
      } catch(e) {
        const { createRequire } = await import("module")
        const require = createRequire(import.meta.url)
        mod = require(scraperPath)
      }
      const fn = mod.clone || mod.default?.clone || (typeof mod.default === "function" ? mod.default : null)
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
