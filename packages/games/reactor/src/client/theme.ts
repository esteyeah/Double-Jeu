/** Décor de Réacteur : salle de contrôle d'une station orbitale, acier brossé, néons, alarmes. */
export const REACTOR_CSS = `
.rx{--cyan:#58f3ff;--amber:#ffb547;--red:#ff4433;--green:#5dff9e;--steel:#cfd8e3;position:relative;min-height:100dvh;color:#dfe8f2;
  font-family:'Rajdhani','Segoe UI',system-ui,sans-serif;font-weight:500;background:#05080c;overflow:hidden;overflow:clip;isolation:isolate}
.rx-wall{position:absolute;inset:0;z-index:-3;background:url(/themes/reactor/wall.jpg) center/520px}
.rx-plates{position:absolute;inset:0;z-index:-2;opacity:.35;background:url(/themes/reactor/plates.jpg) center/300px;mix-blend-mode:overlay}
.rx-light{position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(55% 38% at 50% 22%,rgba(88,243,255,calc(.20 - var(--tension,0)*.12)),transparent 70%),
    radial-gradient(60% 45% at 50% 30%,rgba(255,68,51,calc(var(--tension,0)*.30)),transparent 70%),
    radial-gradient(130% 95% at 50% 40%,transparent 40%,rgba(0,0,0,.85) 100%)}
.rx-alarm{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:calc(var(--tension,0)*.9);
  background:linear-gradient(180deg,rgba(255,40,30,.22),transparent 30%,transparent 70%,rgba(255,40,30,.18));animation:rx-alarm 2.4s ease-in-out infinite}
@keyframes rx-alarm{0%,100%{opacity:calc(var(--tension,0)*.25)}50%{opacity:calc(var(--tension,0)*.9)}}
.rx-scan{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.07;background:repeating-linear-gradient(180deg,#fff 0 1px,transparent 1px 3px)}
.rx-title{font-family:'Orbitron','Rajdhani',sans-serif;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.rx-mono{font-family:'Share Tech Mono',ui-monospace,monospace;letter-spacing:.04em}
.rx-glow{color:var(--cyan);text-shadow:0 0 6px rgba(88,243,255,.85),0 0 18px rgba(88,243,255,.45)}
.rx-amber{color:var(--amber);text-shadow:0 0 6px rgba(255,181,71,.8),0 0 16px rgba(255,181,71,.4)}
.rx-redglow{color:#ff6a5a;text-shadow:0 0 6px rgba(255,68,51,.9),0 0 18px rgba(255,68,51,.5)}

/* Panneaux d'acier brossé */
.rx-panel{position:relative;border-radius:14px;
  background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.35)),url(/themes/reactor/panel.jpg) center/420px;
  border:1px solid #05080c;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.04),inset 0 -2px 0 rgba(0,0,0,.5),0 14px 28px rgba(0,0,0,.6)}
.rx-rivets::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(circle at 10px 10px,#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px),radial-gradient(circle at calc(100% - 10px) 10px,#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px),
    radial-gradient(circle at 10px calc(100% - 10px),#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px),radial-gradient(circle at calc(100% - 10px) calc(100% - 10px),#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px)}
.rx-hazard{background:repeating-linear-gradient(-45deg,#f2b632 0 10px,#151515 10px 20px)}
.rx-screen{position:relative;border-radius:8px;padding:6px 10px;background:radial-gradient(120% 120% at 50% 0%,#0d2a33,#03090c);
  box-shadow:inset 0 0 0 1px rgba(88,243,255,.25),inset 0 0 18px rgba(88,243,255,.12),0 1px 0 rgba(255,255,255,.08)}
.rx-screen::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:.25;background:repeating-linear-gradient(180deg,rgba(255,255,255,.12) 0 1px,transparent 1px 3px)}
.rx-led{display:inline-block;width:9px;height:9px;border-radius:50%;flex-shrink:0;box-shadow:inset 0 -1px 2px rgba(0,0,0,.6)}
.rx-led.on{background:var(--green);box-shadow:0 0 8px var(--green),inset 0 -1px 2px rgba(0,0,0,.4)}
.rx-led.wait{background:var(--amber);box-shadow:0 0 8px var(--amber);animation:rx-blink 1.2s steps(2) infinite}
.rx-led.off{background:#1b232c}
@keyframes rx-blink{50%{opacity:.25}}

/* Cœur du réacteur */
.rx-core{position:relative;display:grid;place-items:center;border-radius:50%}
.rx-core .rx-spin{animation:rx-spin 18s linear infinite;transform-origin:50% 50%}
.rx-core .rx-spin-rev{animation:rx-spin 11s linear infinite reverse;transform-origin:50% 50%}
@keyframes rx-spin{to{transform:rotate(360deg)}}
.rx-pulse{animation:rx-pulse 2.2s ease-in-out infinite}
@keyframes rx-pulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}

/* Postes des joueurs */
.rx-station{transition:box-shadow .3s}
.rx-station.is-key{box-shadow:inset 0 0 0 2px var(--amber),0 0 26px rgba(255,181,71,.35),0 14px 28px rgba(0,0,0,.6)}
.rx-station.is-me{box-shadow:inset 0 0 0 1px rgba(88,243,255,.5),0 14px 28px rgba(0,0,0,.6)}

/* Trappes blindées */
.rx-hatch{position:relative;width:54px;height:72px;border-radius:10px;
  background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(0,0,0,.35) 60%),url(/themes/reactor/steel.jpg) center/160px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -3px 6px rgba(0,0,0,.55),0 0 0 2px #0b1016,0 6px 10px rgba(0,0,0,.6)}
.rx-hatch::before{content:'';position:absolute;left:6px;right:6px;top:8px;height:8px;border-radius:2px;background:repeating-linear-gradient(-45deg,#f2b632 0 5px,#141414 5px 10px);opacity:.85}
.rx-hatch::after{content:'';position:absolute;left:50%;top:44px;width:24px;height:7px;margin-left:-12px;border-radius:4px;
  background:linear-gradient(180deg,#e9eef4,#6e7884);box-shadow:0 2px 3px rgba(0,0,0,.6)}
.rx-hatch .rx-bolt{position:absolute;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#7d8793 60%,#2c333b)}
button.rx-hatch{cursor:pointer;transition:transform .15s,box-shadow .15s}
button.rx-hatch:hover{transform:translateY(-3px);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 0 2px var(--amber),0 0 16px rgba(255,181,71,.6),0 8px 12px rgba(0,0,0,.6)}
button.rx-hatch[aria-pressed=true]{transform:translateY(-5px);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 0 3px var(--amber),0 0 22px rgba(255,181,71,.85),0 8px 12px rgba(0,0,0,.6)}
.rx-cardface{position:absolute;inset:0;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:9px;font-family:'Orbitron',sans-serif;letter-spacing:.06em;text-transform:uppercase}
.rx-face-rod{background:radial-gradient(circle at 50% 40%,#0f4a57,#04141a 75%);box-shadow:inset 0 0 0 2px var(--cyan),0 0 18px rgba(88,243,255,.55);color:var(--cyan)}
.rx-face-overload{background:radial-gradient(circle at 50% 40%,#5a0d07,#160302 75%);box-shadow:inset 0 0 0 2px var(--red),0 0 24px rgba(255,68,51,.8);color:#ff7a6b;animation:rx-danger 1s ease-in-out infinite}
@keyframes rx-danger{50%{box-shadow:inset 0 0 0 2px var(--red),0 0 40px rgba(255,68,51,1)}}
.rx-face-empty{background:linear-gradient(180deg,#1b2129,#0b0f14);box-shadow:inset 0 0 0 2px #39434e,inset 0 6px 14px rgba(0,0,0,.7);color:#7b8794}
.rx-rod{width:12px;height:38px;border-radius:6px;background:linear-gradient(90deg,#0a6f7e,#b8fbff 45%,#0d8fa1);box-shadow:0 0 14px var(--cyan),0 0 4px #fff}
.rx-last{outline:2px solid var(--amber);outline-offset:3px}

/* Boutons */
.rx-btn{font-family:'Orbitron',sans-serif;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.82rem;border-radius:10px;padding:.75rem 1.2rem;color:#061016;
  background:linear-gradient(180deg,#9ff9ff,#2fd3e6 55%,#139bb0);border:1px solid #0a5966;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 3px 0 #0a5966,0 0 18px rgba(88,243,255,.35);transition:transform .1s,filter .1s}
.rx-btn:hover{filter:brightness(1.08)}.rx-btn:active{transform:translateY(2px)}
.rx-btn:disabled{opacity:.4;filter:grayscale(.6)}
.rx-btn.amber{color:#1c1004;background:linear-gradient(180deg,#ffe3a8,#ffb547 55%,#d68412);border-color:#7a4a08;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 3px 0 #7a4a08,0 0 18px rgba(255,181,71,.4)}
.rx-btn2{font-family:'Orbitron',sans-serif;font-weight:600;letter-spacing:.1em;text-transform:uppercase;font-size:.74rem;border-radius:10px;padding:.65rem 1rem;color:#cfe3ef;
  background:rgba(4,10,14,.55);border:1px solid rgba(88,243,255,.35)}
.rx-btn2:hover{border-color:var(--cyan)}

/* Flash d'événement */
.rx-flash{position:fixed;inset:0;z-index:44;pointer-events:none;animation:rx-flash 1.2s ease-out forwards}
@keyframes rx-flash{0%{opacity:0}12%{opacity:1}100%{opacity:0}}
.rx-shake{animation:rx-shake .6s ease-in-out}
@keyframes rx-shake{0%,100%{transform:translate(0)}20%{transform:translate(-7px,3px)}40%{transform:translate(6px,-4px)}60%{transform:translate(-5px,2px)}80%{transform:translate(4px,0)}}
.rx-cursor::after{content:'▌';margin-left:2px;animation:rx-blink 1s steps(2) infinite}
@keyframes rx-open{from{transform:perspective(400px) rotateY(90deg)}to{transform:none}}

/* Écrans communs (passage du terminal, fin de partie, menus) */
.rx-ui-panel{position:relative;border-radius:16px;padding:34px 24px 26px;color:#dfe8f2;font-family:'Rajdhani','Segoe UI',system-ui,sans-serif;font-weight:500;
  background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(0,0,0,.5)),url(/themes/reactor/panel.jpg) center/420px;border:1px solid #05080c;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(88,243,255,.14),0 30px 80px rgba(0,0,0,.8),0 0 70px rgba(88,243,255,.1)}
.rx-ui-panel::before{content:'';position:absolute;left:24px;right:24px;top:0;height:8px;border-radius:0 0 4px 4px;background:repeating-linear-gradient(-45deg,#f2b632 0 10px,#151515 10px 20px);opacity:.9}
.rx-ui-panel::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(circle at 12px 12px,#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px),radial-gradient(circle at calc(100% - 12px) 12px,#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px),
    radial-gradient(circle at 12px calc(100% - 12px),#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px),radial-gradient(circle at calc(100% - 12px) calc(100% - 12px),#c9d3de 0 1.8px,#3a424c 2.4px,transparent 3.4px)}
.rx-ui-kicker{font-family:'Share Tech Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#ffb547;text-shadow:0 0 8px rgba(255,181,71,.6)}
.rx-ui-title{font-family:'Orbitron','Rajdhani',sans-serif;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:1.6rem;line-height:1.15;color:#58f3ff;
  text-shadow:0 0 8px rgba(88,243,255,.8),0 0 26px rgba(88,243,255,.4)}
.rx-ui-text{color:#b9c8d6;font-size:1.05rem;font-family:'Rajdhani','Segoe UI',system-ui,sans-serif}
.rx-hud{border-radius:12px;color:#9ff9ff;border:1px solid rgba(88,243,255,.4);background:linear-gradient(180deg,#1c2731,#090f14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 14px rgba(88,243,255,.2),0 4px 12px rgba(0,0,0,.6)}
.rx-hud:hover{border-color:#58f3ff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 22px rgba(88,243,255,.45),0 4px 12px rgba(0,0,0,.6)}
.rx-ui-drawer{color:#dfe8f2;font-family:'Rajdhani','Segoe UI',system-ui,sans-serif;font-weight:500;border-left:2px solid rgba(88,243,255,.4);
  background:linear-gradient(180deg,rgba(6,14,19,.93),rgba(3,8,12,.97)),url(/themes/reactor/panel.jpg) center/420px;box-shadow:-20px 0 60px rgba(0,0,0,.65)}
.rx-ui-pill{font-family:'Share Tech Mono',ui-monospace,monospace;font-size:12.5px;letter-spacing:.05em;color:#bff7ff;padding:8px 12px;border-radius:8px;
  background:radial-gradient(120% 120% at 50% 0%,#0d2a33,#03090c);box-shadow:inset 0 0 0 1px rgba(88,243,255,.4),0 0 18px rgba(88,243,255,.18),0 6px 16px rgba(0,0,0,.5)}
/* Annonces plein écran */
.rx-banner{position:relative;isolation:isolate;width:min(780px,100%);padding:20px 12px 18px;text-align:center;animation:rx-banner 2s cubic-bezier(.2,.8,.2,1) both;font-family:'Rajdhani','Segoe UI',system-ui,sans-serif}
.rx-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(3,8,12,.92) 22%,rgba(3,8,12,.92) 78%,transparent);
  border-top:1px solid rgba(88,243,255,.45);border-bottom:1px solid rgba(88,243,255,.45);box-shadow:0 0 40px rgba(88,243,255,.15)}
.rx-banner .k{font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#9fdfe8}
.rx-banner .s{margin-top:6px;color:#dfe8f2;font-size:1.15rem}
.rx-bigcard{display:inline-block;transform:scale(1.9);margin:30px 0 22px;animation:rx-slam .55s cubic-bezier(.2,1.6,.4,1) both}
@keyframes rx-slam{from{transform:scale(3) rotateY(90deg);opacity:0}to{transform:scale(1.9);opacity:1}}
@keyframes rx-banner{0%{opacity:0;transform:scale(1.08)}12%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.rx-face{position:relative;display:inline-block;flex:none;border-radius:10px;overflow:hidden;background:radial-gradient(circle at 40% 30%,#1d4a5a,#05121a);box-shadow:inset 0 0 0 1px rgba(88,243,255,.55),0 0 10px rgba(88,243,255,.25)}
.rx-face::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(88,243,255,.07) 0 1px,transparent 1px 3px);pointer-events:none}
.rx-station.is-key .rx-face{box-shadow:inset 0 0 0 1px #ffb547,0 0 12px rgba(255,181,71,.5)}
.rx-badge-role{position:absolute;right:-8px;bottom:-8px;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#0a141a}
@media (prefers-reduced-motion:reduce){.rx *{animation:none!important;transition:none!important}}
`;
