// /utils/snowflake — Twitter Snowflake ID generator
const EPOCH = 1420070400000n // Twitter epoch (Jan 1, 2015)

let sequence = 0n
let lastTimestamp = -1n
const WORKER_ID = BigInt(Math.floor(Math.random() * 32))
const PROCESS_ID = BigInt(Math.floor(Math.random() * 32))

function generateSnowflake() {
    let timestamp = BigInt(Date.now()) - EPOCH
    if (timestamp === lastTimestamp) {
        sequence = (sequence + 1n) & 0xfffn
        if (sequence === 0n) {
            while (BigInt(Date.now()) - EPOCH <= lastTimestamp) {
                // spin wait
            }
            timestamp = BigInt(Date.now()) - EPOCH
        }
    } else {
        sequence = 0n
    }
    lastTimestamp = timestamp
    return (timestamp << 22n) | (WORKER_ID << 17n) | (PROCESS_ID << 12n) | sequence
}

function decodeSnowflake(id) {
    const big = BigInt(id)
    const timestamp = (big >> 22n) + EPOCH
    const workerId = (big >> 17n) & 0x1fn
    const processId = (big >> 12n) & 0x1fn
    const seq = big & 0xfffn
    return {
        id: big.toString(),
        timestamp: new Date(Number(timestamp)).toISOString(),
        worker_id: Number(workerId),
        process_id: Number(processId),
        sequence: Number(seq),
    }
}

export default {
    route: {
        method: "get",
        path: "/utils/snowflake",
        auth: false,
        tags: ["Utils"],
        summary: "Twitter Snowflake ID generator/decoder",
        description: "Menghasilkan Twitter-style Snowflake ID atau mendecode Snowflake ID ke komponennya.",
        parameters: [
            { name: "decode", in: "query", required: false, description: "Snowflake ID untuk didecode", schema: { type: "string" } },
            { name: "count", in: "query", required: false, description: "Jumlah ID yang dihasilkan (default 1)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Snowflake ID atau hasil decode" } },
    },
    handler: async (req, res) => {
        try {
            if (req.query.decode) {
                const decoded = decodeSnowflake(String(req.query.decode))
                return res.json({ ok: true, ...decoded })
            }
            const count = Math.min(100, Math.max(1, parseInt(req.query.count) || 1))
            const ids = []
            for (let i = 0; i < count; i++) {
                ids.push(generateSnowflake().toString())
                // small delay to avoid same-millisecond collisions
                if (count > 1) await new Promise(r => setTimeout(r, 1))
            }
            res.json({ ok: true, count, ids, decoded: decodeSnowflake(ids[0]) })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}
