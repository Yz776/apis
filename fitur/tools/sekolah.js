import axios from "axios"
import * as cheerio from "cheerio"

const DAPODIK_BASE = "https://referensi.data.kemdikbud.go.id"

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Referer": DAPODIK_BASE
}

function mapSearchItem(item) {
    return {
        npsn: String(item.npsn || ""),
        nama: String(item.nama || ""),
        jenjang: String(item.jenjang || ""),
        status_sekolah: String(item.status_sekolah || ""),
        provinsi: String(item.provinsi || ""),
        kabupaten_kota: String(item.kabupaten || ""),
        kecamatan: String(item.kecamatan || "")
    }
}

function mapRawToDetailJson(rawObj) {
    if (!rawObj) return null

    let data = rawObj
    if (rawObj && rawObj.data) {
        data = Array.isArray(rawObj.data) ? rawObj.data[0] : rawObj.data
    } else if (Array.isArray(rawObj)) {
        data = rawObj[0]
    }

    if (!data) return null

    return {
        identitas: {
            npsn: String(data.npsn || ""),
            nama: String(data.nama || ""),
            bentuk_pendidikan: String(data.bentuk_pendidikan || ""),
            jenjang: String(data.jenjang || ""),
            status_sekolah: String(data.status_sekolah || ""),
            akreditasi: String(data.akreditasi || ""),
            partisipasi_bos: String(data.partisipasi_bos || ""),
            status_kepemilikan: String(data.status_kepemilikan || ""),
            nama_yayasan: String(data.nama_yayasan || ""),
            npyp: String(data.npyp || ""),
            sk_pendirian: String(data.sk_pendirian_sekolah || ""),
            tanggal_sk_pendirian: String(data.tlg_sk_pendirian_sekolah || ""),
            sk_izin_operasional: String(data.sk_izin_operasional || ""),
            tanggal_sk_operasional: String(data.tlg_sk_izin_operasional || ""),
            tanggal_update: String(data.tanggal_update || ""),
            semester: String(data.semester || "")
        },
        kepala_sekolah: {
            nama: String(data.nama_kepsek || "")
        },
        lokasi: {
            alamat_jalan: String(data.alamat_jalan || ""),
            rt: String(data.rt || ""),
            rw: String(data.rw || ""),
            desa_kelurahan: String(data.desa_kelurahan || ""),
            kecamatan: String(data.kecamatan || ""),
            kabupaten_kota: String(data.kabupaten || ""),
            provinsi: String(data.provinsi || ""),
            kode_pos: String(data.kode_pos || ""),
            koordinat: {
                lintang: data.lintang !== null && data.lintang !== undefined ? Number(data.lintang) : null,
                bujur: data.bujur !== null && data.bujur !== undefined ? Number(data.bujur) : null
            }
        },
        siswa: {
            total_pd: data.pd !== null && data.pd !== undefined ? Number(data.pd) : 0,
            laki_laki: data.pd_l !== null && data.pd_l !== undefined ? Number(data.pd_l) : 0,
            perempuan: data.pd_p !== null && data.pd_p !== undefined ? Number(data.pd_p) : 0,
            rombel: data.rombel !== null && data.rombel !== undefined ? Number(data.rombel) : 0,
            rincian_tingkat: {
                paud_klp_a: data.paud_klp_a !== null && data.paud_klp_a !== undefined ? Number(data.paud_klp_a) : 0,
                paud_klp_b: data.paud_klp_b !== null && data.paud_klp_b !== undefined ? Number(data.paud_klp_b) : 0,
                paud_kb: data.paud_KB !== null && data.paud_KB !== undefined ? Number(data.paud_KB) : 0,
                paud_tpa: data.paud_TPA !== null && data.paud_TPA !== undefined ? Number(data.paud_TPA) : 0,
                paud_sps: data.paud_SPS !== null && data.paud_SPS !== undefined ? Number(data.paud_SPS) : 0,
                kelas_1: data.pd_tk_1 !== null && data.pd_tk_1 !== undefined ? Number(data.pd_tk_1) : 0,
                kelas_2: data.pd_tk_2 !== null && data.pd_tk_2 !== undefined ? Number(data.pd_tk_2) : 0,
                kelas_3: data.pd_tk_3 !== null && data.pd_tk_3 !== undefined ? Number(data.pd_tk_3) : 0,
                kelas_4: data.pd_tk_4 !== null && data.pd_tk_4 !== undefined ? Number(data.pd_tk_4) : 0,
                kelas_5: data.pd_tk_5 !== null && data.pd_tk_5 !== undefined ? Number(data.pd_tk_5) : 0,
                kelas_6: data.pd_tk_6 !== null && data.pd_tk_6 !== undefined ? Number(data.pd_tk_6) : 0,
                kelas_7: data.pd_tk_7 !== null && data.pd_tk_7 !== undefined ? Number(data.pd_tk_7) : 0,
                kelas_8: data.pd_tk_8 !== null && data.pd_tk_8 !== undefined ? Number(data.pd_tk_8) : 0,
                kelas_9: data.pd_tk_9 !== null && data.pd_tk_9 !== undefined ? Number(data.pd_tk_9) : 0,
                kelas_10: data.pd_tk_10 !== null && data.pd_tk_10 !== undefined ? Number(data.pd_tk_10) : 0,
                kelas_11: data.pd_tk_11 !== null && data.pd_tk_11 !== undefined ? Number(data.pd_tk_11) : 0,
                kelas_12: data.pd_tk_12 !== null && data.pd_tk_12 !== undefined ? Number(data.pd_tk_12) : 0,
                kelas_13: data.pd_tk_13 !== null && data.pd_tk_13 !== undefined ? Number(data.pd_tk_13) : 0
            }
        },
        ptk_dan_tendik: {
            total_ptk: data.jum_ptk !== null && data.jum_ptk !== undefined ? Number(data.jum_ptk) : 0,
            guru: data.jum_guru !== null && data.jum_guru !== undefined ? Number(data.jum_guru) : 0,
            tenaga_kependidikan: data.jum_tendik !== null && data.jum_tendik !== undefined ? Number(data.jum_tendik) : 0
        },
        sarana_prasarana: {
            ruang_kelas: {
                total: data.ruang_kelas !== null && data.ruang_kelas !== undefined ? Number(data.ruang_kelas) : 0,
                rusak_ringan: data.kelas_ringan !== null && data.kelas_ringan !== undefined ? Number(data.kelas_ringan) : 0,
                rusak_sedang: data.kelas_sedang !== null && data.kelas_sedang !== undefined ? Number(data.kelas_sedang) : 0,
                rusak_berat: data.kelas_berat !== null && data.kelas_berat !== undefined ? Number(data.kelas_berat) : 0
            },
            perpustakaan: {
                total: data.perpus !== null && data.perpus !== undefined ? Number(data.perpus) : 0,
                rusak_ringan: data.perpus_ringan !== null && data.perpus_ringan !== undefined ? Number(data.perpus_ringan) : 0,
                rusak_sedang: data.perpus_sedang !== null && data.perpus_sedang !== undefined ? Number(data.perpus_sedang) : 0,
                rusak_berat: data.perpus_berat !== null && data.perpus_berat !== undefined ? Number(data.perpus_berat) : 0
            },
            laboratorium_ipa: {
                total: data.lab_ipa !== null && data.lab_ipa !== undefined ? Number(data.lab_ipa) : 0,
                rusak_ringan: data.lab_ipa_ringan !== null && data.lab_ipa_ringan !== undefined ? Number(data.lab_ipa_ringan) : 0,
                rusak_sedang: data.lab_ipa_sedang !== null && data.lab_ipa_sedang !== undefined ? Number(data.lab_ipa_sedang) : 0,
                rusak_berat: data.lab_ipa_berat !== null && data.lab_ipa_berat !== undefined ? Number(data.lab_ipa_berat) : 0
            },
            laboratorium_komputer: {
                total: data.lab_kom !== null && data.lab_kom !== undefined ? Number(data.lab_kom) : 0,
                rusak_ringan: data.lab_kom_ringan !== null && data.lab_kom_ringan !== undefined ? Number(data.lab_kom_ringan) : 0,
                rusak_sedang: data.lab_kom_sedang !== null && data.lab_kom_sedang !== undefined ? Number(data.lab_kom_sedang) : 0,
                rusak_berat: data.lab_kom_berat !== null && data.lab_kom_berat !== undefined ? Number(data.lab_kom_berat) : 0
            },
            laboratorium_bahasa: {
                total: data.lab_bahasa !== null && data.lab_bahasa !== undefined ? Number(data.lab_bahasa) : 0,
                rusak_ringan: data.lab_bahasa_ringan !== null && data.lab_bahasa_ringan !== undefined ? Number(data.lab_bahasa_ringan) : 0,
                rusak_sedang: data.lab_bahasa_sedang !== null && data.lab_bahasa_sedang !== undefined ? Number(data.lab_bahasa_sedang) : 0,
                rusak_berat: data.lab_bahasa_berat !== null && data.lab_bahasa_berat !== undefined ? Number(data.lab_bahasa_berat) : 0
            },
            ruang_guru: {
                total: data.r_guru !== null && data.r_guru !== undefined ? Number(data.r_guru) : 0,
                rusak_ringan: data.r_guru_ringan !== null && data.r_guru_ringan !== undefined ? Number(data.r_guru_ringan) : 0,
                rusak_sedang: data.r_guru_sedang !== null && data.r_guru_sedang !== undefined ? Number(data.r_guru_sedang) : 0,
                rusak_berat: data.r_guru_berat !== null && data.r_guru_berat !== undefined ? Number(data.r_guru_berat) : 0
            },
            ruang_kepsek: {
                total: data.r_kepsek !== null && data.r_kepsek !== undefined ? Number(data.r_kepsek) : 0,
                rusak_ringan: data.r_kepsek_ringan !== null && data.r_kepsek_ringan !== undefined ? Number(data.r_kepsek_ringan) : 0,
                rusak_sedang: data.r_kepsek_sedang !== null && data.r_kepsek_sedang !== undefined ? Number(data.r_kepsek_sedang) : 0,
                rusak_berat: data.r_kepsek_berat !== null && data.r_kepsek_berat !== undefined ? Number(data.r_kepsek_berat) : 0
            },
            ruang_tu: {
                total: data.r_tu !== null && data.r_tu !== undefined ? Number(data.r_tu) : 0,
                rusak_ringan: data.r_tu_ringan !== null && data.r_tu_ringan !== undefined ? Number(data.r_tu_ringan) : 0,
                rusak_sedang: data.r_tu_sedang !== null && data.r_tu_sedang !== undefined ? Number(data.r_tu_sedang) : 0,
                rusak_berat: data.r_tu_berat !== null && data.r_tu_berat !== undefined ? Number(data.r_tu_berat) : 0
            },
            sanitasi_wc_guru: {
                total: data.wc_guru !== null && data.wc_guru !== undefined ? Number(data.wc_guru) : 0,
                rusak_ringan: data.wc_guru_ringan !== null && data.wc_guru_ringan !== undefined ? Number(data.wc_guru_ringan) : 0,
                rusak_sedang: data.wc_guru_sedang !== null && data.wc_guru_sedang !== undefined ? Number(data.wc_guru_sedang) : 0,
                rusak_berat: data.wc_guru_berat !== null && data.wc_guru_berat !== undefined ? Number(data.wc_guru_berat) : 0
            },
            sanitasi_wc_siswa: {
                total: data.wc_siswa !== null && data.wc_siswa !== undefined ? Number(data.wc_siswa) : 0,
                rusak_ringan: data.wc_siswa_ringan !== null && data.wc_siswa_ringan !== undefined ? Number(data.wc_siswa_ringan) : 0,
                rusak_sedang: data.wc_siswa_sedang !== null && data.wc_siswa_sedang !== undefined ? Number(data.wc_siswa_sedang) : 0,
                rusak_berat: data.wc_siswa_berat !== null && data.wc_siswa_berat !== undefined ? Number(data.wc_siswa_berat) : 0
            }
        },
        listrik_dan_internet: {
            sumber_listrik: String(data.sumber_listrik || ""),
            daya_listrik: String(data.daya_listrik || ""),
            akses_internet: String(data.akses_internet || ""),
            jenis_layanan: String(data.internet_jenis_layanan || ""),
            jenis_koneksi: String(data.internet_jenis_koneksi || ""),
            provider_internet: String(data.internet_provider || ""),
            bandwidth_mbps: data.internet_bandwidth !== null && data.internet_bandwidth !== undefined ? Number(data.internet_bandwidth) : 0
        }
    }
}

async function searchSchools(query) {
    const url = `${DAPODIK_BASE}/index.php/cari/sekolah`
    const res = await axios.get(url, {
        headers: HEADERS,
        params: { kata: query },
        timeout: 15000
    })

    const $ = cheerio.load(res.data)
    const results = []

    // Parse search results table - the Dapodik referensi site shows results in a table
    $("table tbody tr, #table_sekolah tbody tr, .table tbody tr").each((i, el) => {
        const cells = $(el).find("td")
        if (cells.length >= 6) {
            const npsn = cells.eq(0).text().trim()
            const nama = cells.eq(1).text().trim()
            const jenjang = cells.eq(2).text().trim()
            const status_sekolah = cells.eq(3).text().trim()
            const provinsi = cells.eq(4).text().trim()
            const kabupaten = cells.eq(5).text().trim()
            const kecamatan = cells.length >= 7 ? cells.eq(6).text().trim() : ""

            if (npsn && nama) {
                results.push({ npsn, nama, jenjang, status_sekolah, provinsi, kabupaten, kecamatan })
            }
        }
    })

    // Also try to find results in other table structures
    if (results.length === 0) {
        $("tr").each((i, el) => {
            const cells = $(el).find("td")
            if (cells.length >= 3) {
                const link = cells.eq(0).find("a").attr("href") || ""
                const npsnMatch = link.match(/npsn=(\d+)/) || cells.eq(0).text().trim().match(/^\d{8}$/)
                const npsn = npsnMatch ? (npsnMatch[1] || cells.eq(0).text().trim()) : cells.eq(0).text().trim()
                const nama = cells.eq(1).text().trim()

                if (npsn && nama && nama.length > 2) {
                    results.push({
                        npsn: String(npsn),
                        nama,
                        jenjang: cells.eq(2).text().trim() || "",
                        status_sekolah: cells.length >= 4 ? cells.eq(3).text().trim() : "",
                        provinsi: cells.length >= 5 ? cells.eq(4).text().trim() : "",
                        kabupaten: cells.length >= 6 ? cells.eq(5).text().trim() : "",
                        kecamatan: cells.length >= 7 ? cells.eq(6).text().trim() : ""
                    })
                }
            }
        })
    }

    // If HTML parsing yields no results, try the alternative JSON search approach
    if (results.length === 0) {
        try {
            const jsonUrl = `${DAPODIK_BASE}/index.php/cari/sekolah`
            const jsonRes = await axios.get(jsonUrl, {
                headers: { ...HEADERS, "Accept": "application/json" },
                params: { kata: query },
                timeout: 15000
            })
            if (jsonRes.data && Array.isArray(jsonRes.data)) {
                return jsonRes.data.map(mapSearchItem)
            }
            if (jsonRes.data && jsonRes.data.data && Array.isArray(jsonRes.data.data)) {
                return jsonRes.data.data.map(mapSearchItem)
            }
        } catch (e) { /* fallback already tried */ }
    }

    return results.map(mapSearchItem)
}

async function getSchoolDetail(npsn) {
    // First try the detail page via NPSN
    const url = `${DAPODIK_BASE}/index.php/cari/sekolah`
    const res = await axios.get(url, {
        headers: HEADERS,
        params: { npsn },
        timeout: 15000
    })

    // Try to extract JSON data embedded in the page
    const $ = cheerio.load(res.data)
    let detailData = null

    // Look for JSON data in script tags
    $("script").each((i, el) => {
        const content = $(el).html() || ""
        // Try to find JSON objects with school data fields
        if (content.includes("npsn") && content.includes("nama")) {
            try {
                const jsonMatch = content.match(/\{[^{}]*"npsn"[^{}]*\}/)
                if (jsonMatch) {
                    detailData = JSON.parse(jsonMatch[0])
                }
            } catch (e) { /* ignore parse errors */ }
        }
    })

    // If JSON wasn't found in scripts, try HTML parsing for detail page
    if (!detailData) {
        // Parse the detail page HTML for school information
        const infoSections = {}
        $("dt, .label, th").each((i, el) => {
            const key = $(el).text().trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
            const value = $(el).next("dd, .value, td").text().trim()
            if (key && value) {
                infoSections[key] = value
            }
        })

        if (infoSections.npsn || Object.keys(infoSections).length > 5) {
            detailData = infoSections
        }
    }

    // If still no data, try alternative API approach
    if (!detailData) {
        try {
            const detailUrl = `${DAPODIK_BASE}/index.php/sekolah/${npsn}`
            const detailRes = await axios.get(detailUrl, {
                headers: HEADERS,
                timeout: 15000
            })
            const d$ = cheerio.load(detailRes.data)

            const info = {}
            d$("dt, .label, th").each((i, el) => {
                const key = d$(el).text().trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
                const value = d$(el).next("dd, .value, td").text().trim()
                if (key && value) info[key] = value
            })

            if (info.npsn || Object.keys(info).length > 5) {
                detailData = info
            }
        } catch (e) { /* ignore */ }
    }

    // Final fallback: try JSON API directly
    if (!detailData) {
        try {
            const jsonRes = await axios.get(`${DAPODIK_BASE}/index.php/cari/sekolah`, {
                headers: { ...HEADERS, "Accept": "application/json" },
                params: { npsn },
                timeout: 15000
            })
            if (jsonRes.data) {
                if (Array.isArray(jsonRes.data)) {
                    detailData = jsonRes.data[0] || jsonRes.data
                } else if (jsonRes.data.data) {
                    detailData = Array.isArray(jsonRes.data.data) ? jsonRes.data.data[0] : jsonRes.data.data
                } else {
                    detailData = jsonRes.data
                }
            }
        } catch (e) { /* ignore */ }
    }

    const mapped = mapRawToDetailJson(detailData)
    if (!mapped) throw new Error("Detail sekolah tidak ditemukan")
    return mapped
}

export default {
    route: {
        method: "get",
        path: "/tools/sekolah",
        auth: false,
        tags: ["Tools"],
        summary: "Cari sekolah (Dapodik data)",
        description: "Search and detail sekolah (school) data from Dapodik referensi data Kemendikbud. Search returns list of schools matching keyword, detail returns full school profile by NPSN.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword for school name (required for type=search)", schema: { type: "string" } },
            { name: "npsn", in: "query", required: false, description: "NPSN school ID (required for type=detail)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } },
            "400": { description: "Bad request", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } } }
        }
    },
    handler: async (req, res) => {
        const { type, query, npsn } = req.query
        const action = type || "search"

        try {
            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                const results = await searchSchools(query)
                res.json({ ok: true, type: "search", result: results })
            } else if (action === "detail") {
                if (!npsn) return res.status(400).json({ ok: false, error: "npsn wajib diisi untuk detail" })
                const result = await getSchoolDetail(npsn)
                res.json({ ok: true, type: "detail", result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: search, detail` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}
