// PM2 ecosystem — production process management untuk Kangwifi APIs.
//
// Pakai:  pm2 start ecosystem.config.cjs && pm2 save
// Log:    pm2 logs kangwifi-apis
//
// Auto-restart saat crash/OOM dengan exponential backoff, dan log error
// handler tidak akan lagi mematikan proses (uncaughtException ditangkap di
// index.js). Jalankan 1 instance (fork) karena rate limiter & cache berbasis
// memori in-process.

module.exports = {
    apps: [
        {
            name: "kangwifi-apis",
            script: "index.js",
            interpreter: "bun",
            exec_mode: "fork",
            instances: 1,
            autorestart: true,
            max_restarts: 50,
            exp_backoff_restart_delay: 250,
            max_memory_restart: "600M",
            kill_timeout: 8000,           // beri waktu graceful shutdown
            wait_ready: false,
            time: true,                   // timestamp di log
            out_file: "logs/out.log",
            error_file: "logs/error.log",
            merge_logs: true,
            env: {
                NODE_ENV: "production",
                // RATE_LIMIT / RATE_BURST / CACHE_TTL / dst. diambil dari .env
            },
        },
    ],
}
