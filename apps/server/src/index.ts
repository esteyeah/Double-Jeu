import { createArcadeServer } from './app';

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;

if (corsOrigin === true && process.env.NODE_ENV === 'production') {
  console.warn('⚠ CORS_ORIGIN non défini : toutes les origines sont acceptées.');
}

const server = createArcadeServer({ corsOrigin });

server.http.listen(port, () => {
  console.log(`Serveur de jeu prêt sur http://localhost:${port} (santé : /health)`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
