// /info/country — Country info via Wikipedia API (action=parse, REST blocked)
// restcountries.com v3.1/v5 deprecated/blocked — using Wikipedia + first.org instead
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/country",
        auth: false,
        tags: ["Info"],
        summary: "Country info (Wikipedia)",
        description: "Cari informasi negara (ibukota, populasi, bendera, koordinat, deskripsi, bahasa) via Wikipedia API + first.org data.",
        parameters: [
            { name: "query", in: "query", required: true, description: "Nama negara atau kode ISO 2/3 huruf (mis. indonesia, ID, IDN)", schema: { type: "string", example: "indonesia" } },
        ],
        responses: { "200": { description: "Info negara" }, "400": { description: "Parameter tidak valid" }, "404": { description: "Negara tidak ditemukan" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.query || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        try {
            // Step 1: Resolve ISO code -> country name via first.org
            let countryName = q
            let countryCode = null
            let region = null
            try {
                const { data: first } = await axios.get(
                    `https://api.first.org/data/v1/countries?q=${encodeURIComponent(q)}`,
                    { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" }, validateStatus: () => true }
                )
                if (first?.data) {
                    const entries = Object.entries(first.data)
                    if (entries.length > 0) {
                        const [code, info] = entries[0]
                        countryCode = code
                        countryName = info.country
                        region = info.region
                    }
                }
            } catch {}

            const wikiName = countryName.charAt(0).toUpperCase() + countryName.slice(1)

            // Step 2: Use Wikipedia action=query API (REST API is Cloudflare-blocked)
            const { data: wikiResp, status } = await axios.get("https://en.wikipedia.org/w/api.php", {
                params: {
                    action: "query",
                    prop: "extracts|info|pageimages|coordinates|revisions",
                    rvprop: "content",
                    rvsection: 0,
                    exintro: 1,
                    explaintext: 1,
                    inprop: "url",
                    piprop: "thumbnail",
                    pithumbsize: 500,
                    format: "json",
                    titles: wikiName,
                    redirects: 1,
                },
                timeout: 10000,
                headers: {
                    "User-Agent": "KangwifiAPIs/1.0 (https://api.kangwifi.eu.org)",
                    "Accept": "application/json",
                },
                validateStatus: () => true,
            })

            if (status >= 400) {
                return res.status(502).json({ ok: false, error: `Wikipedia API error: HTTP ${status}` })
            }

            const pages = wikiResp?.query?.pages || {}
            const page = Object.values(pages)[0]

            if (!page || page.missing !== undefined) {
                return res.status(404).json({ ok: false, error: "Negara tidak ditemukan di Wikipedia" })
            }

            // Step 3: Try to parse infobox data from wikitext (capital, population, currency, languages)
            let capital = null
            let population = null
            let currency = null
            let languages = []
            const wikitext = page.revisions?.[0]?.["*"] || ""

            if (wikitext) {
                const capMatch = wikitext.match(/\|\s*capital\s*=\s*\{\{[^\}]*\[\[([^\]|]+)/i)
                            || wikitext.match(/\|\s*capital\s*=\s*\[\[([^\]|]+)/i)
                if (capMatch) capital = capMatch[1].trim()

                const popMatch = wikitext.match(/\|\s*population_estimate\s*=\s*([\d,\s]+)/i)
                            || wikitext.match(/\|\s*population\s*=\s*([\d,\s]+)/i)
                            || wikitext.match(/\|\s*pop_census\s*=\s*([\d,\s]+)/i)
                if (popMatch) {
                    const n = parseInt(popMatch[1].replace(/[\s,]/g, ""))
                    if (!isNaN(n)) population = n
                }

                const curMatch = wikitext.match(/\|\s*currency\s*=\s*\{\{[^\}]*\[\[([^\]|]+)/i)
                            || wikitext.match(/\|\s*currency\s*=\s*\[\[([^\]|]+)/i)
                if (curMatch) currency = curMatch[1].trim()

                const langMatch = wikitext.match(/\|\s*(?:official_languages|languages)\s*=\s*((?:\[\[[^\]]+\]\]|\{\{[^\}]+\}\}|\s|\|<[^>]+>[^<]*<\/[^>]+>)+)/i)
                if (langMatch) {
                    const langs = langMatch[1].match(/\[\[([^\]|]+)/g) || []
                    languages = [...new Set(langs.map(s => s.replace(/\[\[/, "").trim()))]
                        .filter(l => !l.match(/language$|languages$/i))
                        .slice(0, 5)
                }
            }

            res.json({
                ok: true,
                name: page.title,
                description: page.extract || null,
                country_code: countryCode,
                region: region,
                capital: capital,
                population: population,
                currency: currency,
                languages: languages.length ? languages : null,
                coordinates: page.coordinates?.[0]
                    ? { lat: page.coordinates[0].lat, lon: page.coordinates[0].lon }
                    : null,
                flag_url: page.thumbnail?.source || null,
                wikipedia_url: page.fullurl || null,
                source: "wikipedia.org",
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}
