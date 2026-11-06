#!/usr/bin/env node
/**
 * `pnpm play` : compile tout, puis sert le site ET le serveur de jeu sur un seul port.
 * Pratique pour jouer entre amis sur le même Wi-Fi : une seule adresse à donner.
 *
 *   pnpm play              → build puis lancement sur le port 8080
 *   pnpm play --no-build   → relance sans recompiler
 *   PORT=9000 pnpm play    → autre port
 */
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const WEB_PORT = 3107;
const GAME_PORT = 4107;
const isWindows = process.platform === 'win32';
const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
const env = {
  ...process.env,
  // Le navigateur parle au serveur de jeu via la même adresse que la page.
  NEXT_PUBLIC_SERVER_URL: 'same-origin',
  NEXT_TELEMETRY_DISABLED: '1',
};

if (!process.argv.includes('--no-build')) {
  console.log('▶ Compilation (une à deux minutes la première fois)…');
  const build = spawnSync(pnpm, ['build'], { cwd: root, stdio: 'inherit', env, shell: isWindows });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const children = [
  spawn(process.execPath, ['apps/server/dist/index.js'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...env, PORT: String(GAME_PORT) },
  }),
  // Next.js lancé directement avec Node : pas besoin de pnpm au démarrage (hébergeurs, Windows).
  spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(WEB_PORT)],
    { cwd: join(root, 'apps', 'web'), stdio: 'inherit', env },
  ),
];

/** /socket.io → serveur de jeu, tout le reste → site Next.js. */
const portFor = (url = '/') => (url.startsWith('/socket.io') ? GAME_PORT : WEB_PORT);

const proxy = http.createServer((req, res) => {
  const upstream = http.request(
    { host: '127.0.0.1', port: portFor(req.url), path: req.url, method: req.method, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Démarrage en cours… recharge la page dans quelques secondes.');
  });
  req.pipe(upstream);
});

// WebSocket : on recopie la requête d'upgrade puis on relie les deux connexions.
proxy.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(portFor(req.url), '127.0.0.1', () => {
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    upstream.write(`${raw}\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

proxy.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`);
  console.log('\n🎲 Faux-Semblants est prêt !');
  console.log(`   Sur cet ordinateur : http://localhost:${PORT}`);
  if (lan.length) console.log(`   Pour tes amis (même Wi-Fi) : ${lan.join('  ou  ')}`);
  console.log('   Ctrl+C pour arrêter.\n');
});

function shutdown() {
  for (const child of children) child.kill();
  proxy.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
for (const child of children) {
  child.on('exit', (code) => {
    if (code) {
      console.error(`Un des services s'est arrêté (code ${code}).`);
      shutdown();
    }
  });
}
