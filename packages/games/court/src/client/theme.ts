/** Décor de La Cité : bal masqué dans un palais de la cité marchande — damas, marbre, dorures, chandelles. */
export const COURT_CSS = `
@font-face{font-family:'Ct Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.ct{position:relative;min-height:100dvh;color:#f3e6cc;font-family:'Ct Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;background:#1a0608;overflow:hidden;overflow:clip;isolation:isolate}
.ct-wall{position:absolute;inset:0;z-index:-3;background:url(/themes/court/damask.jpg) center top/300px}
.ct-light{position:absolute;inset:0;z-index:-2;pointer-events:none;animation:ct-flicker 6s ease-in-out infinite;
  background:radial-gradient(45% 30% at 50% 0%,rgba(255,214,140,.38),transparent 72%),radial-gradient(60% 50% at 50% 58%,rgba(255,190,110,.14),transparent 70%),
    radial-gradient(140% 100% at 50% 30%,transparent 40%,rgba(10,0,2,.88) 100%)}
@keyframes ct-flicker{0%,100%{opacity:1}45%{opacity:.9}52%{opacity:.98}}
.ct-title{font-family:'Cinzel','Cormorant Garamond',serif;font-weight:700;letter-spacing:.06em}
.ct-gold{background:linear-gradient(180deg,#fff6d6 0%,#f2d37a 40%,#b07a20 70%,#f8dd92 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 rgba(30,5,5,.95)) drop-shadow(0 6px 12px rgba(0,0,0,.6))}
.ct-num{font-family:'Ct Digits',serif;font-weight:700}
.ct-frame{position:relative;border:3px solid transparent;border-radius:14px;
  background:linear-gradient(180deg,rgba(40,8,12,.88),rgba(18,3,5,.94)) padding-box,linear-gradient(135deg,#fbe8a6,#b07a20 30%,#f6d98a 55%,#8a5a12 80%,#f2d37a) border-box;
  box-shadow:0 14px 30px rgba(0,0,0,.6),inset 0 0 30px rgba(0,0,0,.4)}

/* Cartes de personnage */
.ct-card{position:relative;flex:none;width:var(--w,118px);aspect-ratio:5/7;border-radius:11px;color:#2a1a0c;text-align:center;overflow:hidden;
  border:3px solid transparent;
  background:radial-gradient(120% 70% at 50% 25%,#fffaf0,rgba(255,248,232,.92) 60%,rgba(240,226,196,.95)) padding-box,url(/themes/court/marble.jpg) center/200px padding-box,
    linear-gradient(135deg,#fbe8a6,#b07a20 30%,#f6d98a 55%,#8a5a12 80%,#f2d37a) border-box;
  box-shadow:0 8px 18px rgba(0,0,0,.5);display:flex;flex-direction:column;align-items:center;padding:8% 6% 6%}
.ct-card::after{content:'';position:absolute;inset:4px;border:1px solid rgba(138,90,18,.55);border-radius:7px;pointer-events:none}
.ct-card .medal{display:grid;place-items:center;border-radius:50%;width:62%;aspect-ratio:1;box-shadow:inset 0 -4px 8px rgba(0,0,0,.4),inset 0 3px 6px rgba(255,255,255,.35),0 0 0 2px #e2b452,0 4px 8px rgba(0,0,0,.4)}
.ct-card .nm{margin-top:7%;font-family:'Cinzel',serif;font-weight:700;font-size:calc(var(--w,118px)*.115);line-height:1.05}
.ct-card .pw{margin-top:3%;font-style:italic;font-size:calc(var(--w,118px)*.095);line-height:1.15;color:#4a3418}
.ct-back{position:relative;flex:none;border-radius:4px;border:1.5px solid transparent;
  background:radial-gradient(circle at 50% 45%,rgba(240,195,92,.35),transparent 60%) padding-box,url(/themes/court/damask.jpg) center/80px padding-box,linear-gradient(135deg,#f6d98a,#8a5a12) border-box;
  box-shadow:0 2px 4px rgba(0,0,0,.6)}
.ct-mini{display:inline-grid;place-items:center;flex:none;border-radius:4px;box-shadow:0 0 0 1.5px #e2b452,0 2px 4px rgba(0,0,0,.6)}

/* Consigne et minuteur */
.ct-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:14px;color:#f6e9cf;font-size:1.13rem;line-height:1.3;
  border:2px solid transparent;background:linear-gradient(180deg,rgba(48,10,14,.92),rgba(20,3,6,.95)) padding-box,linear-gradient(135deg,#f6d98a,#8a5a12 50%,#f2d37a) border-box;box-shadow:0 8px 18px rgba(0,0,0,.55)}
.ct-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7a1d2a,#3a0710 70%);box-shadow:0 0 0 2px #e2b452}
.ct-call strong{color:#ffe3a0;font-weight:600}
.ct-call.is-mine{animation:ct-pulse 2.2s ease-in-out infinite}
@keyframes ct-pulse{0%,100%{box-shadow:0 0 0 1px #b07a20,0 0 18px rgba(242,211,122,.35),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 1px #f2d37a,0 0 34px rgba(242,211,122,.7),0 8px 18px rgba(0,0,0,.5)}}
.ct-timer{flex:none;font-family:'Cinzel',serif;font-weight:700;font-size:15px;min-width:46px;text-align:center;padding:3px 8px;border-radius:999px;background:#2a0508;box-shadow:0 0 0 1px #e2b452}
.ct-timer.low{color:#fff;background:#9c1b14;animation:ct-tick 1s steps(2) infinite}
@keyframes ct-tick{50%{opacity:.6}}

/* La salle de bal : la cour autour du parquet de marbre */
.ct-floor{position:absolute;inset:9% 7%;border-radius:50%;
  background:radial-gradient(60% 55% at 50% 45%,rgba(255,236,190,.45),transparent 72%),repeating-conic-gradient(from 22.5deg,rgba(60,20,10,.10) 0 11.25deg,rgba(255,255,255,.0) 11.25deg 22.5deg),url(/themes/court/marble.jpg) center/260px;
  box-shadow:0 0 0 6px #b07a20,0 0 0 8px #3a0710,0 0 0 9px #f2d37a,0 26px 60px rgba(0,0,0,.75),inset 0 0 70px rgba(60,20,8,.55)}
.ct-floor::after{content:'';position:absolute;inset:18%;border-radius:50%;border:2px solid rgba(176,122,32,.55);box-shadow:0 0 0 6px rgba(120,20,30,.18),inset 0 0 0 6px rgba(120,20,30,.12)}
.ct-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;text-align:center}
.ct-mask{position:relative;display:grid;place-items:center;border-radius:50%;box-shadow:inset 0 -5px 10px rgba(0,0,0,.45),inset 0 4px 8px rgba(255,255,255,.3),0 0 0 3px #e2b452,0 0 0 5px #3a0710,0 6px 12px rgba(0,0,0,.6);transition:box-shadow .2s}
.ct-seat.is-active .ct-mask{box-shadow:inset 0 -5px 10px rgba(0,0,0,.45),0 0 0 3px #fff2c0,0 0 0 5px #b07a20,0 0 24px rgba(255,214,120,.9)}
.ct-seat.is-dead{opacity:.45}.ct-seat.is-dead .ct-mask{filter:grayscale(1)}
.ct-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:7px;
  background:linear-gradient(180deg,rgba(50,10,16,.94),rgba(20,3,6,.96));border:1px solid rgba(242,211,122,.4);box-shadow:0 3px 8px rgba(0,0,0,.5)}
.ct-name{font-family:'Cinzel',serif;font-weight:700;font-size:13px;line-height:1.2;color:#fbeed2;overflow:hidden;text-overflow:ellipsis}
.ct-tag{font-size:11px;color:#f2c6d0;flex:none}
.ct-seat.is-me .ct-plate{border-color:#f2c6d0}
.ct-coins{display:inline-flex;align-items:center;gap:3px;font-family:'Ct Digits',serif;font-weight:700;font-size:13px;color:#ffe7a0}
.ct-coin{display:inline-block;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6cf,#f3cd6b 45%,#b47c1d);box-shadow:0 1px 2px rgba(0,0,0,.6),inset 0 -1px 0 rgba(0,0,0,.25)}
.ct-chip{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:12px;line-height:1.35;padding:0 8px;border-radius:999px;
  border:1px solid;background:rgba(20,3,6,.92);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.tone-green{color:#cdeab3;border-color:rgba(130,180,100,.7)}.tone-dim{color:#d9bfa0;border-color:rgba(200,160,120,.45)}
.tone-red{color:#fff;border-color:#ff8a7a;background:#7d150f}.tone-gold{color:#2a1505;border-color:#6d4b12;background:linear-gradient(180deg,#fbe7a8,#d8a948)}
.tone-blue{color:#dbe6ff;border-color:#9db8f2;background:#1f3f86}
.ct-claims{display:flex;gap:2px;align-items:center;min-height:16px}
.ct-warn{font-size:10px;font-weight:700;color:#fff;background:#9c1b14;border-radius:999px;padding:0 5px;margin-left:2px}

/* Parchemins d'action */
.ct-dock{position:relative;color:#2a1a0c;border-radius:12px;padding:18px 14px 16px;border:3px solid transparent;
  background:radial-gradient(130% 100% at 50% 50%,#fffaf0 30%,#f2e3c2) padding-box,linear-gradient(135deg,#fbe8a6,#b07a20 30%,#f6d98a 55%,#8a5a12 80%,#f2d37a) border-box;
  box-shadow:0 18px 34px rgba(0,0,0,.6);animation:ct-rise .35s ease-out}
@keyframes ct-rise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.ct-dock h4{font-family:'Cinzel',serif;font-weight:700;color:#5a0f1a;font-size:1.18rem;text-align:center;line-height:1.25}
.ct-dock .muted{color:#6b4f2a}
.ct-action{position:relative;display:flex;align-items:center;gap:10px;text-align:left;padding:8px 10px;border-radius:10px;border:1.5px solid rgba(138,90,18,.45);background:rgba(255,250,238,.7);transition:transform .12s,background .12s,border-color .12s}
.ct-action:hover:not(:disabled){transform:translateY(-2px);border-color:#b07a20;background:#fffaf0}
.ct-action[aria-pressed=true]{border-color:#5a0f1a;background:#fff3d8;box-shadow:0 0 0 2px #5a0f1a}
.ct-action:disabled{opacity:.38;filter:grayscale(.6)}
.ct-action .lb{font-family:'Cinzel',serif;font-weight:700;font-size:14.5px;color:#3a0b12}
.ct-action .sm{font-size:13.5px;color:#5b4524;line-height:1.15}
.ct-bluff{font-family:'Cinzel',serif;font-size:9.5px;font-weight:700;letter-spacing:.06em;color:#fff;background:#7a1d2a;border-radius:4px;padding:1px 5px}
.ct-btn{font-family:'Cinzel',serif;font-weight:700;letter-spacing:.05em;font-size:.95rem;border-radius:10px;padding:.7rem 1.3rem;color:#22150a;
  border:1px solid #6d4b12;background:linear-gradient(180deg,#fff0bf,#e2b452 50%,#a8761d);text-shadow:0 1px 0 rgba(255,240,200,.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 3px 0 #5e3f0e,0 8px 16px rgba(0,0,0,.35);transition:transform .1s,filter .1s}
.ct-btn:hover{filter:brightness(1.06)}.ct-btn:active{transform:translateY(2px)}.ct-btn:disabled{opacity:.45;filter:grayscale(.5);cursor:not-allowed}
.ct-btn.danger{color:#ffeae4;border-color:#3d0604;background:linear-gradient(180deg,#d9574a,#9c1b14 55%,#5e0c08);text-shadow:0 1px 0 rgba(0,0,0,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #3d0604,0 8px 16px rgba(0,0,0,.35)}
.ct-btn2{font-family:'Cinzel',serif;font-weight:700;letter-spacing:.05em;font-size:.85rem;border-radius:10px;padding:.65rem 1.1rem;color:#3a2410;border:1px solid #8b6a33;background:rgba(255,250,235,.6)}
.ct-btn2:hover{background:rgba(255,250,235,.95)}
.ct-pick{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px;border-radius:12px;transition:transform .15s}
.ct-pick:hover{transform:translateY(-2px)}
.ct-pick[aria-checked=true]{background:rgba(90,15,26,.12);box-shadow:0 0 0 2px #5a0f1a}
button > .ct-card{transition:transform .2s cubic-bezier(.3,1.4,.5,1)}
button:hover > .ct-card{transform:translateY(-5px)}
button[aria-pressed=true] > .ct-card{transform:translateY(-10px);box-shadow:0 0 0 3px #5a0f1a,0 16px 26px rgba(0,0,0,.45)}
button[aria-pressed=false] > .ct-card{opacity:.75}

/* Annonces */
.ct-banner{position:relative;isolation:isolate;width:min(780px,100%);padding:20px 12px 18px;text-align:center;animation:ct-banner 1.8s cubic-bezier(.2,.8,.2,1) both}
.ct-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(24,3,6,.92) 22%,rgba(24,3,6,.92) 78%,transparent);
  border-top:1px solid rgba(242,211,122,.5);border-bottom:1px solid rgba(242,211,122,.5)}
.ct-banner .k{font-size:13px;letter-spacing:.38em;text-transform:uppercase;color:#e8c98a;font-family:'Cinzel',serif}
.ct-banner .s{margin-top:6px;color:#f3e6cc;font-style:italic;font-size:1.15rem}
@keyframes ct-banner{0%{opacity:0;transform:scale(1.1)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.ct-flip{animation:ct-flip .7s cubic-bezier(.3,1.3,.5,1)}
@keyframes ct-flip{from{transform:perspective(500px) rotateY(90deg)}to{transform:none}}

/* Écrans communs */
.ct-ui-panel{position:relative;padding:30px 22px 24px;border-radius:14px;color:#2a1a0c;font-family:'Ct Digits','Cormorant Garamond',Georgia,serif;font-weight:500;border:3px solid transparent;
  background:radial-gradient(130% 100% at 50% 40%,#fffaf0 30%,#efdcb6) padding-box,linear-gradient(135deg,#fbe8a6,#b07a20 30%,#f6d98a 55%,#8a5a12 80%,#f2d37a) border-box;
  box-shadow:0 30px 70px rgba(0,0,0,.8)}
.ct-ui-kicker{font-family:'Cinzel',serif;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#7a1d2a}
.ct-ui-title{font-family:'Cinzel',serif;font-weight:700;font-size:1.9rem;line-height:1.15;color:#3a0b12}
.ct-ui-text{font-family:'Ct Digits','Cormorant Garamond',Georgia,serif;color:#4a3418;font-size:1.12rem}
.ct-hud{border-radius:50%;color:#f2d37a;border:2px solid #b07a20;background:radial-gradient(circle at 50% 30%,rgba(255,220,150,.18),transparent 60%),linear-gradient(180deg,#4a0d16,#1c0306);
  box-shadow:inset 0 1px 0 rgba(255,230,170,.3),0 4px 12px rgba(0,0,0,.6)}
.ct-hud:hover{color:#fff0bf;border-color:#f2d37a}
.ct-ui-drawer{color:#f3e6cc;font-family:'Ct Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:3px solid #b07a20;
  background:linear-gradient(180deg,rgba(36,6,10,.9),rgba(16,2,4,.96)),url(/themes/court/damask.jpg) center/260px;box-shadow:-20px 0 60px rgba(0,0,0,.65)}
.ct-ui-pill{font-family:'Ct Digits','Cormorant Garamond',Georgia,serif;font-size:14px;color:#2a1a0c;padding:6px 14px;border-radius:999px;background:#fbf1dc;border:1.5px solid #b07a20;box-shadow:0 6px 16px rgba(0,0,0,.5)}
@media (prefers-reduced-motion:reduce){.ct *{animation:none!important;transition:none!important}.ct-banner{animation:ct-fade .2s both!important}}
@keyframes ct-fade{from{opacity:0}to{opacity:1}}
`;
