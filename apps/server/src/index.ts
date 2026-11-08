import { createArcadeServer, createServices } from './app';
import { storeFromEnv } from './store';

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;

if (corsOrigin === true && process.env.NODE_ENV === 'production') {
  console.warn('⚠ CORS_ORIGIN non défini : toutes les origines sont acceptées.');
}

const admins = (process.env.ADMIN_USERS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const { store, label } = storeFromEnv();
const services = await createServices(store, admins);
const server = await createArcadeServer({ corsOrigin, services });

server.http.listen(port, () => {
  console.log(`Serveur de jeu prêt sur http://localhost:${port} (santé : /health)`);
  console.log(`  Comptes et mots enregistrés dans : ${label}`);
  console.log(
    admins.length
      ? `  Administrateur(s) : ${admins.join(', ')}`
      : '  Aucun administrateur : définis ADMIN_USERS=<ton pseudo> pour gérer les mots depuis le site.',
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
