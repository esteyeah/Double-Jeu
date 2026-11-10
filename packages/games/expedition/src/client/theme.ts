/** Décor d'Expédition : nuit polaire, aurore boréale, neige qui tombe, camp autour du feu, carnet de bord. */
export const EXPEDITION_CSS = `
@font-face{font-family:'Ex Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.ex{position:relative;min-height:100dvh;color:#eef6ff;font-family:'Ex Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;overflow:hidden;isolation:isolate;
  background:linear-gradient(180deg,#020713 0%,#071a33 22%,#0f2d4d 42%,#1b4566 58%,rgba(40,80,110,.0) 74%),url(/themes/expedition/snow.jpg) center/480px,#c9dbe8}
.ex-aurora{position:absolute;left:-10%;right:-10%;top:-40px;height:520px;z-index:-2;pointer-events:none;mix-blend-mode:screen;filter:blur(22px);opacity:.75;
  background:radial-gradient(40% 30% at 20% 40%,rgba(80,255,170,.55),transparent 70%),radial-gradient(35% 26% at 55% 30%,rgba(60,220,200,.5),transparent 70%),
    radial-gradient(40% 32% at 85% 45%,rgba(140,110,255,.40),transparent 70%),radial-gradient(60% 20% at 50% 55%,rgba(90,255,190,.25),transparent 70%);
  animation:ex-aurora 16s ease-in-out infinite alternate}
@keyframes ex-aurora{0%{transform:translateX(-4%) skewX(-6deg);opacity:.6}50%{opacity:.85}100%{transform:translateX(5%) skewX(6deg);opacity:.65}}
.ex-stars{position:absolute;inset:0 0 auto 0;height:420px;z-index:-3;opacity:.8;animation:ex-twinkle 6s ease-in-out infinite;
  background-image:radial-gradient(1.2px 1.2px at 8% 12%,#fff 60%,transparent),radial-gradient(1px 1px at 18% 38%,#fff 60%,transparent),radial-gradient(1.4px 1.4px at 29% 8%,#fff 60%,transparent),
    radial-gradient(1px 1px at 41% 30%,#dfe9ff 60%,transparent),radial-gradient(1.2px 1.2px at 55% 10%,#fff 60%,transparent),radial-gradient(1px 1px at 64% 36%,#fff 60%,transparent),
    radial-gradient(1.3px 1.3px at 72% 6%,#fff 60%,transparent),radial-gradient(1px 1px at 93% 25%,#fff 60%,transparent),radial-gradient(1px 1px at 3% 28%,#fff 60%,transparent),radial-gradient(1.2px 1.2px at 85% 14%,#fff 60%,transparent)}
@keyframes ex-twinkle{50%{opacity:.5}}
.ex-snow{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.8;
  background-image:radial-gradient(2px 2px at 20px 30px,#fff 50%,transparent),radial-gradient(1.5px 1.5px at 90px 120px,#fff 50%,transparent),radial-gradient(2.5px 2.5px at 150px 60px,rgba(255,255,255,.9) 50%,transparent),
    radial-gradient(1.5px 1.5px at 60px 170px,#fff 50%,transparent),radial-gradient(2px 2px at 180px 190px,#fff 50%,transparent);
  background-size:220px 220px;animation:ex-fall 14s linear infinite}
.ex-snow.far{opacity:.45;background-size:140px 140px;animation-duration:22s;filter:blur(.5px)}
@keyframes ex-fall{from{background-position:0 0}to{background-position:60px 880px}}
.ex-title{font-family:'Special Elite','Courier New',monospace;letter-spacing:.06em}
.ex-frost{color:#f4fbff;text-shadow:0 0 12px rgba(160,220,255,.7),0 2px 0 rgba(10,30,60,.8)}
.ex-num{font-family:'Ex Digits',serif;font-weight:700}

/* La carte du parcours */
.ex-route{position:relative;height:230px;border-radius:16px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(200,230,255,.25),0 14px 30px rgba(0,0,0,.45)}
@media (max-width:639px){.ex-route{height:200px}}
.ex-route svg.bg{position:absolute;inset:0;width:100%;height:100%}
.ex-way{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;width:96px}
@media (max-width:639px){.ex-way{width:74px}.ex-way .pin{width:38px;height:38px}.ex-way .lbl{font-size:10.5px}.ex-way .tag{font-size:10.5px}}
.ex-way .pin{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#5f7f9c,#243a52 70%);
  box-shadow:0 0 0 2px rgba(230,245,255,.7),0 6px 12px rgba(0,0,0,.5)}
.ex-way.done-ok .pin{background:radial-gradient(circle at 35% 30%,#7fe0a0,#1f7a46 70%);box-shadow:0 0 0 2px #d9ffe6,0 0 16px rgba(120,255,170,.6)}
.ex-way.done-ko .pin{background:radial-gradient(circle at 35% 30%,#ff8a7a,#8e1b14 70%);box-shadow:0 0 0 2px #ffd2c9,0 0 16px rgba(255,90,74,.6)}
.ex-way.now .pin{background:radial-gradient(circle at 35% 30%,#ffe7a0,#c8861c 70%);animation:ex-glow 1.6s ease-in-out infinite}
@keyframes ex-glow{0%,100%{box-shadow:0 0 0 2px #fff4cc,0 0 10px rgba(255,214,120,.6)}50%{box-shadow:0 0 0 3px #fff4cc,0 0 26px rgba(255,214,120,1)}}
.ex-way.future .pin{opacity:.7}
.ex-way .lbl{font-family:'Special Elite',monospace;font-size:11.5px;line-height:1.1;color:#f4fbff;text-shadow:0 1px 3px rgba(0,0,0,.95),0 0 8px rgba(0,0,0,.7)}
.ex-way .tag{font-size:11.5px;line-height:1.2;padding:0 6px;border-radius:999px;background:rgba(6,16,30,.82);color:#d9ecff;white-space:nowrap}
.ex-flake{display:inline-grid;place-items:center;filter:grayscale(1) brightness(.6);opacity:.6}
.ex-flake.on{filter:none;opacity:1;animation:ex-spin 6s linear infinite}
@keyframes ex-spin{to{transform:rotate(360deg)}}

/* Étapes et consigne */
.ex-steps{display:flex;justify-content:center;flex-wrap:wrap;gap:5px;margin:12px 0 0;padding:0;list-style:none}
.ex-steps li{display:flex;align-items:center;gap:6px;padding:4px 11px 4px 4px;border-radius:999px;font-size:14px;color:#a9c3da;background:rgba(4,14,28,.7);border:1px solid rgba(180,220,255,.22);white-space:nowrap}
.ex-steps .n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#0d2238;color:#9fc3dd}
.ex-steps li.done{opacity:.55}
.ex-steps li.now{color:#06182a;background:linear-gradient(180deg,#ffffff,#bfe3ff);border-color:#6fa8d6;font-weight:700;box-shadow:0 0 18px rgba(170,220,255,.6)}
.ex-steps li.now .n{background:#c8861c;color:#fff4cc}
@media (max-width:639px){.ex-steps li:not(.now){padding:4px}.ex-steps li:not(.now) .t{display:none}}
.ex-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:14px;color:#eef6ff;font-size:1.13rem;line-height:1.3;
  background:linear-gradient(180deg,rgba(14,36,60,.88),rgba(5,16,30,.94));border:1px solid rgba(180,220,255,.35);box-shadow:0 8px 18px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12)}
.ex-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd27a,#b8641a 65%);box-shadow:0 0 0 2px rgba(255,236,190,.7),0 0 16px rgba(255,170,80,.5)}
.ex-call strong{color:#ffe3a0;font-weight:600}
.ex-call.is-mine{animation:ex-pulse 2.2s ease-in-out infinite}
@keyframes ex-pulse{0%,100%{box-shadow:0 0 0 2px #6fa8d6,0 0 18px rgba(170,220,255,.35),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 2px #dff2ff,0 0 34px rgba(170,220,255,.75),0 8px 18px rgba(0,0,0,.5)}}

/* Le camp : l'expédition autour du feu */
.ex-camp{position:absolute;inset:9% 6%;border-radius:50%;
  background:radial-gradient(34% 32% at 50% 50%,rgba(255,170,80,.55),rgba(255,140,60,.18) 55%,transparent 75%),url(/themes/expedition/snow.jpg) center/320px;
  box-shadow:0 0 0 3px rgba(255,255,255,.6),0 22px 50px rgba(0,20,40,.55),inset 0 -20px 50px rgba(40,70,100,.45),inset 0 10px 30px rgba(255,255,255,.4)}
.ex-camp::after{content:'';position:absolute;inset:28%;border-radius:50%;pointer-events:none;
  background:repeating-conic-gradient(from 0deg,#5d636b 0 7deg,transparent 7deg 13deg);
  -webkit-mask:radial-gradient(closest-side,transparent calc(100% - 9px),#000 calc(100% - 8px));mask:radial-gradient(closest-side,transparent calc(100% - 9px),#000 calc(100% - 8px));opacity:.5}
.ex-fire{position:relative;display:grid;place-items:center}
.ex-fire::before{content:'';position:absolute;inset:-22px;border-radius:50%;background:radial-gradient(circle,rgba(255,190,90,.75),rgba(255,120,40,.25) 45%,transparent 70%);animation:ex-flicker 1.4s ease-in-out infinite}
@keyframes ex-flicker{0%,100%{opacity:1;transform:scale(1)}30%{opacity:.8;transform:scale(.95)}60%{opacity:.95;transform:scale(1.04)}}
.ex-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;text-align:center}
.ex-hood{position:relative;display:grid;place-items:center;border-radius:50%;box-shadow:inset 0 -5px 10px rgba(0,0,0,.4),inset 0 4px 8px rgba(255,255,255,.35),0 0 0 3px #f4fbff,0 6px 12px rgba(0,20,40,.55)}
.ex-hood::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:4px solid rgba(240,240,240,.85);border-style:dotted;opacity:0;pointer-events:none}
.ex-seat.is-team .ex-hood{box-shadow:inset 0 -5px 10px rgba(0,0,0,.4),0 0 0 3px #e3c58a,0 0 0 6px #6b4a22,0 0 16px rgba(227,197,138,.8)}
.ex-seat.is-leader .ex-hood{box-shadow:inset 0 -5px 10px rgba(0,0,0,.4),0 0 0 3px #ffd27a,0 0 22px rgba(255,210,122,.9)}
.ex-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:7px;
  background:linear-gradient(180deg,rgba(10,30,52,.94),rgba(4,14,28,.96));border:1px solid rgba(180,220,255,.45);box-shadow:0 3px 8px rgba(0,20,40,.5)}
.ex-name{font-family:'Special Elite',monospace;font-size:13.5px;line-height:1.25;color:#f4fbff;overflow:hidden;text-overflow:ellipsis}
.ex-tag{font-size:11px;color:#ffd27a;flex:none}
.ex-seat.is-me .ex-plate{border-color:#ffd27a}
.ex-token{position:absolute;display:grid;place-items:center;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,.6),0 0 0 2px #f4fbff}
.ex-chip{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:12px;line-height:1.35;padding:0 8px;border-radius:999px;border:1px solid;background:rgba(4,14,28,.92);box-shadow:0 2px 6px rgba(0,0,0,.45)}
.tone-green{color:#c8f5d6;border-color:rgba(120,220,160,.7)}.tone-dim{color:#b9cfe2;border-color:rgba(160,200,230,.45)}
.tone-red{color:#fff;border-color:#ff8a7a;background:#8e1b14}.tone-gold{color:#2a1505;border-color:#8a5a12;background:linear-gradient(180deg,#ffe7a0,#e0a840)}
.ex-vote{font-family:'Special Elite',monospace;font-size:11.5px;padding:0 7px;border-radius:999px}
.ex-vote.yes{color:#062a14;background:#9ff0bd;box-shadow:0 0 0 1px #1f7a46}.ex-vote.no{color:#fff;background:#b3352a;box-shadow:0 0 0 1px #5e0c08}
.ex-role{font-family:'Special Elite',monospace;font-size:11px;padding:0 6px;border-radius:4px}
.ex-role.expedition{color:#dff2ff;background:#1f4f86;box-shadow:0 0 0 1px #9dc8f2}.ex-role.mutiny{color:#ffe1db;background:#7a120c;box-shadow:0 0 0 1px #e46a5e}
button.ex-seat{cursor:pointer;transition:transform .15s}button.ex-seat:hover{transform:translateY(-3px)}

/* Carnet de bord et panneaux d'action */
.ex-notebook,.ex-dock{position:relative;color:#1c2633;border-radius:6px 12px 12px 6px;padding:18px 16px 16px 30px;
  background:linear-gradient(90deg,transparent 22px,rgba(200,60,60,.45) 22px 23.5px,transparent 23.5px),repeating-linear-gradient(180deg,transparent 0 25px,rgba(70,120,180,.22) 25px 26px),#f6f1e4;
  box-shadow:0 18px 34px rgba(0,20,40,.5),inset 0 0 30px rgba(120,100,60,.18)}
.ex-notebook::before,.ex-dock::before{content:'';position:absolute;left:6px;top:14px;bottom:14px;width:9px;background:radial-gradient(circle,#3a3a3a 0 3px,transparent 3.5px) 0 0/9px 26px repeat-y;opacity:.55}
.ex-dock{animation:ex-rise .35s ease-out}
@keyframes ex-rise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.ex-dock h4,.ex-notebook h4{font-family:'Special Elite',monospace;font-size:1.15rem;color:#14304f;text-align:center;line-height:1.25}
.ex-dock .muted,.ex-notebook .muted{color:#5a6472}
.ex-btn{font-family:'Special Elite',monospace;font-size:1rem;letter-spacing:.04em;border-radius:10px;padding:.7rem 1.3rem;color:#06182a;
  border:1px solid #2c5a86;background:linear-gradient(180deg,#ffffff,#cfe8ff 55%,#8fbde6);box-shadow:inset 0 1px 0 #fff,0 3px 0 #2c5a86,0 8px 16px rgba(0,20,40,.35);transition:transform .1s,filter .1s}
.ex-btn:hover{filter:brightness(1.05)}.ex-btn:active{transform:translateY(2px)}.ex-btn:disabled{opacity:.45;filter:grayscale(.5);cursor:not-allowed}
.ex-btn.warm{color:#2a1505;border-color:#8a5a12;background:linear-gradient(180deg,#fff0bf,#ffcf6a 55%,#d8902a);box-shadow:inset 0 1px 0 #fff,0 3px 0 #8a5a12,0 8px 16px rgba(0,0,0,.35)}
.ex-btn.danger{color:#fff;border-color:#5e0c08;background:linear-gradient(180deg,#e0574a,#9c1b14 55%,#5e0c08);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #3d0604,0 8px 16px rgba(0,0,0,.35)}
.ex-btn2{font-family:'Special Elite',monospace;font-size:.92rem;border-radius:10px;padding:.6rem 1.1rem;color:#14304f;border:1px solid #6f8fae;background:rgba(255,255,255,.6)}
.ex-pick{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px;border-radius:12px;transition:transform .15s}
.ex-pick:hover{transform:translateY(-2px)}
.ex-pick[aria-pressed=true],.ex-pick[aria-checked=true]{background:rgba(44,90,134,.14);box-shadow:0 0 0 2px #2c5a86}
.ex-card{position:relative;flex:1 1 0;max-width:160px;aspect-ratio:5/7;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
  box-shadow:0 10px 20px rgba(0,20,40,.35);transition:transform .2s cubic-bezier(.3,1.4,.5,1)}
.ex-card::before{content:'';position:absolute;inset:7px;border-radius:8px;border:1.5px solid rgba(255,255,255,.55);pointer-events:none}
.ex-card.ok{color:#06182a;background:radial-gradient(120% 90% at 50% 25%,#ffffff,#d5ecff 55%,#8fbde6)}
.ex-card.ko{color:#fff;background:radial-gradient(120% 90% at 50% 25%,#ff8a7a,#9c1b14 55%,#3e0604)}
button:hover > .ex-card,.ex-card:is(button):hover:not(:disabled){transform:translateY(-6px) rotate(-1.5deg)}
.ex-card .w{font-family:'Special Elite',monospace;font-size:1.25rem}
.ex-card:disabled{opacity:.3;filter:grayscale(.7)}
.ex-mini{display:inline-block;flex:none;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,.5)}

/* Annonces */
.ex-banner{position:relative;isolation:isolate;width:min(780px,100%);padding:20px 12px 18px;text-align:center;animation:ex-banner 2s cubic-bezier(.2,.8,.2,1) both}
.ex-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(3,12,24,.9) 22%,rgba(3,12,24,.9) 78%,transparent);
  border-top:1px solid rgba(180,220,255,.45);border-bottom:1px solid rgba(180,220,255,.45)}
.ex-banner .k{font-family:'Special Elite',monospace;font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:#9fd2ff}
.ex-banner .s{margin-top:6px;color:#e6f3ff;font-style:italic;font-size:1.15rem}
@keyframes ex-banner{0%{opacity:0;transform:scale(1.1)}12%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.ex-flip{animation:ex-flip .5s cubic-bezier(.3,1.3,.5,1) both}
@keyframes ex-flip{from{transform:perspective(500px) rotateY(90deg)}to{transform:none}}

/* Écrans communs */
.ex-ui-panel{position:relative;padding:28px 20px 22px 34px;border-radius:6px 14px 14px 6px;color:#1c2633;font-family:'Ex Digits','Cormorant Garamond',Georgia,serif;font-weight:500;
  background:linear-gradient(90deg,transparent 24px,rgba(200,60,60,.45) 24px 25.5px,transparent 25.5px),repeating-linear-gradient(180deg,transparent 0 27px,rgba(70,120,180,.22) 27px 28px),#f6f1e4;
  box-shadow:0 30px 70px rgba(0,10,25,.7)}
.ex-ui-kicker{font-family:'Special Elite',monospace;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#a33a2a}
.ex-ui-title{font-family:'Special Elite',monospace;font-size:1.85rem;line-height:1.15;color:#14304f}
.ex-ui-text{font-family:'Ex Digits','Cormorant Garamond',Georgia,serif;color:#33404f;font-size:1.12rem}
.ex-hud{border-radius:50%;color:#e6f5ff;border:2px solid rgba(200,230,255,.7);background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.25),transparent 60%),linear-gradient(180deg,#1b4566,#071a33);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 4px 12px rgba(0,10,25,.6)}
.ex-hud:hover{border-color:#fff;color:#fff}
.ex-ui-drawer{color:#eef6ff;font-family:'Ex Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:2px solid rgba(200,230,255,.5);
  background:linear-gradient(180deg,rgba(6,20,40,.93),rgba(2,8,18,.97));box-shadow:-20px 0 60px rgba(0,10,25,.65)}
.ex-ui-pill{font-family:'Special Elite',monospace;font-size:13px;color:#14304f;padding:6px 14px;border-radius:999px;background:#f6f1e4;border:1.5px solid #6f8fae;box-shadow:0 6px 16px rgba(0,10,25,.5)}
@media (prefers-reduced-motion:reduce){.ex *{animation:none!important;transition:none!important}.ex-banner{animation:ex-fade .2s both!important}}
@keyframes ex-fade{from{opacity:0}to{opacity:1}}
`;
