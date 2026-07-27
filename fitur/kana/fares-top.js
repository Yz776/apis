// Auto-generated from r2-kana.vercel.app snippet "fares.top.js" (LYBWup)
// Source: https://r2-kana.vercel.app/#/snippet/LYBWup
// Description: Search & detail game by id

const base = "https://fares.top"
const headers = {
    "user-agent": "mozilla/5.0 (linux; android 10; k) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 mobile safari/537.36",
    "referer": "https://fares.top/",
    "accept": "application/json",
    "accept-language": "id-id,id;q=0.9,en;q=0.8",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

const get = async(url) => {
    try {
        const r = await fetch(url, {
            headers
        })
        if (!r.ok) return null
        return await r.json()
    } catch {
        return null
    }
}

const fetchAllGames = async() => {
    const data = await get(`${base}/api/games/list?all=true`)
    return data ? .games || data ? .data || []
}

const searchGames = (games, query) => {
    const q = query
    const exact = games.find(g => {
        const gid = String(g.game_id || g.id || "")
            .toLowerCase()
        const name = String(g.game_name || g.name || g.title || "")
            .toLowerCase()
        return gid === q || name === q
    })
    if (exact) return [exact]
    const partial = games.find(g => {
        const gid = String(g.game_id || g.id || "")
            .toLowerCase()
        const name = String(g.game_name || g.name || g.title || "")
            .toLowerCase()
        return gid.includes(q) || name.includes(q)
    })
    return partial ? [partial] : []
}

const fetchAllDetails = async(gid) => {
    const[steam, lookup, download] = await Promise.all([
    get(`${base}/api/games/steam-info?gameId=${gid}`),
    get(`${base}/api/games/lookup?id=${encodeURIComponent(String(gid))}`),
    get(`${base}/api/games/${gid}/download`), ])
    return {
        steam: steam || {},
        lookup: lookup || {},
        download: download || {}
    }
}

const printResult = (info, steam, lookup, download) => {
    console.log("\ninfo:")
    console.log(JSON.stringify(info, null, 2))

    if (steam && Object.keys(steam)
        .length) {
        console.log("\nsteam:")
        console.log(JSON.stringify(steam, null, 2))
    }

    if (lookup && Object.keys(lookup)
        .length) {
        console.log("\nlookup:")
        console.log(JSON.stringify(lookup, null, 2))
    }

    if (download && Object.keys(download)
        .length) {
        console.log("\ndownload:")
        console.log(JSON.stringify(download, null, 2))
    }
}



const main = async() => {
    const query = 100
    const games = await fetchAllGames()
    if (!games.length) return console.log("failed")

    const results = searchGames(games, query)

    if (!results.length) {
        const {
            steam, lookup, download
        } = await fetchAllDetails(query)
        if (!Object.keys(lookup)
            .length && !Object.keys(steam)
            .length) return
        printResult({
            game_id: query
        }, steam, lookup, download)
        return
    }

    const allDetails = await Promise.all(
    results.map(async(g) => {
        const gid = g.game_id || g.id
        const {
            steam, lookup, download
        } = await fetchAllDetails(gid)
        return {
            info: g,
            steam,
            lookup,
            download
        }
    }))

    for (const {
        info, steam, lookup, download
    }
    of allDetails) {
        printResult(info, steam, lookup, download)
    }
}

export default {
    route: {
        method: "get",
        path: "/kana/farestop",
        auth: false,
        tags: ["Kana · Tools"],
        summary: "fares.top",
        description: "Search & detail game by id",
        parameters: [
            {
                name: "input",
                in: "query",
                required: true,
                description: "Parameter input",
                schema: { type: "string" },
            },
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: { type: "object" },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const { input } = req.query
        if (!input || !String(input).trim()) {
            return res.status(400).json({ ok: false, error: `input wajib diisi` })
        }
        try {
            const result = await main(String(input).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}
