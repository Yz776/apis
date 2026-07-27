// OneForAll Downloader — https://oneforalldownloader.com
// Source: https://pastebin.com/bsHiucXn (by HaidarMahiru)

async function oneforallDownload(url, quality = "any", format = "any") {
    // Step 1: Fetch preview metadata
    const previewRes = await fetch("https://oneforalldownloader.com/preview", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({ url, playlist_item_limit: 50 }),
    });

    if (!previewRes.ok) {
        throw new Error(`Gagal mengambil preview. Status HTTP: ${previewRes.status}`);
    }

    const previewData = await previewRes.json();
    if (previewData.status === "error") {
        throw new Error(`Error Preview: ${previewData.msg || "Unknown error"}`);
    }

    const { uuid, title, duration, formats } = previewData;

    // Map quality parameter
    let mappedQuality = quality;
    if (mappedQuality !== "any") {
        const qNum = parseInt(mappedQuality, 10);
        if (!isNaN(qNum)) mappedQuality = qNum;
    }

    // Step 2: Add to download queue
    const addPayload = {
        url,
        quality: mappedQuality,
        format,
        folder: "",
        custom_name_prefix: "",
        playlist_strict_mode: false,
        playlist_item_limit: 50,
        uuid,
        preview_info: previewData,
    };

    const addRes = await fetch("https://oneforalldownloader.com/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(addPayload),
    });

    if (!addRes.ok) {
        throw new Error(`Gagal masuk antrean. Status HTTP: ${addRes.status}`);
    }

    const addData = await addRes.json();
    if (addData.status !== "ok") {
        throw new Error(`Gagal menambahkan antrean: ${JSON.stringify(addData)}`);
    }

    // Return preview metadata + queue status
    return {
        uuid,
        title,
        duration,
        formats: formats || [],
        queueStatus: addData,
    };
}

export default {
    route: {
        method: "get",
        path: "/downloader/oneforall",
        auth: false,
        tags: ["Downloader"],
        summary: "oneforall",
        description: "All-in-one downloader via oneforalldownloader.com — support YouTube, Instagram, TikTok, etc. Returns video metadata and download info.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL video/audio yang akan diunduh",
                schema: { type: "string" },
            },
            {
                name: "quality",
                in: "query",
                required: false,
                description: "Kualitas video (e.g. 720, 1080, atau 'any' untuk auto). Default: any",
                schema: { type: "string", default: "any" },
            },
            {
                name: "format",
                in: "query",
                required: false,
                description: "Format kontainer (mp4, webm, mp3, m4a, atau 'any'). Default: any",
                schema: { type: "string", default: "any" },
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
        const { url, quality, format } = req.query;
        if (!url || !String(url).trim()) {
            return res.status(400).json({ ok: false, error: "url wajib diisi" });
        }
        try {
            const result = await oneforallDownload(
                String(url).trim(),
                quality || "any",
                format || "any"
            );
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    },
};
