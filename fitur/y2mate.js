// Auto-generated endpoint: /downloader/y2mate
// Scraper: scrape-y2mate.js

export default {
  route: {
    method: "get",
    path: "/downloader/y2mate",
    auth: false,
    tags: ["Scraper"],
    summary: "YouTube to MP3/MP4 via Y2Mate",
    description: "YouTube to MP3/MP4 via Y2Mate — scrape-y2mate.js",
  },
  handler: async (req, reply) => {
    try {
      const { join } = await import("path")
      const { pathToFileURL } = await import("url")
      const scraperPath = join(import.meta.dirname, "scrapers", "scrape-y2mate.js")
      let mod
      try {
        mod = await import(pathToFileURL(scraperPath).href)
      } catch(e) {
        const { createRequire } = await import("module")
        const require = createRequire(import.meta.url)
        mod = require(scraperPath)
      }
      const fn = mod.y2mate || mod.default?.y2mate || (typeof mod.default === "function" ? mod.default : null)
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
