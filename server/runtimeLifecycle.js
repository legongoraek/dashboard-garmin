function closeServer(server) {
  if (!server || typeof server.close !== "function" || !server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function createShutdownHandler({ server, exitFn = process.exit, logger = console } = {}) {
  if (!server) throw new Error("server is required");

  let shutdownPromise = null;

  return function shutdown(signal = "shutdown") {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      logger.log?.(`Received ${signal}; shutting down backend`);
      try {
        await closeServer(server);
        exitFn(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error?.(`Backend shutdown failed: ${message}`);
        exitFn(1);
      }
    })();

    return shutdownPromise;
  };
}

export function attachGracefulShutdown({
  server,
  processRef = process,
  exitFn = process.exit,
  logger = console,
} = {}) {
  const shutdown = createShutdownHandler({ server, exitFn, logger });
  const handlers = {
    SIGTERM: () => shutdown("SIGTERM"),
    SIGINT: () => shutdown("SIGINT"),
  };

  processRef.once("SIGTERM", handlers.SIGTERM);
  processRef.once("SIGINT", handlers.SIGINT);

  return function detach() {
    processRef.off?.("SIGTERM", handlers.SIGTERM);
    processRef.off?.("SIGINT", handlers.SIGINT);
  };
}
