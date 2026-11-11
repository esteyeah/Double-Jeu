/** Décor de Butin : pont de navire à la lanterne, nuit en mer, toile, parchemin, laiton. */
export const PLUNDER_CSS = `
@font-face{font-family:'Bt Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.bt{--gold:#f0c35c;--ivory:#f4e6c4;--ink:#2a1b0b;--blood:#a3241a;position:relative;min-height:100dvh;color:var(--ivory);
  font-family:'Bt Digits','IM Fell English',Georgia,serif;background:#120b06;overflow:hidden;overflow:clip;isolation:isolate}
.bt-deck{position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,#24150a,#140b05)}
.bt-deck::before{content:'';position:absolute;inset:0;background:url(/themes/plunder/deck.jpg) center top/440px repeat;opacity:.62;filter:saturate(.85) contrast(1.08)}
.bt-deck::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0 2px,transparent 2px 110px),linear-gradient(180deg,rgba(0,0,0,.35),transparent 30%,transparent 70%,rgba(0,0,0,.5))}
.bt-lantern{position:absolute;top:58px;z-index:2;pointer-events:none;transform-origin:50% 0;animation:bt-swing 4.5s ease-in-out infinite}
.bt-lantern.left{left:calc(50% - 330px)}.bt-lantern.right{right:calc(50% - 330px);animation-delay:-2.2s}
.bt-lantern::after{content:'';position:absolute;left:50%;top:78px;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,200,110,.38),rgba(255,160,60,.12) 40%,transparent 70%);animation:bt-flicker 3s ease-in-out infinite;z-index:-1}
.bt-lantern svg{filter:drop-shadow(0 0 10px rgba(255,190,90,.8)) drop-shadow(0 8px 8px rgba(0,0,0,.6))}
.bt-wick{transform-box:fill-box;transform-origin:50% 100%;animation:bt-wick .8s ease-in-out infinite alternate}
@keyframes bt-wick{to{transform:scale(.88,1.12)}}
@keyframes bt-swing{0%,100%{transform:rotate(3deg)}50%{transform:rotate(-3deg)}}
.bt-light{position:absolute;inset:0;z-index:-1;pointer-events:none;animation:bt-flicker 6s ease-in-out infinite;
  background:radial-gradient(55% 40% at 50% 34%,rgba(255,176,86,.32),transparent 70%),
    radial-gradient(38% 30% at 8% 82%,rgba(255,140,60,.16),transparent 70%),
    radial-gradient(38% 30% at 94% 70%,rgba(255,140,60,.12),transparent 70%),
    radial-gradient(130% 95% at 50% 40%,transparent 42%,rgba(0,0,0,.82) 100%)}
@keyframes bt-flicker{0%,100%{opacity:1}46%{opacity:.88}50%{opacity:.97}72%{opacity:.86}}
.bt-title{font-family:'Pirata One','IM Fell English',Georgia,serif;font-weight:400;letter-spacing:.02em;line-height:1}
.bt-gold{background:linear-gradient(180deg,#fff6cf 0%,#f3cd6b 38%,#b47c1d 66%,#f7d98a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 rgba(30,14,3,.95)) drop-shadow(0 6px 10px rgba(0,0,0,.55))}
.bt-num{font-family:'Times New Roman','Liberation Serif','Nimbus Roman',serif;font-weight:700;font-variant-numeric:lining-nums tabular-nums;letter-spacing:.01em}

/* Bastingage : ciel de nuit, lune, mer, rambarde */
.bt-sky{position:relative;height:172px;overflow:hidden;
  background:radial-gradient(16px 16px at 84% 30%,#fffbe8 0 55%,rgba(255,250,220,.5) 70%,transparent 75%),
    radial-gradient(170px 120px at 84% 30%,rgba(255,240,200,.2),transparent 70%),
    linear-gradient(180deg,#040a16 0%,#0c1d35 50%,#183552 74%,#0a1d2e 100%)}
.bt-stars{position:absolute;inset:0 0 40% 0;opacity:.85;animation:bt-twinkle 7s ease-in-out infinite;
  background-image:radial-gradient(1.2px 1.2px at 8% 22%,#fff 60%,transparent),radial-gradient(1px 1px at 18% 58%,#fff 60%,transparent),
    radial-gradient(1.4px 1.4px at 29% 14%,#fff 60%,transparent),radial-gradient(1px 1px at 41% 40%,#dfe9ff 60%,transparent),
    radial-gradient(1.2px 1.2px at 55% 18%,#fff 60%,transparent),radial-gradient(1px 1px at 64% 52%,#fff 60%,transparent),
    radial-gradient(1.3px 1.3px at 72% 9%,#fff 60%,transparent),radial-gradient(1px 1px at 93% 55%,#fff 60%,transparent),
    radial-gradient(1px 1px at 3% 48%,#fff 60%,transparent),radial-gradient(1.2px 1.2px at 48% 6%,#fff 60%,transparent)}
@keyframes bt-twinkle{0%,100%{opacity:.85}50%{opacity:.55}}
.bt-sea{position:absolute;left:0;right:0;bottom:58px;height:52px}
.bt-sea svg{position:absolute;bottom:0;left:0;width:200%;height:100%}
.bt-wave1{animation:bt-waves 16s linear infinite}.bt-wave2{animation:bt-waves 10s linear infinite reverse}
@keyframes bt-waves{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.bt-moonpath{position:absolute;bottom:58px;left:72%;width:26%;height:46px;background:repeating-linear-gradient(180deg,rgba(255,240,200,.35) 0 2px,transparent 2px 7px);
  -webkit-mask:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent);mask:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent);animation:bt-shimmer 3s ease-in-out infinite}
@keyframes bt-shimmer{0%,100%{opacity:.6}50%{opacity:1}}
.bt-farship{position:absolute;left:14%;bottom:96px;width:58px;height:38px;opacity:.85;animation:bt-drift 60s linear infinite alternate}
@keyframes bt-drift{from{transform:translateX(0)}to{transform:translateX(70px)}}
.bt-gull{position:absolute;top:30px;left:30%;width:16px;height:6px;border-top:2px solid rgba(220,230,245,.7);border-radius:50% 50% 0 0;animation:bt-gull 22s linear infinite}
.bt-gull::after{content:'';position:absolute;left:14px;top:-2px;width:14px;height:6px;border-top:2px solid rgba(220,230,245,.7);border-radius:50% 50% 0 0}
.bt-gull.b{top:46px;left:60%;transform:scale(.7);animation-duration:30s;animation-delay:-12s}
@keyframes bt-gull{0%{translate:-30vw 0}50%{translate:10vw -10px}100%{translate:50vw 4px}}
.bt-posts{position:absolute;left:0;right:0;bottom:22px;height:40px;background:repeating-linear-gradient(90deg,transparent 0 46px,#2b170a 46px 58px,#4a2c14 58px 60px,transparent 60px 104px)}
.bt-rail{position:absolute;left:0;right:0;bottom:0;height:30px;background:linear-gradient(180deg,rgba(255,215,160,.18),rgba(0,0,0,.35)),url(/themes/plunder/plank.jpg) 0 0/260px;
  border-top:3px solid #1f1006;box-shadow:inset 0 2px 0 rgba(255,220,160,.22),0 12px 20px rgba(0,0,0,.65)}
.bt-railtop{position:absolute;left:0;right:0;bottom:60px;height:7px;background:linear-gradient(180deg,#5c3a1c,#2b170a);box-shadow:0 2px 3px rgba(0,0,0,.6)}

/* Plaque de titre */
.bt-plate{display:inline-flex;flex-direction:column;align-items:center;gap:4px;padding:10px 22px 9px;border-radius:12px;
  background:linear-gradient(180deg,rgba(255,220,170,.10),rgba(0,0,0,.35)),url(/themes/plunder/plank.jpg) center/240px;
  border:1px solid #160b03;box-shadow:inset 0 1px 0 rgba(255,220,170,.25),inset 0 0 0 2px rgba(0,0,0,.4),0 10px 24px rgba(0,0,0,.7)}
.bt-nails{position:relative}
.bt-nails::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(circle at 9px 9px,#f6dc95 0 2px,#5e3f12 2.6px,transparent 3.6px),radial-gradient(circle at calc(100% - 9px) 9px,#f6dc95 0 2px,#5e3f12 2.6px,transparent 3.6px),
  radial-gradient(circle at 9px calc(100% - 9px),#f6dc95 0 2px,#5e3f12 2.6px,transparent 3.6px),radial-gradient(circle at calc(100% - 9px) calc(100% - 9px),#f6dc95 0 2px,#5e3f12 2.6px,transparent 3.6px)}

/* Pièces d'or */
.bt-coin{position:relative;display:grid;place-items:center;border-radius:50%;color:#5a3a06;font-family:'Pirata One',Georgia,serif;
  background:radial-gradient(circle at 34% 28%,#fff7cf 0%,#f5d371 22%,#d6a032 52%,#8c5c10 82%,#c99130 100%);
  box-shadow:inset 0 0 0 2px #7a520b,inset 0 0 0 5px rgba(255,236,170,.55),inset 0 -3px 6px rgba(80,45,0,.6),0 4px 8px rgba(0,0,0,.55);
  text-shadow:0 1px 0 rgba(255,245,200,.85),0 -1px 0 rgba(90,55,5,.6)}
.bt-coin::after{content:'';position:absolute;inset:18%;border-radius:50%;border:1.5px dashed rgba(122,82,11,.65)}

/* Toile du butin, bordée de corde */
.bt-cloth{position:relative;margin:8px 7px 0;border-radius:10px;padding:16px 10px 12px;
  background:radial-gradient(120% 90% at 50% 40%,rgba(255,230,180,.12),rgba(40,20,5,.35)),url(/themes/plunder/canvas.jpg) center/300px;
  box-shadow:0 22px 34px rgba(0,0,0,.65),inset 0 0 46px rgba(60,30,5,.6);transform:rotate(-.5deg)}
.bt-cloth::before{content:'';position:absolute;inset:7px;border:1.5px dashed rgba(70,40,12,.55);border-radius:6px;pointer-events:none}
.bt-cloth::after{content:'';position:absolute;inset:-7px;border-radius:15px;padding:7px;pointer-events:none;
  background:repeating-linear-gradient(55deg,#d8b67a 0 4px,#8a6532 4px 8px,#efd29a 8px 10px,#6e4c22 10px 12px);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  filter:drop-shadow(0 2px 2px rgba(0,0,0,.6))}
.bt-label{display:inline-block;padding:2px 8px 1px;border-radius:3px;font-size:12px;color:var(--ink);white-space:nowrap;
  background:url(/themes/plunder/paper.jpg) center/180px;box-shadow:0 1px 2px rgba(0,0,0,.55);transform:rotate(-2deg)}
.bt-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 0 2px;border-radius:12px;transition:transform .18s}
.bt-item .bt-obj{filter:drop-shadow(0 6px 4px rgba(0,0,0,.55));animation:bt-bob 4s ease-in-out infinite}
@keyframes bt-bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-2px) rotate(.6deg)}}
.bt-take{cursor:pointer}
.bt-take .bt-obj{filter:drop-shadow(0 0 10px rgba(255,214,120,.95)) drop-shadow(0 6px 4px rgba(0,0,0,.5));animation:bt-pulse 1.4s ease-in-out infinite}
.bt-take:hover{transform:translateY(-4px) scale(1.06)}
.bt-take:focus-visible{outline:2px solid #fff;outline-offset:2px}
@keyframes bt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}

/* Plaques de l'équipage */
.bt-plaque{position:relative;border-radius:12px;padding:10px 10px 10px 76px;min-height:96px;
  background:linear-gradient(180deg,rgba(255,220,170,.08),rgba(0,0,0,.32)),url(/themes/plunder/plank.jpg) center/280px;
  border:1px solid #140a03;box-shadow:inset 0 1px 0 rgba(255,220,170,.18),inset 0 0 0 2px rgba(0,0,0,.35),0 12px 20px rgba(0,0,0,.55);transition:box-shadow .3s}
.bt-plaque.is-threat{box-shadow:inset 0 0 0 2px #c0392b,0 0 22px rgba(192,57,43,.55),0 12px 20px rgba(0,0,0,.55)}
.bt-plaque.is-turn{box-shadow:inset 0 0 0 2px #f0c35c,0 0 22px rgba(240,195,92,.5),0 12px 20px rgba(0,0,0,.55)}
.bt-plaque.is-sunk{filter:grayscale(.85) brightness(.7)}
.bt-medal{position:relative;display:grid;place-items:center;border-radius:50%;flex-shrink:0;
  box-shadow:0 0 0 3px #c89a3a,0 0 0 5px #3a2410,0 5px 12px rgba(0,0,0,.65),inset 0 3px 8px rgba(255,255,255,.28),inset 0 -6px 10px rgba(0,0,0,.5)}
.bt-medal-abs{position:absolute;left:12px;top:14px}
.bt-token{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;
  box-shadow:0 0 0 1.5px #3a2410,0 3px 6px rgba(0,0,0,.6),inset 0 2px 4px rgba(255,255,255,.3),inset 0 -3px 5px rgba(0,0,0,.45)}
.bt-chip{display:inline-flex;align-items:center;gap:3px;font-size:12px;color:#f1dfb8}
.bt-socket{display:inline-block;width:11px;height:11px;border-radius:50%;background:#1a0f07;box-shadow:inset 0 2px 3px rgba(0,0,0,.9),0 1px 0 rgba(255,220,170,.15)}

/* Parchemin des ordres */
.bt-dock{position:relative;margin-top:22px;padding:18px 16px 18px;color:var(--ink);border-radius:6px;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.35)),url(/themes/plunder/paper.jpg) center/320px;
  box-shadow:0 18px 34px rgba(0,0,0,.6),inset 0 0 46px rgba(120,75,25,.5);animation:bt-rise .35s ease-out}
.bt-dock::before,.bt-dock::after{content:'';position:absolute;left:-8px;right:-8px;height:16px;border-radius:8px;
  background:linear-gradient(180deg,#e9d3a2,#b8915a 45%,#6e4c22 100%),url(/themes/plunder/paper.jpg);box-shadow:0 3px 6px rgba(0,0,0,.45)}
.bt-dock::before{top:-8px}.bt-dock::after{bottom:-8px}
@keyframes bt-rise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.bt-dock .bt-muted{color:#6d5128}
.bt-dock h4{color:#7a1d14}

/* Cartes à jouer */
.bt-card{position:relative;flex:1 1 0;max-width:158px;aspect-ratio:5/7;border-radius:12px;color:var(--ink);text-align:center;
  background:radial-gradient(120% 90% at 50% 30%,#fff9e8,rgba(255,250,235,0) 70%),url(/themes/plunder/paper.jpg) center/260px;
  box-shadow:inset 0 1px 0 #fff,0 0 0 1px #8b6a33,0 10px 20px rgba(0,0,0,.4);transition:transform .25s cubic-bezier(.3,1.4,.5,1),box-shadow .25s}
.bt-card::before{content:'';position:absolute;inset:7px;border:1.5px solid #8b6a33;border-radius:8px;box-shadow:inset 0 0 0 3px rgba(139,106,51,.2);pointer-events:none}
.bt-card:hover:not(:disabled){transform:translateY(-5px)}
.bt-card[aria-pressed=true]{transform:translateY(-12px) rotate(-2deg);box-shadow:0 0 0 3px #a3241a,0 22px 34px rgba(0,0,0,.45)}
.bt-card:disabled{opacity:.45;filter:grayscale(.6)}
.bt-card .bt-corner{position:absolute;font-family:'Pirata One',Georgia,serif;font-size:15px;color:#7a1d14;line-height:1}
.bt-pick{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px;border-radius:12px;transition:transform .15s,background .15s}
.bt-pick:hover{transform:translateY(-2px)}
.bt-pick[aria-checked=true],.bt-pick[aria-pressed=true]{background:rgba(163,36,26,.14)}
.bt-btn{font-family:'Pirata One',Georgia,serif;font-size:1.3rem;letter-spacing:.03em;border-radius:12px;padding:.55rem 1.4rem;color:#2a1505;
  border:1px solid #5e3f12;background:linear-gradient(180deg,#f9e19a,#d9a440 52%,#a8741f);text-shadow:0 1px 0 rgba(255,240,200,.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.65),0 3px 0 #5e3f12,0 8px 16px rgba(0,0,0,.35);transition:transform .1s,filter .1s}
.bt-btn:hover{filter:brightness(1.07)}.bt-btn:active{transform:translateY(2px)}
.bt-btn:disabled{opacity:.45;filter:grayscale(.5);cursor:not-allowed}
.bt-btn2{font-family:'Bt Digits','IM Fell English',Georgia,serif;border-radius:12px;padding:.5rem 1.1rem;color:#3a2410;border:1px solid #8b6a33;background:rgba(255,250,235,.5)}
.bt-btn2:hover{background:rgba(255,250,235,.85)}

/* Fusillade */
.bt-fight{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:radial-gradient(70% 60% at 50% 50%,rgba(20,10,4,.72),rgba(0,0,0,.9));cursor:pointer;animation:bt-fade .25s ease-out}
@keyframes bt-fade{from{opacity:0}to{opacity:1}}
.bt-recoil{animation:bt-recoil .45s cubic-bezier(.2,1.6,.4,1)}
@keyframes bt-recoil{0%{transform:translateX(0) rotate(0)}18%{transform:translateX(-14px) rotate(-14deg)}100%{transform:translateX(0) rotate(0)}}
.bt-flash{position:absolute;right:-18px;top:-10px;width:70px;height:70px;border-radius:50%;
  background:radial-gradient(circle,#fffbe0 0 12%,#ffd54a 28%,rgba(255,120,30,.75) 48%,transparent 70%);animation:bt-flash .5s ease-out forwards}
@keyframes bt-flash{0%{transform:scale(.2);opacity:1}60%{opacity:1}100%{transform:scale(1.5);opacity:0}}
.bt-smoke{position:absolute;right:-26px;top:-16px;width:80px;height:60px;border-radius:50%;filter:blur(6px);
  background:radial-gradient(circle at 40% 50%,rgba(220,220,220,.8),rgba(160,160,160,.35) 50%,transparent 70%);animation:bt-smoke 1.1s ease-out forwards}
@keyframes bt-smoke{from{transform:scale(.4);opacity:.95}to{transform:scale(1.6) translate(14px,-12px);opacity:0}}
.bt-bang{animation:bt-bang .55s cubic-bezier(.2,1.5,.4,1) both}
@keyframes bt-bang{0%{transform:scale(.2) rotate(-10deg);opacity:0}100%{transform:scale(1) rotate(-3deg);opacity:1}}
.bt-shake{animation:bt-shake .5s ease-in-out}
@keyframes bt-shake{0%,100%{transform:translate(0)}20%{transform:translate(-6px,2px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,1px)}80%{transform:translate(3px,0)}}
/* Étapes de la manche */
.bt-steps{display:flex;justify-content:center;flex-wrap:wrap;gap:5px;margin:12px 0 0;padding:0;list-style:none}
.bt-steps li{display:flex;align-items:center;gap:6px;padding:4px 11px 4px 4px;border-radius:999px;font-size:14px;color:#b39869;
  background:rgba(12,6,2,.6);border:1px solid rgba(240,195,92,.18);white-space:nowrap}
.bt-steps .n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#2a1708;color:#a98d63}
.bt-steps li.done{opacity:.6}.bt-steps li.done .n{background:#3d2a12;color:#d7b56a}
.bt-steps li.now{color:#2a1505;background:linear-gradient(180deg,#f9e19a,#d9a440);border-color:#5e3f12;font-weight:700;box-shadow:0 0 18px rgba(240,195,92,.5)}
.bt-steps li.now .n{background:#7a1d14;color:#ffe9b0}
@media (max-width:639px){.bt-steps li:not(.now){padding:4px}.bt-steps li:not(.now) .t{display:none}}

/* Consigne : ce qu'il faut faire maintenant */
.bt-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:14px;color:#f4e6c4;font-size:1.08rem;line-height:1.3;
  background:linear-gradient(180deg,rgba(255,215,160,.14),rgba(0,0,0,.4)),url(/themes/plunder/plank.jpg) 0 0/260px;border:1px solid #1f1006;
  box-shadow:inset 0 1px 0 rgba(255,220,160,.25),0 8px 18px rgba(0,0,0,.5)}
.bt-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#7a1d14;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35),0 2px 4px rgba(0,0,0,.45)}
.bt-call strong{color:#ffe3a0;font-weight:400}
.bt-call.is-mine{color:#ffe7a6;border-color:#d9a440;animation:bt-callpulse 2.2s ease-in-out infinite}
@keyframes bt-callpulse{0%,100%{box-shadow:0 0 0 2px #c98f2c,0 0 18px rgba(240,195,92,.35),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 2px #f0c35c,0 0 34px rgba(240,195,92,.7),0 8px 18px rgba(0,0,0,.5)}}
.bt-cloth.is-mine,section.is-mine{animation:bt-callpulse 2.2s ease-in-out infinite;border-radius:12px}

/* Le pont : l'équipage autour du trésor */
.bt-table{position:relative;margin-top:4px}
.bt-table-under{position:absolute;inset:8% 6%;border-radius:50%;
  background:radial-gradient(60% 55% at 50% 45%,rgba(255,200,120,.30),transparent 72%),repeating-linear-gradient(90deg,rgba(0,0,0,.32) 0 2px,transparent 2px 54px),
    linear-gradient(180deg,rgba(255,215,160,.08),rgba(0,0,0,.35)),url(/themes/plunder/plank.jpg) center/300px;
  box-shadow:0 0 0 5px #3a2410,0 0 0 9px #c8953a,0 0 0 10px #f5d98d,0 0 0 13px #5e3f12,0 0 0 15px #1a0d04,0 30px 60px rgba(0,0,0,.75),inset 0 0 80px rgba(20,8,0,.88)}
.bt-table-under::before{content:'';position:absolute;inset:-12px;border-radius:50%;pointer-events:none;
  background:repeating-conic-gradient(from 0deg,#fff1bf 0 .9deg,transparent .9deg 15deg);
  -webkit-mask:radial-gradient(closest-side,transparent calc(100% - 6px),#000 calc(100% - 5px),#000 calc(100% - 2px),transparent calc(100% - 1px));
  mask:radial-gradient(closest-side,transparent calc(100% - 6px),#000 calc(100% - 5px),#000 calc(100% - 2px),transparent calc(100% - 1px))}
.bt-table-under::after{content:'';position:absolute;inset:15% 13%;border-radius:46% 54% 50% 50% / 52% 46% 54% 48%;pointer-events:none;transform:rotate(-2deg);
  background:radial-gradient(70% 60% at 45% 40%,rgba(255,240,205,.32),transparent 70%),linear-gradient(160deg,rgba(255,255,255,.08),transparent 40%,rgba(0,0,0,.18) 70%,transparent),url(/themes/plunder/canvas.jpg) center/280px;
  box-shadow:0 14px 24px rgba(0,0,0,.55),inset 0 0 36px rgba(80,45,10,.55),inset 0 0 0 2px rgba(255,235,190,.18)}
.bt-loot-mine .bt-label{box-shadow:0 0 0 1.5px #f0c35c,0 0 10px rgba(240,195,92,.7)}
.bt-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;border-radius:14px;text-align:center;transition:transform .2s}
.bt-seat .bt-medal{transition:outline-color .2s}
.bt-seat-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:8px;
  background:linear-gradient(180deg,rgba(45,25,9,.92),rgba(16,8,3,.94));border:1px solid rgba(240,195,92,.28);box-shadow:0 3px 8px rgba(0,0,0,.5)}
.bt-seat-name{font-family:'Pirata One',Georgia,serif;font-size:17px;line-height:1.05;color:#f6e3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-seat-tag{font-size:10px;color:#9fd3df;flex:none}
.bt-seat-score{position:absolute;right:-9px;bottom:-5px;min-width:27px;height:27px;padding:0 5px;border-radius:14px;display:grid;place-items:center;
  font-family:'Bt Digits',Georgia,serif;font-weight:700;font-size:13px;color:#4a2c05;background:radial-gradient(circle at 35% 30%,#fff6cf,#f3cd6b 45%,#b47c1d);
  box-shadow:0 2px 5px rgba(0,0,0,.65),inset 0 -2px 0 rgba(0,0,0,.2)}
.bt-seat-status{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:11.5px;line-height:1.35;padding:0 8px;
  border-radius:999px;border:1px solid;background:rgba(14,7,2,.92);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.tone-green{color:#c7ebb0;border-color:rgba(127,179,106,.7)}.tone-dim{color:#cdb48a;border-color:rgba(168,138,92,.45)}
.tone-blue{color:#b5e3f3;border-color:rgba(90,162,192,.7)}.tone-red{color:#fff;border-color:#ff8a7a;background:#8e1b14}
.tone-gold{color:#2a1505;border-color:#5e3f12;background:linear-gradient(180deg,#f9e19a,#d9a440)}
.bt-seat.is-me .bt-seat-plate{border-color:rgba(159,211,223,.7)}
.bt-seat.is-turn .bt-medal{outline:3px solid #f0c35c;outline-offset:2px;filter:drop-shadow(0 0 12px rgba(240,195,92,.85))}
.bt-seat.is-threat .bt-medal{outline:3px solid #ff4d3d;outline-offset:2px;animation:bt-threat 1.1s ease-in-out infinite}
@keyframes bt-threat{50%{filter:drop-shadow(0 0 14px rgba(255,77,61,.95))}}
.bt-seat.is-aimed .bt-medal{outline:3px solid #ff4d3d;outline-offset:2px}
.bt-seat.is-sunk{opacity:.55}
button.bt-seat{cursor:crosshair}
button.bt-seat:hover{transform:translateY(-3px)}
button.bt-seat:hover .bt-medal{outline:2px dashed #ff8a7a;outline-offset:3px}

/* Annonce d'étape */
.bt-banner{position:relative;isolation:isolate;width:min(760px,100%);padding:22px 12px 20px;text-align:center;animation:bt-banner 1.7s cubic-bezier(.2,.8,.2,1) both}
.bt-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(12,6,2,.9) 22%,rgba(12,6,2,.9) 78%,transparent);
  border-top:1px solid rgba(240,195,92,.4);border-bottom:1px solid rgba(240,195,92,.4)}
.bt-banner .k{font-size:13px;letter-spacing:.4em;text-transform:uppercase;color:#d9bd8a}
.bt-banner .s{margin-top:8px;color:#f1dfb8;font-style:italic;font-size:1.05rem}
@keyframes bt-banner{0%{opacity:0;transform:scale(1.12)}14%{opacity:1;transform:none}78%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}

/* Écrans communs (passage du téléphone, fin de partie, menus) */
.bt-ui-panel{position:relative;padding:30px 22px 26px;border-radius:6px;color:#2a1b0b;font-family:'Bt Digits','IM Fell English',Georgia,serif;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.4)),url(/themes/plunder/paper.jpg) center/320px;
  box-shadow:0 30px 70px rgba(0,0,0,.75),inset 0 0 50px rgba(120,75,25,.55)}
.bt-ui-panel::before,.bt-ui-panel::after{content:'';position:absolute;left:-10px;right:-10px;height:18px;border-radius:9px;
  background:linear-gradient(180deg,#e9d3a2,#b8915a 45%,#6e4c22 100%),url(/themes/plunder/paper.jpg);box-shadow:0 3px 6px rgba(0,0,0,.5)}
.bt-ui-panel::before{top:-9px}.bt-ui-panel::after{bottom:-9px}
.bt-ui-kicker{font-family:'Bt Digits','IM Fell English',Georgia,serif;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#7a1d14}
.bt-ui-title{font-family:'Pirata One','IM Fell English',Georgia,serif;font-size:2.4rem;line-height:1.05;color:#5a1610;text-shadow:0 1px 0 rgba(255,240,200,.7)}
.bt-ui-text{font-family:'Bt Digits','IM Fell English',Georgia,serif;color:#4a3418;font-size:1.02rem}
.bt-hud{border-radius:50%;color:#f3cd6b;border:2px solid #b8862f;
  background:radial-gradient(circle at 50% 35%,rgba(255,210,140,.18),transparent 60%),linear-gradient(180deg,rgba(40,22,8,.55),rgba(10,5,2,.8)),url(/themes/plunder/plank.jpg) center/120px;
  box-shadow:inset 0 1px 0 rgba(255,230,170,.35),inset 0 0 0 2px #2a1505,0 4px 12px rgba(0,0,0,.6)}
.bt-hud:hover{color:#ffe3a0;border-color:#e9b955}
.bt-ui-drawer{color:#f4e6c4;font-family:'Bt Digits','IM Fell English',Georgia,serif;border-left:3px solid #5c3a1c;
  background:linear-gradient(180deg,rgba(24,13,5,.9),rgba(12,6,2,.95)),url(/themes/plunder/plank.jpg) 0 0/300px;box-shadow:-20px 0 60px rgba(0,0,0,.65)}
.bt-ui-pill{font-family:'Bt Digits','IM Fell English',Georgia,serif;font-size:13px;color:#2a1b0b;padding:7px 14px;border-radius:999px;
  background:url(/themes/plunder/paper.jpg) center/200px;border:1px solid #8b6a33;box-shadow:0 6px 16px rgba(0,0,0,.5)}
@media (min-width:640px){.bt-sky{height:150px}}

/* ───── Interface moderne : verre fumé, cartes épurées, typo actuelle ───── */
.bt{font-family:'Outfit',system-ui,sans-serif;font-weight:500}
.bt-title{font-family:'Lilita One','Outfit',sans-serif;letter-spacing:.01em}
.bt-num{font-family:'Outfit',sans-serif;font-weight:800}
.bt-deck::before{opacity:.3}
.bt-plate{background:linear-gradient(180deg,rgba(44,26,12,.74),rgba(14,8,4,.84));backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid rgba(255,214,140,.26);border-radius:22px;box-shadow:0 18px 40px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,230,180,.18)}
.bt-nails::after{display:none}
.bt-steps li{background:rgba(22,13,6,.58);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-color:rgba(255,214,140,.16);color:#dcc7a3;font-weight:600}
.bt-steps li.now{background:linear-gradient(180deg,#ffd970,#f0a92c);color:#2a1505;border-color:transparent;box-shadow:0 8px 22px rgba(240,170,40,.45)}
.bt-call{background:linear-gradient(180deg,rgba(44,26,12,.72),rgba(14,8,4,.82));backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid rgba(255,214,140,.22);border-radius:20px;box-shadow:0 14px 34px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,230,180,.14)}
.bt-call .ic{background:linear-gradient(180deg,#ef5350,#a01c1c);box-shadow:0 6px 14px rgba(229,72,77,.45)}
.bt-call strong{font-weight:700}
.bt-dock{background:linear-gradient(180deg,#fffdf8,#f2e9da);border-radius:22px;box-shadow:0 26px 60px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.75),0 0 0 1px rgba(90,60,20,.22);padding:22px 18px 20px;margin-top:0}
.bt-dock::before,.bt-dock::after{display:none}
.bt-dock h4{font-family:'Lilita One',sans-serif;color:#c0262b;letter-spacing:.01em}
.bt-card{background:linear-gradient(180deg,#ffffff,#f4ead8);border-radius:18px;box-shadow:0 12px 26px rgba(60,30,5,.28),inset 0 0 0 1px rgba(180,140,80,.35)}
.bt-card::before{inset:6px;border:1px solid rgba(180,140,80,.28);border-radius:13px;box-shadow:none}
.bt-card[aria-pressed=true]{box-shadow:0 0 0 3px #ef5350,0 18px 34px rgba(229,72,77,.35)}
.bt-card .bt-corner{font-family:'Lilita One',sans-serif;color:#c0262b}
.bt-btn{font-family:'Lilita One',sans-serif;font-size:1.25rem;border-radius:999px;padding:.62rem 1.7rem;border:0;color:#2a1505;background:linear-gradient(180deg,#ffd970,#f0a92c 60%,#d9881a);text-shadow:none;
  box-shadow:inset 0 2px 0 rgba(255,255,255,.55),0 4px 0 #a5620f,0 12px 24px rgba(240,160,40,.35)}
.bt-btn2{border-radius:999px;font-family:'Outfit',sans-serif;font-weight:700;border-color:rgba(110,70,20,.3);background:rgba(255,255,255,.75)}
.bt-label{font-family:'Outfit',sans-serif;font-weight:700;font-size:11px;letter-spacing:.02em;padding:2px 10px;border-radius:999px;background:rgba(255,252,244,.95);transform:none;box-shadow:0 4px 10px rgba(0,0,0,.35)}
.bt-cloth{background:linear-gradient(180deg,rgba(255,250,238,.97),rgba(240,228,204,.97));border-radius:22px;transform:none;box-shadow:0 22px 44px rgba(0,0,0,.5)}
.bt-cloth::before,.bt-cloth::after{display:none}
.bt-seat-plate{border-radius:999px;background:rgba(18,10,4,.8);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-color:rgba(255,214,140,.3);padding:2px 10px 2px}
.bt-seat-name{font-family:'Lilita One',sans-serif;font-size:15px;letter-spacing:.01em}
.bt-seat-status,.bt-chip{font-family:'Outfit',sans-serif;font-weight:600}
.bt-plaque{background:linear-gradient(180deg,rgba(44,26,12,.7),rgba(14,8,4,.82));backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid rgba(255,214,140,.2);border-radius:20px}
.bt-ui-panel{background:linear-gradient(180deg,#fffdf8,#f2e9da);border-radius:22px;box-shadow:0 26px 60px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.75),0 0 0 1px rgba(90,60,20,.22);font-family:'Outfit',sans-serif}
.bt-ui-panel::before,.bt-ui-panel::after{display:none}
.bt-ui-title{font-family:'Lilita One',sans-serif;letter-spacing:.01em}
.bt-ui-kicker,.bt-ui-text{font-family:'Outfit',sans-serif}
.bt-ui-kicker{font-weight:700}
.bt-ui-drawer{font-family:'Outfit',sans-serif}
.bt-ui-pill{font-family:'Outfit',sans-serif;font-weight:700}

/* ───── Pont en 3D à la première personne ───── */
.bt3{background:#0b0d12}
.bt3-stage{position:relative;height:max(560px,min(calc(100dvh - 8px),900px));overflow:hidden;overflow:clip;background:linear-gradient(180deg,#3a5c86,#e7a77a 55%,#1b4e63 56%,#0b2c3a)}
@media (max-width:1023px){.bt3-stage{height:auto;overflow:visible}.bt3-roll{position:relative!important;height:62dvh;min-height:380px;max-height:620px}}
.bt3-roll{position:absolute;inset:0;overflow:hidden;animation:bt3-roll 8s ease-in-out infinite;transform-origin:50% 75%}
@keyframes bt3-roll{0%,100%{transform:scale(1.035) rotate(-.45deg) translateY(0)}50%{transform:scale(1.035) rotate(.5deg) translateY(-5px)}}
.bt3-roll canvas{display:block}
.bt3-shade{position:absolute;inset:0;pointer-events:none;background:radial-gradient(130% 95% at 50% 45%,transparent 58%,rgba(5,3,1,.55) 100%),linear-gradient(180deg,rgba(0,0,0,.35),transparent 18%)}
@media (max-width:1023px){.bt3-shade{height:62dvh;min-height:380px;max-height:620px}}
.bt3-loading{position:absolute;inset:0;display:grid;place-items:center;font-family:'Lilita One',sans-serif;font-size:1.6rem;color:#ffe3a8;text-shadow:0 2px 0 rgba(0,0,0,.5);
  background:radial-gradient(60% 50% at 70% 45%,rgba(255,210,140,.55),transparent 70%),linear-gradient(180deg,#3a5c86,#e7a77a 55%,#1b4e63 56%,#0b2c3a)}
.bt3-top{position:absolute;left:16px;top:58px;width:250px;z-index:3;pointer-events:none}
@media (max-width:1023px){.bt3-top{width:auto;right:12px}}
.bt3-brand{display:flex;align-items:flex-start;flex-direction:column;gap:8px}
@media (max-width:1023px){.bt3-brand{flex-direction:row;align-items:center;flex-wrap:wrap}.bt3-logo,.bt3-cap{display:none!important}}
.bt3-chip{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:14px;padding:6px 13px;border-radius:999px;color:#fff;background:rgba(14,9,5,.58);border:1px solid rgba(255,214,140,.22);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15)}
.bt3-center{position:absolute;left:50%;top:16px;transform:translateX(-50%);width:min(760px,calc(100% - 580px));z-index:3;display:flex;flex-direction:column;align-items:center}
.bt3-center .bt-steps{margin:0}
.bt3-center .bt-call{width:100%;box-sizing:border-box}
.bt3-dock{position:absolute;left:20px;bottom:20px;width:min(410px,32%);max-height:calc(100% - 200px);overflow:auto;z-index:4;margin:0!important;
  background:rgba(255,252,245,.94)!important;backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15)}
.bt3-side{position:absolute;right:20px;bottom:20px;width:min(380px,28%);z-index:4;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.bt3-treasure{width:100%;box-sizing:border-box;padding:12px 10px 10px;border-radius:22px;background:rgba(16,10,5,.62);border:1px solid rgba(255,214,140,.25);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15);box-shadow:0 18px 40px rgba(0,0,0,.45)}
.bt3-treasure ul{max-width:none!important}
.bt3-treasure .bt-obj{height:42px!important}
.bt3-treasure .bt-obj > *{transform:scale(.78)}
.bt3-treasure .bt-label{font-size:10.5px;padding:1px 8px}
.bt3-dock{padding:16px 14px 14px!important}
.bt3-dock h4{font-size:1.25rem!important}
.bt3-treasure p{color:#f3e2c3!important}
.bt3-me{display:inline-flex;align-items:center;gap:10px;font-size:14px;padding:7px 8px 7px 14px;border-radius:999px;color:#fff;background:rgba(14,9,5,.66);border:1px solid rgba(255,214,140,.3);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15)}
.bt3-coin{display:inline-grid;place-items:center;min-width:26px;height:26px;padding:0 6px;border-radius:999px;font-weight:800;font-size:13px;color:#4a2c05;
  background:radial-gradient(circle at 35% 30%,#fff6cf,#f3cd6b 45%,#b47c1d);box-shadow:0 2px 5px rgba(0,0,0,.5)}
.bt3-me-mobile{position:absolute;right:10px;top:min(calc(62dvh - 52px),568px);z-index:3}
.bt3-below{position:relative;z-index:3;width:min(1240px,calc(100% - 20px));margin:12px auto 0}

.bt3-tag{position:absolute;left:0;top:0;z-index:2;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0;background:none;border:0;color:#fff;
  font-family:'Outfit',sans-serif;cursor:default;transition:transform .15s}
button.bt3-tag{cursor:pointer}
button.bt3-tag:hover .bt3-tag-name{filter:brightness(1.18)}
button.bt3-tag:focus-visible{outline:none}
button.bt3-tag:focus-visible .bt3-tag-name{box-shadow:0 0 0 3px #fff}
.bt3-tag-name{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-weight:800;font-size:15px;padding:4px 5px 4px 12px;border-radius:999px;
  background:rgba(14,9,5,.7);border:1.5px solid rgba(255,255,255,.3);box-shadow:0 6px 16px rgba(0,0,0,.4);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15)}
@media (max-width:640px){.bt3-tag-name{font-size:12.5px;padding:3px 4px 3px 9px}.bt3-tag .bt3-coin{min-width:22px;height:22px;font-size:12px}}
.bt3-tag-chip{font-weight:700;font-size:12px;line-height:1.35;padding:1px 9px;border-radius:999px;border:1px solid;background:rgba(14,9,5,.82);white-space:nowrap}
.bt3-tag-life{font-size:12px;letter-spacing:1px;color:#ff6b5e;text-shadow:0 1px 3px rgba(0,0,0,.8);font-weight:800}
.bt3-tag.is-aimed .bt3-tag-name,.bt3-tag.is-threat .bt3-tag-name{background:#d6332c;border-color:#fff}
.bt3-tag.is-turn .bt3-tag-name{border-color:#ffd36a;box-shadow:0 0 0 2px rgba(255,211,106,.45),0 0 22px rgba(255,211,106,.5)}
.bt3-tag.is-sunk{opacity:.6}
button.bt3-tag:not(.is-aimed) .bt3-tag-name{border-color:rgba(255,211,106,.7)}
.bt3-tag-aim{font-weight:700;font-size:12px;line-height:1.3;padding:1px 9px;border-radius:999px;color:#ffe3a8;background:rgba(14,9,5,.78);border:1px solid rgba(255,211,106,.45);white-space:nowrap}
.bt3-stage.is-threat .bt3-roll::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;box-shadow:inset 0 0 90px 10px rgba(214,40,30,.55);animation:bt3-threat 1.4s ease-in-out infinite}
@keyframes bt3-threat{50%{box-shadow:inset 0 0 130px 24px rgba(214,40,30,.75)}}
.bt3-lookhint{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:3;pointer-events:none;font-weight:700;font-size:13px;color:#fff;padding:6px 14px;border-radius:999px;
  background:rgba(14,9,5,.55);border:1px solid rgba(255,255,255,.22);animation:bt3-hint 9s ease forwards}
@keyframes bt3-hint{0%,75%{opacity:1}100%{opacity:0}}
@media (max-width:1023px){.bt3-lookhint{bottom:auto;top:min(calc(62dvh - 104px),516px)}}
.bt3-reticle{position:absolute;left:50%;top:calc(100% + 34px);width:96px;height:96px;margin-left:-48px;border-radius:50%;border:3px solid #ff4d3d;
  box-shadow:0 0 0 2px rgba(0,0,0,.25),0 0 24px rgba(255,77,61,.6);animation:bt3-pulse 1.4s ease-in-out infinite;pointer-events:none}
@keyframes bt3-pulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.1);opacity:1}}

/* La fusillade : la pluie, l'éclair et le récit, par-dessus le duel joué en 3D */
.bt-fight.is-3d{display:block;background:linear-gradient(180deg,rgba(10,16,20,.25),rgba(10,16,20,0) 30%,rgba(10,16,20,0) 70%,rgba(10,16,20,.55));animation:bt-fade .4s ease-out}
.bt3-rain{position:absolute;left:-10%;top:-10%;width:120%;height:120%;pointer-events:none;overflow:hidden}
.bt3-rain.far{transform:rotate(14deg)}.bt3-rain.near{transform:rotate(16deg);filter:blur(.6px)}
.bt3-rain i{position:absolute;top:0;width:1.2px;background:linear-gradient(180deg,rgba(210,228,240,0),rgba(210,228,240,.5));animation:bt3-rain linear infinite}
.bt3-rain.near i{width:2.6px;border-radius:2px;background:linear-gradient(180deg,rgba(230,240,250,0),rgba(230,240,250,.75))}
@keyframes bt3-rain{from{transform:translate3d(0,-180px,0)}to{transform:translate3d(0,125vh,0)}}
.bt3-lightning{position:absolute;inset:0;background:#e8f4ff;opacity:0;pointer-events:none;animation:bt3-lightning 4.6s linear infinite 1.2s}
@keyframes bt3-lightning{0%,62%{opacity:0}63%{opacity:.5}65%{opacity:0}67%{opacity:.32}70%,100%{opacity:0}}
.bt3-pan{position:absolute;left:50%;top:9%;transform:translateX(-50%);pointer-events:none;font-family:'Lilita One',sans-serif;line-height:1;white-space:nowrap;
  font-size:clamp(4.5rem,11vw,9.5rem);color:#ffe27a;text-shadow:0 8px 0 #7a2e00,0 0 50px rgba(255,190,80,.6);animation:bt3-pan 2.3s cubic-bezier(.2,1.4,.4,1) both}
.bt3-pan .wet{color:#d6e2ea;text-shadow:0 6px 0 #2a3a44,0 0 30px rgba(200,220,235,.4)}
.bt3-pan .miss{color:#ffd36a}
@keyframes bt3-pan{0%,31%{opacity:0;transform:translateX(-50%) scale(.3) rotate(-12deg)}37%{opacity:1;transform:translateX(-50%) scale(1.12) rotate(-4deg)}43%,86%{opacity:1;transform:translateX(-50%) scale(1) rotate(-4deg)}100%{opacity:0;transform:translateX(-50%) scale(1) rotate(-4deg)}}
.bt3-duel-bar{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px 16px;
  width:max-content;max-width:calc(100% - 24px);box-sizing:border-box;padding:12px 12px 12px 22px;border-radius:28px;color:#fff;font-family:'Outfit',sans-serif;
  background:rgba(8,14,18,.74);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(12px) saturate(1.15);-webkit-backdrop-filter:blur(12px) saturate(1.15);box-shadow:0 20px 50px rgba(0,0,0,.5);cursor:default}
.bt3-skip{font-family:'Lilita One',sans-serif;font-size:17px;border-radius:999px;background:#ffd36a;color:#2a1800;padding:8px 18px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.bt3-roll,.bt3-rain i,.bt3-lightning{animation:none!important}.bt3-rain{display:none}}
@media (prefers-reduced-motion:reduce){.bt *,.bt-fight *{animation:none!important;transition:none!important}.bt-banner{animation:bt-fade .2s both!important}}
`;
