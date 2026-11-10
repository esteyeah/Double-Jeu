/** Décor de Garde à vue : commissariat des années 70 — mur vert, néon, bureau en métal, dossier kraft, tableau de liège. */
export const INTERROGATION_CSS = `
@font-face{font-family:'Gv Digits';src:local('Courier New'),local('Liberation Mono'),local('Nimbus Mono PS'),local('Cousine');unicode-range:U+0030-0039}
.gv{position:relative;min-height:100dvh;color:#e9ecdf;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;overflow:hidden;isolation:isolate;
  background:linear-gradient(180deg,transparent 0 68%,rgba(0,0,0,.35) 68.2%,transparent 69%),url(/themes/interrogation/lino.jpg) 0 0/240px,#2b3328}
.gv-wall{position:absolute;inset:0 0 auto 0;height:100%;z-index:-3;background:url(/themes/interrogation/wall.jpg) center top/520px;
  -webkit-mask:linear-gradient(180deg,#000 0 72%,transparent 86%);mask:linear-gradient(180deg,#000 0 72%,transparent 86%)}
.gv-light{position:absolute;inset:0;z-index:-2;pointer-events:none;
  background:radial-gradient(45% 30% at 50% 0%,rgba(230,255,220,.35),transparent 72%),radial-gradient(38% 34% at 72% 42%,rgba(255,236,180,.20),transparent 72%),radial-gradient(140% 100% at 50% 30%,transparent 45%,rgba(0,0,0,.78) 100%)}
.gv-neon{position:absolute;left:50%;top:0;width:min(460px,70%);height:9px;transform:translateX(-50%);border-radius:0 0 6px 6px;z-index:-1;
  background:linear-gradient(180deg,#f6fff0,#cfe8c6);box-shadow:0 0 30px 8px rgba(220,255,210,.55),0 0 90px 20px rgba(200,255,190,.25);animation:gv-neon 7s steps(1) infinite}
@keyframes gv-neon{0%,100%{opacity:1}61%{opacity:.35}62%{opacity:1}64%{opacity:.5}65%{opacity:1}}
.gv-type{font-family:'Special Elite','Courier New',monospace;letter-spacing:.02em}
.gv-num{font-family:'Gv Digits','Special Elite',monospace;font-weight:700}
.gv-stamp{display:inline-block;font-family:'Special Elite',monospace;text-transform:uppercase;letter-spacing:.12em;color:#b3261e;border:3px solid currentColor;border-radius:6px;padding:2px 10px;
  transform:rotate(-3deg);opacity:.88;mix-blend-mode:multiply;-webkit-mask:radial-gradient(circle at 30% 40%,#000 60%,rgba(0,0,0,.75) 61%);mask:radial-gradient(circle at 30% 40%,#000 60%,rgba(0,0,0,.75) 61%)}
.gv-stamp.blue{color:#1f4f86}.gv-stamp.green{color:#1f6b3a}

/* En-tête : tampon, manche, chronomètre */
.gv-title{font-family:'Special Elite',monospace;font-size:clamp(1.8rem,6vw,2.6rem);letter-spacing:.14em;text-transform:uppercase;color:#f4f6ea;text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 18px rgba(220,255,210,.25)}
.gv-watch{position:relative;display:flex;align-items:center;gap:10px;padding:6px 14px 6px 6px;border-radius:999px;background:linear-gradient(180deg,#3a4136,#1c201a);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 2px #0e110d,0 8px 18px rgba(0,0,0,.5)}
.gv-rec{display:inline-flex;align-items:center;gap:5px;font-family:'Special Elite',monospace;font-size:12px;letter-spacing:.12em;color:#ff8a7a}
.gv-rec i{width:10px;height:10px;border-radius:50%;background:#ff3b2b;box-shadow:0 0 10px #ff3b2b;animation:gv-blink 1s steps(2) infinite}
@keyframes gv-blink{50%{opacity:.2}}

/* Le dossier kraft */
.gv-folder{position:relative;margin-top:14px;padding:22px 16px 16px;border-radius:4px 10px 10px 10px;color:#2a2416;
  background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.08)),url(/themes/interrogation/manila.jpg) center/300px;box-shadow:0 14px 30px rgba(0,0,0,.55),inset 0 0 30px rgba(120,90,30,.35)}
.gv-folder::before{content:'DOSSIER';position:absolute;left:0;top:-22px;padding:3px 16px 2px;border-radius:8px 8px 0 0;font-family:'Special Elite',monospace;font-size:12px;letter-spacing:.2em;color:#4a3a1a;
  background:url(/themes/interrogation/manila.jpg) center/300px;box-shadow:0 -4px 8px rgba(0,0,0,.25)}
.gv-sheet{position:relative;padding:14px 16px 16px;background:#f7f4ea;color:#22201a;box-shadow:0 3px 8px rgba(0,0,0,.3);transform:rotate(-.4deg)}
.gv-sheet::after{content:'';position:absolute;left:22px;top:-12px;width:14px;height:44px;border:3px solid #9aa1a6;border-bottom:none;border-radius:8px 8px 0 0;box-shadow:inset 0 0 0 1px #6b7176}
.gv-sheet p{font-family:'Special Elite',monospace;font-size:15px;line-height:1.55}

/* Consigne */
.gv-call{display:flex;align-items:center;gap:12px;margin-top:12px;padding:9px 16px 9px 9px;border-radius:10px;color:#22201a;font-size:1.12rem;line-height:1.3;
  background:#f1ecda;border-left:6px solid #b3261e;box-shadow:0 8px 18px rgba(0,0,0,.45)}
.gv-call .ic{flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#4a5a6a,#1b2530 70%);box-shadow:0 0 0 2px #c9b56a}
.gv-call strong{color:#7a1d14}
.gv-call.is-mine{animation:gv-pulse 2.2s ease-in-out infinite}
@keyframes gv-pulse{0%,100%{box-shadow:0 0 0 2px #c9b56a,0 8px 18px rgba(0,0,0,.45)}50%{box-shadow:0 0 0 2px #ffe08a,0 0 26px rgba(255,224,138,.55),0 8px 18px rgba(0,0,0,.45)}}

/* Le tableau de liège */
.gv-board{position:relative;padding:18px 14px 16px;border-radius:6px;background:url(/themes/interrogation/cork.jpg) center/260px;
  box-shadow:0 0 0 10px #6b4a28,0 0 0 12px #2a1b0c,0 16px 34px rgba(0,0,0,.6),inset 0 0 30px rgba(60,30,10,.45)}
.gv-board h3{font-family:'Special Elite',monospace;color:#2a1b0c;background:#f7f4ea;display:inline-block;padding:2px 10px;transform:rotate(-1.5deg);box-shadow:0 2px 5px rgba(0,0,0,.35)}
.gv-polas{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:16px 10px;margin-top:14px}
.gv-pola{position:relative;padding:7px 7px 10px;background:#fbfaf4;color:#22201a;text-align:center;box-shadow:0 6px 12px rgba(0,0,0,.45);transition:transform .2s}
.gv-pola:nth-child(3n+1){transform:rotate(-2.5deg)}.gv-pola:nth-child(3n+2){transform:rotate(1.8deg)}.gv-pola:nth-child(3n){transform:rotate(-.8deg)}
.gv-pola::before{content:'';position:absolute;left:50%;top:-7px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a7a,#b3261e 60%,#5e0c08);box-shadow:0 3px 4px rgba(0,0,0,.5);z-index:2}
.gv-photo{position:relative;display:grid;place-items:end center;aspect-ratio:1;overflow:hidden;
  background:repeating-linear-gradient(180deg,transparent 0 13px,rgba(255,255,255,.18) 13px 14px),linear-gradient(180deg,#5a6670,#2a3036)}
.gv-photo.insp{background:radial-gradient(circle at 50% 40%,#3a5a7a,#162636)}
.gv-pola .nm{display:block;margin-top:6px;font-family:'Special Elite',monospace;font-size:14px;line-height:1.15;word-break:break-word}
.gv-pola .sc{font-family:'Gv Digits',monospace;font-size:12px;color:#5a5446}
.gv-pola .st{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-12deg);white-space:nowrap;font-size:13px}
.gv-pola.is-me{box-shadow:0 0 0 3px #ffe08a,0 6px 12px rgba(0,0,0,.45)}
.gv-chip{display:inline-block;margin-top:3px;font-family:'Special Elite',monospace;font-size:11.5px;padding:0 6px;border-radius:3px}
.gv-chip.ok{color:#1f6b3a;background:#dff5e3}.gv-chip.wait{color:#6b5a2a;background:#f5ecd0}

/* Fiches et panneaux */
.gv-card{position:relative;padding:16px 16px 14px;color:#22201a;border-radius:3px;
  background:linear-gradient(180deg,transparent 0 34px,rgba(200,60,60,.45) 34px 35.5px,transparent 35.5px),repeating-linear-gradient(180deg,transparent 0 23px,rgba(70,110,170,.25) 23px 24px),#fbfaf4;
  box-shadow:0 12px 26px rgba(0,0,0,.5)}
.gv-card h4{font-family:'Special Elite',monospace;font-size:1.15rem;color:#22201a;line-height:1.25}
.gv-card .muted{color:#5a5446}
.gv-word{display:inline-block;padding:4px 12px;font-family:'Special Elite',monospace;font-size:1.05rem;color:#22201a;background:#fffef6;box-shadow:0 2px 5px rgba(0,0,0,.3),inset 0 -2px 0 rgba(200,60,60,.25)}
.gv-word.line-through{text-decoration:line-through;color:#8a8576}
.gv-desk{position:relative;padding:16px;border-radius:6px;color:#e9ecdf;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.25)),url(/themes/interrogation/metal.jpg) center/300px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 2px #1b201b,0 14px 28px rgba(0,0,0,.55)}
.gv-desk h4{font-family:'Special Elite',monospace;font-size:1.1rem;color:#f4f6ea;text-shadow:0 1px 2px rgba(0,0,0,.7)}
.gv-desk .muted{color:#c9d1c0}
.gv-input{min-width:0;flex:1;padding:.55rem .8rem;border-radius:4px;font-family:'Special Elite',monospace;font-size:1rem;color:#22201a;background:#fbfaf4;border:2px solid #1b201b;outline:none;box-shadow:inset 0 2px 4px rgba(0,0,0,.2)}
.gv-input:focus{border-color:#c9b56a}
.gv-btn{font-family:'Special Elite',monospace;font-size:1rem;letter-spacing:.04em;border-radius:6px;padding:.65rem 1.2rem;color:#1b201b;border:2px solid #1b201b;
  background:linear-gradient(180deg,#fff6cf,#e0c76a);box-shadow:0 3px 0 #1b201b,0 8px 14px rgba(0,0,0,.35);transition:transform .1s,filter .1s}
.gv-btn:hover{filter:brightness(1.05)}.gv-btn:active{transform:translateY(2px)}.gv-btn:disabled{opacity:.45;cursor:not-allowed}
.gv-btn.red{color:#fff;background:linear-gradient(180deg,#d9574a,#9c1b14)}.gv-btn.green{color:#fff;background:linear-gradient(180deg,#4fae6a,#1f6b3a)}
.gv-btn2{font-family:'Special Elite',monospace;font-size:.95rem;border-radius:6px;padding:.55rem 1rem;color:#f4f6ea;border:2px solid rgba(244,246,234,.6);background:rgba(0,0,0,.25)}
.gv-btn2:hover{border-color:#fff}
.gv-mini{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px;border-radius:6px;background:#fbfaf4;color:#22201a;box-shadow:0 3px 6px rgba(0,0,0,.35);transition:transform .12s}
.gv-mini:hover{transform:translateY(-2px)}
.gv-mini[aria-checked=true]{box-shadow:0 0 0 3px #b3261e,0 3px 6px rgba(0,0,0,.35)}
.gv-mini .nm{font-family:'Special Elite',monospace;font-size:13px}

/* Annonces */
.gv-banner{position:relative;isolation:isolate;width:min(760px,100%);padding:22px 12px 20px;text-align:center;animation:gv-banner 2.4s cubic-bezier(.2,.8,.2,1) both}
.gv-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(12,14,11,.9) 22%,rgba(12,14,11,.9) 78%,transparent);border-top:1px solid rgba(220,255,210,.3);border-bottom:1px solid rgba(220,255,210,.3)}
.gv-banner .k{font-family:'Special Elite',monospace;font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:#c9d1c0}
.gv-banner .s{margin-top:8px;color:#e9ecdf;font-style:italic;font-size:1.15rem}
.gv-banner .gv-stamp{font-size:clamp(1.8rem,7vw,3.4rem);background:rgba(251,250,244,.92);mix-blend-mode:normal;animation:gv-thump .35s cubic-bezier(.2,1.6,.4,1) .15s both}
@keyframes gv-thump{from{transform:scale(2.2) rotate(-12deg);opacity:0}to{transform:rotate(-4deg);opacity:1}}
@keyframes gv-banner{0%{opacity:0}10%{opacity:1}84%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}

/* Écrans communs */
.gv-ui-panel{position:relative;padding:28px 22px 24px;border-radius:4px 10px 10px 10px;color:#2a2416;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;
  background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.08)),url(/themes/interrogation/manila.jpg) center/300px;box-shadow:0 30px 70px rgba(0,0,0,.75),inset 0 0 30px rgba(120,90,30,.35)}
.gv-ui-kicker{font-family:'Special Elite',monospace;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#b3261e}
.gv-ui-title{font-family:'Special Elite',monospace;font-size:1.8rem;line-height:1.15;color:#22201a}
.gv-ui-text{font-family:'Cormorant Garamond',Georgia,serif;color:#3a3220;font-size:1.12rem}
.gv-hud{border-radius:50%;color:#f4f6ea;border:2px solid #9aa1a6;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.3),transparent 60%),linear-gradient(180deg,#4a524a,#1c201a);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 12px rgba(0,0,0,.6)}
.gv-hud:hover{border-color:#fff}
.gv-ui-drawer{color:#e9ecdf;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:3px solid #9aa1a6;background:linear-gradient(180deg,rgba(28,34,28,.93),rgba(12,14,11,.97)),url(/themes/interrogation/wall.jpg) center/400px;box-shadow:-20px 0 60px rgba(0,0,0,.65)}
.gv-ui-pill{font-family:'Special Elite',monospace;font-size:13px;color:#22201a;padding:6px 14px;border-radius:4px;background:#f7f4ea;border-left:5px solid #b3261e;box-shadow:0 6px 16px rgba(0,0,0,.5)}
@media (prefers-reduced-motion:reduce){.gv *{animation:none!important;transition:none!important}.gv-banner{animation:gv-fade .2s both!important}}
@keyframes gv-fade{from{opacity:0}to{opacity:1}}
`;
