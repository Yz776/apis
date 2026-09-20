// /ai/g-ai — Google AI Mode (g.ai) endpoint
//
// Catatan (2026-09): g.ai adalah domain pendek Google yang redirect ke
// Google Search dengan AI Mode (`https://www.google.com/search?udm=50`).
// AI Mode Google kini sepenuhnya dilindungi oleh JavaScript/anti-bot
// (halaman "enablejs", redirect ke sorry/index), sehingga **tidak bisa
// di-scrape dari server-side tanpa headless browser**.
//
// Endpoint ini hanya mengembalikan informasi dan mengarahkan ke
// `/ai/gemini` yang sudah bekerja (scraper gemini.google.com no-login).
export default {
    route: {
        method: 'get',
        path: '/ai/g-ai',
        auth: false,
        tags: ['AI'],
        summary: 'Google AI Mode (g.ai) — Info & Alternatif',
        description:
            'g.ai redirect ke Google Search AI Mode (udm=50) yang sepenuhnya ' +
            'dilindungi JS/anti-bot dan **tidak bisa di-scrape server-side**.\n\n' +
            '**Alternatif yang bekerja:** `/ai/gemini` — scraper no-login untuk ' +
            'gemini.google.com (chat interface), sudah teruji dan berfungsi.',
        parameters: [
            { name: 'query', in: 'query', required: false, description: 'Diabaikan — endpoint info only', schema: { type: 'string' } },
        ],
        responses: {
            '200': {
                description: 'Info endpoint',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                ok: { type: 'boolean', example: true },
                                message: { type: 'string' },
                                g_ai_status: { type: 'string' },
                                alternative: { type: 'string' },
                                alternative_endpoint: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    },

    handler: async (req, res) => {
        res.json({
            ok: true,
            message: 'g.ai redirect ke Google AI Mode (udm=50) yang sepenuhnya JS-walled dan tidak bisa di-scrape server-side.',
            g_ai_status: 'NOT_SCRAPABLE_SERVER_SIDE',
            reason: 'Google AI Mode (udm=50) dilindungi JS/anti-bot shell; butuh headless browser.',
            alternative: 'Gunakan /ai/gemini untuk chat Gemini no-login (scraper gemini.google.com).',
            alternative_endpoint: '/ai/gemini',
            example_usage: 'GET /ai/gemini?prompt=Siapa+penemu+telepon%3F',
        })
    },
}