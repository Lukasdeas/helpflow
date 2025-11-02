// Carregar variáveis de ambiente PRIMEIRO
async function loadEnvironment() {
  try {
    const { config } = await import('dotenv');
    config({ path: '.env' });
    console.log('✅ Dotenv carregado - usando arquivo .env local');
  } catch (error) {
    console.log('💡 Usando variáveis de ambiente do sistema (Replit secrets)');
  }
}

// Função principal que aguarda o dotenv carregar
async function startServer() {
  // 1. PRIMEIRO: Carregar variáveis de ambiente
  await loadEnvironment();
  
  // 2. DEPOIS: Importar e inicializar tudo
  const express = (await import("express")).default;
  const { registerRoutes } = await import("./routes");
  const { setupVite, serveStatic, log } = await import("./vite");

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any[]) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}

// Iniciar servidor
startServer().catch(console.error);
