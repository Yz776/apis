import crypto from "crypto"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

function solveSinglePow(challengeType, challenge, nonce, difficulty) {
    const prefix = challengeType === "alt" ? "pow:" + nonce + ":" : "pow:" + challenge + ":"
    const suffix = challengeType === "alt" ? ":" + challenge : ":" + nonce + ":" + challenge.length
    const target = "0".repeat(difficulty)
    for (let n = 0; n < 100000000; n++) {
        const hash = crypto.createHash("sha256").update(prefix + n + suffix).digest("hex")
        if (hash.startsWith(target)) return String(n)
    }
    return null
}

function solvePow(challengeType, challenge, nonce, difficulty) {
    if (challengeType === "alt") {
        const first = solveSinglePow("alt", challenge, nonce, difficulty)
        if (!first) return null
        const secondChallenge = crypto.createHash("sha256").update("pow:alt:" + challenge + ":" + nonce + ":" + first).digest("hex")
        const second = solveSinglePow("alt", secondChallenge, nonce, difficulty)
        if (!second) return null
        return first + "." + second
    }
    return solveSinglePow("classic", challenge, nonce, difficulty)
}

async function download(targetUrl) {
    // 1. Fetch bootstrap
    const bootstrapRes = await fetch("https://j2download.com/", {
        headers: { "User-Agent": UA, "Accept": "text/html" }
    })
    if (!bootstrapRes.ok) throw new Error(`Homepage fetch failed: ${bootstrapRes.status}`)
    const bootstrapHtml = await bootstrapRes.text()
    const bootstrapMatch = bootstrapHtml.match(/window\.__BOOTSTRAP__\s*=\s*({[^}]+});/)
    if (!bootstrapMatch) throw new Error("Could not find __BOOTSTRAP__")
    const bootstrap = JSON.parse(bootstrapMatch[1])

    // 2. Solve PoW
    const solution = solvePow(bootstrap.challengeType, bootstrap.powChallenge, bootstrap.nonce, bootstrap.powDifficulty)

    // 3. Get access token
    const authHeaders = {
        "User-Agent": UA, "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded",
        "X-Page-Nonce": bootstrap.nonce, "Origin": "https://j2download.com", "Referer": "https://j2download.com/"
    }
    if (solution) authHeaders["X-Pow-Solution"] = solution

    const authRes = await fetch("https://j2download.com/api/auth/issue", { method: "POST", headers: authHeaders })
    const authData = await authRes.json()
    if (!authRes.ok || authData.error) throw new Error(`Auth failed: ${authData.error || "unknown"}`)
    const accessToken = authData.accessToken

    // 4. Get download links
    const dlRes = await fetch("https://j2download.com/api/autolink", {
        method: "POST",
        headers: {
            "User-Agent": UA, "Accept": "application/json", "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`, "Origin": "https://j2download.com", "Referer": "https://j2download.com/"
        },
        body: JSON.stringify({ data: { url: targetUrl, unlock: true } })
    })
    const dlData = await dlRes.json()
    if (!dlRes.ok || dlData.error) throw new Error(`Download failed: ${dlData.error || "unknown"}`)
    return dlData
}

export default {
    route: {
        method: "get",
        path: "/downloader/j2download",
        auth: false,
        tags: ["Downloader"],
        summary: "j2download — video/audio downloader",
        description: "Download video/audio from any URL using j2download.com. Requires proof-of-work authentication.",
        parameters: [
            { name: "url", in: "query", required: true, description: "URL to download (YouTube, TikTok, etc.)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK" },
            "400": { description: "Bad request" }
        }
    },
    handler: async (req, res) => {
        const { url } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const result = await download(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}
