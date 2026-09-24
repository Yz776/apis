// /tools/bmkg-cuaca — Cuaca Indonesia via BMKG Resmi
// Sumber: https://data.bmkg.go.id (Data Terbuka BMKG)
// Catatan: Data cuaca real-time & prakiraan dari BMKG Indonesia
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
const BASE = "https://data.bmkg.go.id"

async function fetchBMKG(path) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`BMKG HTTP ${res.status}`)
    return res.text()
}

async function getCuacaSaatIni(provinsi) {
    const html = await fetchBMKG("/DataMKG/TEWS/autogempa.json")
    const data = JSON.parse(html)
    return data
}

async function getPrakiraanCuaca(kota) {
    const html = await fetchBMKG("/prakiraan/cuaca")
    const $ = cheerio.load(html)
    // Parsing sederhana - BMKG pakai tabel
    const results = []
    $("table tbody tr").each((_, el) => {
        const tds = $(el).find("td")
        if (tds.length >= 3) {
            const nama = $(tds[0]).text().trim()
            if (nama.toLowerCase().includes(kota.toLowerCase())) {
                results.push({
                    kota: nama,
                    cuaca: $(tds[1]).text().trim(),
                    suhu: $(tds[2]).text().trim(),
                    kelembaban: $(tds[3])?.text().trim() || "-",
                    angin: $(tds[4])?.text().trim() || "-",
                })
            }
        }
    })
    return results
}

export default {
    route: {
        method: "get",
        path: "/tools/bmkg-cuaca",
        auth: false,
        tags: ["Tools", "Weather"],
        summary: "Cuaca & Gempa BMKG Indonesia",
        description: "Data cuaca real-time, prakiraan, dan gempa terkini dari BMKG Resmi (data.bmkg.go.id).",
        parameters: [
            { name: "provinsi", in: "query", required: false, description: "Kode provinsi (opsional)", schema: { type: "string" } },
            { name: "kota", in: "query", required: false, description: "Nama kota untuk prakiraan", schema: { type: "string" } },
            { name: "jenis", in: "query", required: false, description: "cuaca | gempa | prakiraan", schema: { type: "string", enum: ["cuaca", "gempa", "prakiraan"] } },
        ],
        responses: { "200": { description: "Data BMKG" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Kesalahan server" } },
    },
    handler: async (req, res) => {
        const { jenis = "gempa", kota } = req.query
        try {
            if (jenis === "gempa") {
                const html = await fetchBMKG("/DataMKG/TEWS/autogempa.json")
                const data = JSON.parse(html)
                return res.json({ ok: true, source: "BMKG", ...data })
            }
            if (jenis === "prakiraan" && kota) {
                const data = await getPrakiraanCuaca(kota)
                return res.json({ ok: true, source: "BMKG", kota, data })
            }
            // Default: info gempa terkini
            const html = await fetchBMKG("/DataMKG/TEWS/autogempa.json")
            const data = JSON.parse(html)
            return res.json({ ok: true, source: "BMKG", ...data })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}