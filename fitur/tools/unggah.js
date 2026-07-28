// Unggah.web.id file uploader
// Source: https://snippet.zellrayy.com/#/snippet/6BBeFYez7K & https://pastebin.com/epbSJMHP

const EXPIRY_OPTIONS = ["30menit", "60menit", "1hari", "3hari", "7hari", "30hari"];

async function unggahUpload(url, expired = "60menit") {
    if (!EXPIRY_OPTIONS.includes(expired)) {
        throw new Error(`Expired harus salah satu dari: ${EXPIRY_OPTIONS.join(", ")}`);
    }

    // Fetch the file from URL
    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error(`Gagal mengambil file: ${fileRes.status}`);

    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    // Extract filename from URL
    const filename = url.split("/").pop().split("?")[0] || "file";

    // Create FormData
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: contentType }), filename);
    formData.append("expired", expired);

    const sessionId = "sess_" + crypto.randomUUID().replace(/-/g, "") + "_" + Date.now();
    const fingerprint = crypto.randomUUID().replace(/-/g, "");
    const csrfToken = Buffer.from(crypto.randomUUID()).toString("base64").replace(/[+/=]/g, "");

    const response = await fetch("https://unggah.web.id/api/unggah", {
        method: "POST",
        headers: {
            Cookie: `sessionId=${sessionId}; fingerprint=${fingerprint}; csrfToken=${csrfToken}`,
            "X-Csrf-Token": csrfToken,
            "User-Agent": "Mozilla/5.0",
            Origin: "https://unggah.web.id",
            Referer: "https://unggah.web.id/pengunggah",
        },
        body: formData,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload gagal (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();
    // Normalize URL to https
    if (data.url) data.url = data.url.replace(/^http:/, "https:");
    return data;
}

export default {
    route: {
        method: "get",
        path: "/tools/unggah",
        auth: false,
        tags: ["Tools"],
        summary: "unggah",
        description: "Upload file dari URL ke unggah.web.id dengan pilihan masa aktif (30menit, 60menit, 1hari, 3hari, 7hari, 30hari)",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL file yang akan diunggah (image, video, document, dll)",
                schema: { type: "string" },
            },
            {
                name: "expired",
                in: "query",
                required: false,
                description: "Masa aktif file: 30menit, 60menit, 1hari, 3hari, 7hari, 30hari (default: 60menit)",
                schema: { type: "string", default: "60menit" },
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
        const { url, expired } = req.query;
        if (!url || !String(url).trim()) {
            return res.status(400).json({ ok: false, error: "url wajib diisi" });
        }
        try {
            const result = await unggahUpload(String(url).trim(), expired || "60menit");
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message });
        }
    },
};
