/** Décor d'Expédition : nuit polaire moderne — aurore, montagnes à facettes, brume, verre givré, feu de camp. */
export const EXPEDITION_CSS = `
.ex{position:relative;min-height:100dvh;color:#eef6ff;font-family:'Outfit',system-ui,sans-serif;font-weight:400;font-size:16px;overflow:hidden;overflow:clip;isolation:isolate;
  background:radial-gradient(120% 60% at 50% 0%,#14365a 0%,#0a1f3a 40%,#061428 70%,#040c1a 100%)}
.ex-aurora{position:absolute;left:-15%;right:-15%;top:-60px;height:560px;z-index:-2;pointer-events:none;mix-blend-mode:screen;filter:blur(26px);opacity:.8;
  background:radial-gradient(38% 26% at 18% 38%,rgba(70,255,190,.55),transparent 70%),radial-gradient(34% 24% at 52% 26%,rgba(40,220,230,.48),transparent 70%),
    radial-gradient(40% 30% at 84% 40%,rgba(150,110,255,.42),transparent 70%),radial-gradient(70% 18% at 50% 52%,rgba(80,255,200,.22),transparent 70%);
  animation:ex-aurora 18s ease-in-out infinite alternate}
@keyframes ex-aurora{0%{transform:translateX(-4%) skewX(-8deg);opacity:.65}50%{opacity:.9}100%{transform:translateX(5%) skewX(8deg);opacity:.7}}
.ex-stars{position:absolute;inset:0 0 auto 0;height:460px;z-index:-3;opacity:.85;animation:ex-twinkle 6s ease-in-out infinite;
  background-image:radial-gradient(1.2px 1.2px at 8% 12%,#fff 60%,transparent),radial-gradient(1px 1px at 18% 38%,#fff 60%,transparent),radial-gradient(1.4px 1.4px at 29% 8%,#fff 60%,transparent),
    radial-gradient(1px 1px at 41% 30%,#dfe9ff 60%,transparent),radial-gradient(1.2px 1.2px at 55% 10%,#fff 60%,transparent),radial-gradient(1px 1px at 64% 36%,#fff 60%,transparent),
    radial-gradient(1.3px 1.3px at 72% 6%,#fff 60%,transparent),radial-gradient(1px 1px at 93% 25%,#fff 60%,transparent),radial-gradient(1px 1px at 3% 28%,#fff 60%,transparent),radial-gradient(1.2px 1.2px at 85% 14%,#fff 60%,transparent)}
@keyframes ex-twinkle{50%{opacity:.55}}
.ex-snow{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.7;
  background-image:radial-gradient(2px 2px at 20px 30px,#fff 50%,transparent),radial-gradient(1.5px 1.5px at 90px 120px,#fff 50%,transparent),radial-gradient(2.5px 2.5px at 150px 60px,rgba(255,255,255,.9) 50%,transparent),
    radial-gradient(1.5px 1.5px at 60px 170px,#fff 50%,transparent),radial-gradient(2px 2px at 180px 190px,#fff 50%,transparent);
  background-size:220px 220px;animation:ex-fall 16s linear infinite}
.ex-snow.far{opacity:.35;background-size:140px 140px;animation-duration:26s;filter:blur(.6px)}
@keyframes ex-fall{from{background-position:0 0}to{background-position:60px 880px}}
.ex-title{font-family:'Outfit',system-ui,sans-serif;font-weight:800;letter-spacing:-.01em}
.ex-frost{background:linear-gradient(180deg,#ffffff,#bfe6ff 60%,#7fc4f0);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 18px rgba(120,200,255,.45))}
.ex-kicker{font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:#9fd2ff}

/* Verre givré */
.ex-glass{position:relative;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.05));
  -webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);border:1px solid rgba(255,255,255,.18);
  box-shadow:0 24px 48px rgba(0,8,24,.45),inset 0 1px 0 rgba(255,255,255,.28)}

/* La carte du parcours (paysage) */
.ex-route{position:relative;height:300px;border-radius:26px;overflow:hidden;box-shadow:0 30px 60px rgba(0,8,24,.55),inset 0 0 0 1px rgba(255,255,255,.14)}
@media (max-width:639px){.ex-route{height:230px;border-radius:20px}}
.ex-route svg.bg{position:absolute;inset:0;width:100%;height:100%}
.ex-way{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;width:110px}
.ex-way .pin{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.08));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  border:1.5px solid rgba(255,255,255,.55);box-shadow:0 8px 18px rgba(0,8,24,.45)}
.ex-way.done-ok .pin{background:linear-gradient(180deg,#5ef0a0,#14955a);border-color:#c9ffe0;box-shadow:0 0 0 4px rgba(94,240,160,.25),0 0 26px rgba(94,240,160,.6)}
.ex-way.done-ko .pin{background:linear-gradient(180deg,#ff8a7a,#b3261e);border-color:#ffd6cf;box-shadow:0 0 0 4px rgba(255,120,100,.22),0 0 26px rgba(255,90,74,.55)}
.ex-way.now .pin{background:linear-gradient(180deg,#ffe29a,#ff9f2a);border-color:#fff4d6;animation:ex-glow 1.8s ease-in-out infinite}
@keyframes ex-glow{0%,100%{box-shadow:0 0 0 4px rgba(255,200,90,.25),0 0 18px rgba(255,190,90,.6)}50%{box-shadow:0 0 0 9px rgba(255,200,90,.12),0 0 34px rgba(255,190,90,.95)}}
.ex-way.future .pin{opacity:.75}
.ex-way .lbl{font-weight:600;font-size:13px;line-height:1.1;color:#fff;text-shadow:0 2px 8px rgba(0,8,24,.9)}
.ex-way .tag{font-size:11.5px;font-weight:600;line-height:1.3;padding:1px 8px;border-radius:999px;background:rgba(4,14,30,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#d9ecff;white-space:nowrap}
@media (max-width:639px){.ex-way{width:78px}.ex-way .pin{width:38px;height:38px}.ex-way .lbl{font-size:11px}.ex-way .tag{font-size:10px;padding:0 6px}}
.ex-flake{display:inline-grid;place-items:center;opacity:.45}
.ex-flake.on{opacity:1;animation:ex-spin 6s linear infinite}
@keyframes ex-spin{to{transform:rotate(360deg)}}

/* Étapes et consigne */
.ex-steps{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin:16px 0 0;padding:0;list-style:none}
.ex-steps li{display:flex;align-items:center;gap:7px;padding:5px 14px 5px 5px;border-radius:999px;font-size:14px;font-weight:600;color:#a9c3da;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);white-space:nowrap}
.ex-steps .n{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.1);color:#cfe6ff}
.ex-steps li.done{opacity:.5}
.ex-steps li.now{color:#04203a;background:linear-gradient(180deg,#ffffff,#bfe6ff);border-color:transparent;box-shadow:0 8px 24px rgba(120,200,255,.45)}
.ex-steps li.now .n{background:linear-gradient(180deg,#ffb54a,#ff7a1a);color:#fff}
@media (max-width:639px){.ex-steps li:not(.now){padding:5px}.ex-steps li:not(.now) .t{display:none}}
.ex-call{display:flex;align-items:center;gap:14px;margin-top:12px;padding:12px 18px 12px 12px;border-radius:20px;color:#f4f9ff;font-size:1.06rem;line-height:1.35;
  background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.05));-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.16);box-shadow:0 14px 30px rgba(0,8,24,.35),inset 0 1px 0 rgba(255,255,255,.2)}
.ex-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(180deg,#ffb54a,#ff6a1a);box-shadow:0 8px 18px rgba(255,120,40,.4)}
.ex-call strong{color:#ffd08a;font-weight:600}
.ex-call.is-mine{border-color:rgba(255,200,120,.6);animation:ex-pulse 2.4s ease-in-out infinite}
@keyframes ex-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,190,90,.0),0 14px 30px rgba(0,8,24,.35)}50%{box-shadow:0 0 0 6px rgba(255,190,90,.14),0 14px 30px rgba(0,8,24,.35)}}

/* Le camp autour du feu */
.ex-camp{position:absolute;inset:10% 6%;border-radius:50%;
  background:radial-gradient(30% 30% at 50% 52%,rgba(255,170,80,.55),rgba(255,140,60,.16) 50%,transparent 72%),radial-gradient(100% 100% at 50% 40%,#f2f8ff 0%,#cfe0ee 55%,#8eaac2 100%);
  box-shadow:0 30px 60px rgba(0,8,24,.55),inset 0 -24px 60px rgba(60,90,130,.45),inset 0 12px 40px rgba(255,255,255,.6)}
.ex-camp::after{content:'';position:absolute;inset:-3%;border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,transparent 92%,rgba(255,255,255,.35) 96%,transparent 100%)}
.ex-fire{position:relative;display:grid;place-items:center;width:110px;height:110px}
.ex-fire::before{content:'';position:absolute;inset:-26px;border-radius:50%;background:radial-gradient(circle,rgba(255,190,90,.75),rgba(255,120,40,.22) 45%,transparent 70%);animation:ex-flicker 1.5s ease-in-out infinite}
@keyframes ex-flicker{0%,100%{opacity:1;transform:scale(1)}30%{opacity:.82;transform:scale(.95)}60%{opacity:.95;transform:scale(1.05)}}
.ex-flame{transform-origin:50% 100%;animation:ex-dance 1.2s ease-in-out infinite}
.ex-flame.b{animation-duration:.9s;animation-delay:-.3s}.ex-flame.c{animation-duration:1.5s;animation-delay:-.6s}
@keyframes ex-dance{0%,100%{transform:scaleY(1) skewX(0)}25%{transform:scaleY(1.08) skewX(-3deg)}50%{transform:scaleY(.94) skewX(2deg)}75%{transform:scaleY(1.05) skewX(-1deg)}}
.ex-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 2px;text-align:center}
.ex-hood{position:relative;display:grid;place-items:center;border-radius:50%;
  background:radial-gradient(circle at 50% 30%,#3f6f9a,#173251 70%);box-shadow:0 0 0 3px rgba(255,255,255,.85),0 12px 24px rgba(0,8,24,.45)}
.ex-seat.is-team .ex-hood{box-shadow:0 0 0 3px #ffcf7a,0 0 0 7px rgba(255,207,122,.25),0 0 24px rgba(255,190,90,.7)}
.ex-seat.is-leader .ex-hood{box-shadow:0 0 0 3px #fff,0 0 0 7px rgba(255,255,255,.18),0 0 26px rgba(170,220,255,.8)}
.ex-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:2px 10px 3px;border-radius:999px;
  background:rgba(4,14,30,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 14px rgba(0,8,24,.35)}
.ex-name{font-weight:600;font-size:13.5px;line-height:1.25;color:#f4f9ff;overflow:hidden;text-overflow:ellipsis}
.ex-tag{font-size:11px;font-weight:600;color:#ffcf7a;flex:none}
.ex-seat.is-me .ex-plate{border-color:#ffcf7a}
.ex-token{position:absolute;display:grid;place-items:center;border-radius:50%;box-shadow:0 4px 10px rgba(0,8,24,.5),0 0 0 2px #fff;z-index:2}
.ex-chip{position:absolute;top:-14px;left:50%;transform:translateX(-50%);z-index:3;white-space:nowrap;font-size:11.5px;font-weight:600;line-height:1.5;padding:0 9px;border-radius:999px;box-shadow:0 4px 10px rgba(0,8,24,.4)}
.tone-green{color:#04301a;background:#9ff0c4}.tone-dim{color:#d9ecff;background:rgba(4,14,30,.78)}
.tone-red{color:#fff;background:#d6453a}.tone-gold{color:#3a2000;background:linear-gradient(180deg,#ffe29a,#ffb54a)}
.ex-vote{font-size:11px;font-weight:700;padding:0 8px;border-radius:999px;line-height:1.6}
.ex-vote.yes{color:#04301a;background:#9ff0c4}.ex-vote.no{color:#fff;background:#d6453a}
.ex-role{font-size:11px;font-weight:700;padding:0 8px;border-radius:999px;line-height:1.6}
.ex-role.expedition{color:#04203a;background:#bfe6ff}.ex-role.mutiny{color:#fff;background:#c43b3b}
button.ex-seat{cursor:pointer;transition:transform .15s}button.ex-seat:hover{transform:translateY(-4px)}

/* Panneaux */
.ex-notebook,.ex-dock{position:relative;padding:20px 18px 18px;border-radius:24px;color:#f4f9ff;
  background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.05));-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);
  border:1px solid rgba(255,255,255,.2);box-shadow:0 24px 48px rgba(0,8,24,.45),inset 0 1px 0 rgba(255,255,255,.3)}
.ex-dock{animation:ex-rise .35s cubic-bezier(.2,1,.3,1)}
@keyframes ex-rise{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}
.ex-dock h4,.ex-notebook h4{font-weight:800;font-size:1.25rem;color:#fff;text-align:center;line-height:1.25;letter-spacing:-.01em}
.ex-dock .muted,.ex-notebook .muted{color:#a9c3da}
.ex-btn{font-family:'Outfit',sans-serif;font-weight:700;font-size:1rem;border-radius:999px;padding:.78rem 1.5rem;color:#04203a;border:none;
  background:linear-gradient(180deg,#ffffff,#bfe6ff);box-shadow:0 10px 24px rgba(120,200,255,.4),inset 0 -2px 0 rgba(0,40,80,.15);transition:transform .15s,filter .15s}
.ex-btn:hover{filter:brightness(1.05);transform:translateY(-1px)}.ex-btn:active{transform:translateY(1px)}.ex-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.ex-btn.warm{color:#3a1800;background:linear-gradient(180deg,#ffe29a,#ff9f2a);box-shadow:0 10px 24px rgba(255,160,60,.45),inset 0 -2px 0 rgba(80,30,0,.2)}
.ex-btn.danger{color:#fff;background:linear-gradient(180deg,#ff7a6a,#c4302a);box-shadow:0 10px 24px rgba(220,60,50,.45)}
.ex-btn2{font-family:'Outfit',sans-serif;font-weight:600;font-size:.95rem;border-radius:999px;padding:.68rem 1.2rem;color:#eef6ff;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
.ex-btn2:hover{background:rgba(255,255,255,.14)}
.ex-pick{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px;border-radius:18px;transition:transform .15s,background .15s}
.ex-pick:hover{transform:translateY(-2px);background:rgba(255,255,255,.06)}
.ex-pick[aria-pressed=true],.ex-pick[aria-checked=true]{background:rgba(255,207,122,.16);box-shadow:inset 0 0 0 2px #ffcf7a}
.ex-card{position:relative;flex:1 1 0;max-width:170px;aspect-ratio:4/5;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  border:1px solid rgba(255,255,255,.3);box-shadow:0 18px 36px rgba(0,8,24,.45),inset 0 1px 0 rgba(255,255,255,.5);transition:transform .25s cubic-bezier(.3,1.4,.5,1),box-shadow .25s}
.ex-card.ok{color:#04203a;background:linear-gradient(160deg,#ffffff 0%,#d9f0ff 45%,#8fd0ff 100%)}
.ex-card.ko{color:#fff;background:linear-gradient(160deg,#ff9a8a 0%,#d6453a 45%,#7a1410 100%)}
.ex-card:is(button):hover:not(:disabled){transform:translateY(-8px) scale(1.02);box-shadow:0 26px 46px rgba(0,8,24,.55)}
.ex-card .w{font-weight:800;font-size:1.35rem;letter-spacing:-.01em}
.ex-card:disabled{opacity:.3;filter:grayscale(.7)}
.ex-mini{display:inline-block;flex:none;border-radius:6px;box-shadow:0 3px 6px rgba(0,8,24,.4)}

/* Annonces */
.ex-banner{position:relative;isolation:isolate;width:min(820px,100%);padding:26px 14px 24px;text-align:center;animation:ex-banner 2.2s cubic-bezier(.2,.8,.2,1) both}
.ex-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(4,14,30,.78) 22%,rgba(4,14,30,.78) 78%,transparent);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.ex-banner .k{font-size:13px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:#9fd2ff}
.ex-banner .s{margin-top:8px;color:#e6f3ff;font-size:1.12rem}
@keyframes ex-banner{0%{opacity:0;transform:scale(1.06)}12%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.ex-flip{animation:ex-flip .55s cubic-bezier(.3,1.3,.5,1) both}
@keyframes ex-flip{from{transform:perspective(500px) rotateY(90deg)}to{transform:none}}

/* Écrans communs */
.ex-ui-panel{position:relative;padding:30px 22px 24px;border-radius:26px;color:#f4f9ff;font-family:'Outfit',system-ui,sans-serif;
  background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3);
  border:1px solid rgba(255,255,255,.22);box-shadow:0 30px 70px rgba(0,8,24,.6),inset 0 1px 0 rgba(255,255,255,.3)}
.ex-ui-kicker{font-size:12px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:#9fd2ff}
.ex-ui-title{font-weight:800;font-size:2rem;line-height:1.1;letter-spacing:-.01em;color:#fff}
.ex-ui-text{color:#cfe2f3;font-size:1.02rem}
.ex-hud{border-radius:50%;color:#fff;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 8px 20px rgba(0,8,24,.4)}
.ex-hud:hover{background:rgba(255,255,255,.2)}
.ex-ui-drawer{color:#eef6ff;font-family:'Outfit',system-ui,sans-serif;border-left:1px solid rgba(255,255,255,.18);background:rgba(6,20,40,.82);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:-20px 0 60px rgba(0,8,24,.6)}
.ex-ui-pill{font-family:'Outfit',sans-serif;font-weight:600;font-size:13px;color:#fff;padding:7px 14px;border-radius:999px;background:rgba(4,14,30,.7);border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
@media (prefers-reduced-motion:reduce){.ex *{animation:none!important;transition:none!important}.ex-banner{animation:ex-fade .2s both!important}}
@keyframes ex-fade{from{opacity:0}to{opacity:1}}
`;
