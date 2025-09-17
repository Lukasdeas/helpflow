module.exports = {
  apps: [{
    name: 'helpdesk',
    script: './dist/index.js',
    cwd: '/home/helpdesk/app/helpflow',
    instances: 'max', // Usar todos os cores disponíveis - Ou 1 para SQLite caso ocorra erro.
    exec_mode: 'cluster', // Modo cluster para melhor performance
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,

    // Performance e Restart
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',

    // Health check
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,

    // Auto restart em caso de mudanças (apenas desenvolvimento)
    // watch: false,
    // ignore_watch: ["node_modules", "logs", "uploads", "backups"],

    // Variáveis de ambiente específicas para produção
    node_args: '--max-old-space-size=2048'
  }]
}
