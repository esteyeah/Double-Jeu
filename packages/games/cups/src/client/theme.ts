/** Décor de Gobelets : la cave aux fûts — voûtes de pierre, torches, fûts couchés, dessus de tonneau, gobelets d'étain, plaques de fer. */
export const CUPS_CSS = `
@font-face{font-family:'Go Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.go{position:relative;min-height:100dvh;color:#efe6d6;font-family:'Go Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;background:#101215;overflow:hidden;overflow:clip;isolation:isolate}
.go-wall{position:absolute;inset:0;z-index:-4;background:linear-gradient(180deg,rgba(18,22,30,.45),rgba(10,11,14,.75)),url(/themes/cups/wall.jpg) center top/380px;filter:saturate(.35) brightness(.85)}
.go-vault{position:absolute;left:0;right:0;top:0;height:min(560px,70vh);z-index:-3;pointer-events:none}
.go-vault svg{display:block;width:100%;height:100%}
.go-light{position:absolute;inset:0;z-index:-2;pointer-events:none;animation:go-flicker 5s ease-in-out infinite;
  background:radial-gradient(20% 26% at 34% 22%,rgba(255,154,60,.34),transparent 70%),radial-gradient(20% 26% at 66% 22%,rgba(255,154,60,.34),transparent 70%),
    radial-gradient(60% 50% at 50% 62%,rgba(255,160,80,.12),transparent 72%),radial-gradient(140% 100% at 50% 40%,transparent 40%,rgba(0,0,0,.88) 100%)}
@keyframes go-flicker{0%,100%{opacity:1}35%{opacity:.86}40%{opacity:.97}72%{opacity:.9}}
.go-title{font-family:'Cinzel','Cormorant Garamond',serif;font-weight:700;letter-spacing:.06em}
.go-amber{color:#f2c27a;text-shadow:0 0 22px rgba(255,140,40,.5),0 3px 0 #000}
.go-num{font-family:'Go Digits',serif;font-weight:700}
.go-iron{background:#1d2024;border:3px solid #4a4f57;border-radius:4px;box-shadow:inset 0 0 0 2px #0b0c0f,0 8px 20px rgba(0,0,0,.6)}
.go-sign{display:inline-flex;flex-direction:column;align-items:center;padding:8px 26px 10px;border-radius:4px;
  background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.3)),#1d2024;border:3px solid #4a4f57;
  box-shadow:inset 0 0 0 2px #0b0c0f,0 0 40px rgba(255,140,40,.15),0 10px 22px rgba(0,0,0,.6)}
.go-sign .meta{font-family:'Cinzel',serif;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#c9c2b4}
.go-rulesbtn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;font-family:'Cinzel',serif;font-weight:700;font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#efe6d6;
  background:#1d2024;border:2px solid #4a4f57;border-radius:4px;box-shadow:inset 0 0 0 2px #0b0c0f,0 6px 14px rgba(0,0,0,.5);transition:border-color .15s,color .15s}
.go-rulesbtn:hover{border-color:#f2c27a;color:#fff}
.go-rulesbtn:focus-visible,.go-codex button:focus-visible{outline:3px solid #ffb35c;outline-offset:3px}

/* Dés */
.go-die{position:relative;display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);flex:none;border-radius:22%;
  background:radial-gradient(120% 120% at 30% 25%,#fffdf6,#f1e6cf 55%,#d6c6a6);box-shadow:inset 0 -3px 4px rgba(120,90,50,.35),inset 0 2px 2px #fff,0 3px 6px rgba(0,0,0,.55)}
.go-die.ace{background:radial-gradient(120% 120% at 30% 25%,#fff4cc,#f3cd6b 55%,#b47c1d);box-shadow:inset 0 -3px 4px rgba(100,60,10,.4),inset 0 2px 2px #fff8dc,0 3px 6px rgba(0,0,0,.55),0 0 10px rgba(255,200,90,.5)}
.go-die.hit{outline:3px solid #6fe08a;outline-offset:1px;box-shadow:0 0 14px rgba(111,224,138,.85),0 3px 6px rgba(0,0,0,.55)}
.go-die.dim{opacity:.35;filter:grayscale(.5)}
.go-die i{display:block;place-self:center;width:var(--pip);height:var(--pip);border-radius:50%;background:radial-gradient(circle at 35% 30%,#5a1a12,#1a0605 70%)}
.go-die.ace i{background:radial-gradient(circle at 35% 30%,#a3241a,#4a0a06 70%)}
.go-roll{animation:go-roll .6s cubic-bezier(.3,1.4,.5,1) both}
@keyframes go-roll{0%{transform:translateY(-14px) rotate(-120deg);opacity:0}100%{transform:none;opacity:1}}
.go-hidden{display:inline-block;flex:none;border-radius:22%;background:linear-gradient(135deg,#3a2414,#1a0e06);box-shadow:inset 0 0 0 1px rgba(255,208,122,.25),0 2px 3px rgba(0,0,0,.5)}

/* Gobelet d'étain, retourné sur le tonneau */
.go-cup{position:relative;display:block;flex:none;clip-path:polygon(15% 0,85% 0,100% 100%,0 100%);
  background:linear-gradient(180deg,transparent 26%,rgba(40,44,50,.75) 26% 32%,transparent 32% 68%,rgba(40,44,50,.75) 68% 74%,transparent 74%),
    linear-gradient(90deg,#3a3e44,#e6e9ec 22%,#a9adb3 36%,#8d9298 55%,#5a5f66 78%,rgba(255,154,60,.55) 92%,#33373c);
  filter:drop-shadow(0 7px 5px rgba(0,0,0,.65))}
.go-cup::before{content:'';position:absolute;left:0;right:0;bottom:0;height:12%;background:linear-gradient(180deg,#9aa0a6,#4e535a);box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}
.go-cup::after{content:'';position:absolute;left:15%;right:15%;top:0;height:9%;background:linear-gradient(180deg,#d6dade,#7a7f86)}
.go-cup.lift{animation:go-lift .6s cubic-bezier(.2,1.2,.4,1) forwards}
@keyframes go-lift{to{transform:translateY(-30%) rotate(-12deg);opacity:.35}}
.go-cup.shake{animation:go-shake .5s ease-in-out}
@keyframes go-shake{0%,100%{transform:none}20%{transform:rotate(-8deg) translateX(-3px)}40%{transform:rotate(7deg) translateX(3px)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}}

/* Consigne */
.go-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:4px;color:#efe6d6;font-size:1.13rem;line-height:1.3;
  background:rgba(16,17,20,.9);border:2px solid #4a4f57;border-top-color:#ff9a3c;box-shadow:inset 0 0 0 1px #0b0c0f,0 8px 18px rgba(0,0,0,.55)}
.go-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a3e44,#121417 70%);box-shadow:0 0 0 2px #4a4f57}
.go-call strong{color:#f2c27a;font-weight:600}
.go-call.is-mine{animation:go-pulse 2.2s ease-in-out infinite}
@keyframes go-pulse{0%,100%{box-shadow:0 0 0 1px #b8641e,0 0 18px rgba(255,140,40,.3),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 2px #ff9a3c,0 0 34px rgba(255,140,40,.6),0 8px 18px rgba(0,0,0,.5)}}
.go-dry{margin-top:8px;padding:6px 14px;border-radius:10px;text-align:center;color:#ffd2c9;background:rgba(90,14,8,.75);box-shadow:inset 0 0 0 1px rgba(255,120,100,.5)}

/* La table : le dessus d'un grand tonneau, cerclé de fer. Les gobelets des joueurs sont posés dessus. */
.go-table{position:absolute;inset:-2% 1.5%;border-radius:50%;
  background:repeating-radial-gradient(closest-side,transparent 0 21%,rgba(30,14,4,.4) 21% 21.8%),
    radial-gradient(55% 50% at 50% 45%,rgba(255,180,100,.24),transparent 72%),linear-gradient(rgba(60,30,10,.15),rgba(20,8,2,.35)),url(/themes/cups/table.jpg) center/380px;
  box-shadow:0 0 0 10px #1a1a1c,0 0 0 13px #4a4f57,0 0 0 15px #0b0c0f,0 0 40px 18px rgba(255,140,40,.12),0 30px 60px rgba(0,0,0,.85),inset 0 0 80px rgba(20,8,2,.85)}
.go-table::after{content:'';position:absolute;inset:0;border-radius:50%;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(255,154,60,.25)}
.go-slate{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 18px 12px;border-radius:4px;color:#efe6d6;
  background:rgba(16,17,20,.94);border:3px solid #4a4f57;border-top-color:#ff9a3c;box-shadow:0 0 40px rgba(255,140,40,.25),0 10px 24px rgba(0,0,0,.6)}
.go-slate .chalk{font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#c9c2b4}
.go-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;text-align:center}
.go-mug{position:relative;display:inline-block;flex:none;align-self:center;border-radius:50%;background:radial-gradient(circle at 40% 30%,#7a5030,#2a1508);box-shadow:0 0 0 2px #c58b3f,0 0 0 4px #2a1508,0 6px 10px rgba(0,0,0,.6)}
.go-seat.is-active .go-mug{box-shadow:0 0 0 2px #ffe0a0,0 0 0 4px #8a5a12,0 0 18px rgba(255,200,100,.9)}
.go-seat.is-out .go-mug{filter:grayscale(1)}
.go-seat.is-active .go-cup{filter:drop-shadow(0 0 12px rgba(255,200,100,.95)) drop-shadow(0 6px 6px rgba(0,0,0,.6))}
.go-seat.is-out{opacity:.45}
.go-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:3px;
  background:rgba(11,12,15,.9);border:1px solid #4a4f57;box-shadow:0 3px 8px rgba(0,0,0,.5)}
.go-name{font-family:'Cinzel',serif;font-weight:700;font-size:14px;line-height:1.3;color:#efe6d6;overflow:hidden;text-overflow:ellipsis}
.go-tag{font-size:11px;color:#ffd07a;flex:none}
.go-seat.is-me .go-plate{border-color:#ffd07a}
.go-bubble{position:relative;display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:8px;font-size:13px;color:#f4f1ea;background:#2e3234;box-shadow:0 0 0 1.5px #6b4422,0 2px 4px rgba(0,0,0,.5)}
.go-chip{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:12px;line-height:1.35;padding:0 8px;border-radius:999px;border:1px solid;background:rgba(14,6,2,.92);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.tone-gold{color:#1d1206;border-color:#6d4b12;background:linear-gradient(180deg,#ffe3a0,#e0a840)}.tone-red{color:#fff;border-color:#ff8a7a;background:#8e1b14}
.tone-green{color:#062a14;border-color:#1f7a46;background:#9ff0bd}.tone-dim{color:#d9c3a0;border-color:rgba(200,160,110,.45)}

/* Panneaux, boutons */
.go-dock{position:relative;color:#efe6d6;border-radius:4px;padding:18px 16px 16px;
  background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 40%),rgba(14,15,18,.95);border:3px solid #4a4f57;
  box-shadow:inset 0 0 0 2px #0b0c0f,0 18px 34px rgba(0,0,0,.6);animation:go-up .35s ease-out}
@keyframes go-up{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.go-dock h4{font-family:'Cinzel',serif;font-weight:700;font-size:1.3rem;letter-spacing:.04em;color:#f2c27a;text-align:center;line-height:1.2}
.go-dock .muted{color:#c9c2b4}
.go-mycup{position:relative;border-radius:6px;padding:14px;color:#efe6d6;
  background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55)),url(/themes/cups/leather.jpg) center/200px;border:2px solid #5a361b;box-shadow:inset 0 4px 14px rgba(0,0,0,.7),0 12px 26px rgba(0,0,0,.55)}
.go-btn{font-family:'Cinzel',serif;font-weight:700;font-size:1.05rem;letter-spacing:.08em;border-radius:4px;padding:.6rem 1.3rem;color:#1a0c02;
  border:2px solid #1a1a1c;background:linear-gradient(180deg,#f6b066,#e0852e 55%,#b0601c);text-shadow:0 1px 0 rgba(255,220,170,.5);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 0 2px #4a4f57,0 8px 16px rgba(0,0,0,.4);transition:transform .1s,filter .1s}
.go-btn:hover{filter:brightness(1.07)}.go-btn:active{transform:translateY(2px)}.go-btn:disabled{opacity:.45;filter:grayscale(.5);cursor:not-allowed}
.go-btn.liar{color:#fff;border-color:#3d0604;background:linear-gradient(180deg,#e0574a,#9c1b14 55%,#5e0c08);text-shadow:0 1px 0 rgba(0,0,0,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #3d0604,0 8px 16px rgba(0,0,0,.35)}
.go-btn.exact{color:#062a14;border-color:#1f5a32;background:linear-gradient(180deg,#d9ffe0,#7ee08f 55%,#3f9f5a);text-shadow:none;box-shadow:inset 0 1px 0 #fff,0 3px 0 #1f5a32,0 8px 16px rgba(0,0,0,.35)}
.go-btn2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:1.05rem;border-radius:10px;padding:.55rem 1.1rem;color:#3a2410;border:1px solid #8b6a33;background:rgba(255,250,235,.55)}
.go-face{border-radius:12px;padding:4px;transition:transform .12s}
.go-face:hover:not(:disabled){transform:translateY(-3px)}
.go-face[aria-checked=true]{background:rgba(255,154,60,.12);box-shadow:0 0 0 3px #ff9a3c}
.go-face:disabled{opacity:.25}
.go-step{display:grid;place-items:center;width:44px;height:44px;border-radius:4px;font-size:1.4rem;font-weight:700;color:#efe6d6;background:#2c3036;border:2px solid #4a4f57}
.go-step:disabled{opacity:.3}

/* Annonces */
.go-banner{position:relative;isolation:isolate;width:min(780px,100%);padding:20px 12px 18px;text-align:center;animation:go-banner 2.2s cubic-bezier(.2,.8,.2,1) both}
.go-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(14,6,2,.9) 22%,rgba(14,6,2,.9) 78%,transparent);
  border-top:1px solid rgba(255,208,122,.45);border-bottom:1px solid rgba(255,208,122,.45)}
.go-banner .shout{font-family:'Pirata One',serif;font-size:clamp(3rem,12vw,5.5rem);line-height:1;transform:rotate(-4deg);display:inline-block}
.go-banner .s{margin-top:8px;color:#f6e7cc;font-style:italic;font-size:1.15rem}
@keyframes go-banner{0%{opacity:0;transform:scale(1.3)}10%{opacity:1;transform:none}84%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}

/* Écrans communs */
.go-ui-panel{position:relative;padding:28px 22px 24px;border-radius:12px;color:#2a1a0c;font-family:'Go Digits','Cormorant Garamond',Georgia,serif;font-weight:500;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.4)),url(/themes/compass/parchment.jpg) center/320px;box-shadow:0 30px 70px rgba(0,0,0,.8),inset 0 0 50px rgba(120,75,25,.5),0 0 0 3px #3a1f0c}
.go-ui-kicker{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#7a1d14}
.go-ui-title{font-family:'Pirata One',serif;font-size:2.3rem;line-height:1.05;color:#4a140c}
.go-ui-text{font-family:'Go Digits','Cormorant Garamond',Georgia,serif;color:#4a3418;font-size:1.12rem}
.go-hud{border-radius:50%;color:#ffd07a;border:2px solid #a8741f;background:radial-gradient(circle at 50% 30%,rgba(255,210,140,.18),transparent 60%),linear-gradient(180deg,rgba(40,20,8,.6),rgba(10,4,2,.85)),url(/themes/cups/leather.jpg) center/80px;
  box-shadow:inset 0 1px 0 rgba(255,230,170,.3),0 4px 12px rgba(0,0,0,.6)}
.go-hud:hover{color:#fff0bf;border-color:#ffd07a}
.go-ui-drawer{color:#f3e3c6;font-family:'Go Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:3px solid #5e3f12;
  background:linear-gradient(180deg,rgba(24,12,4,.9),rgba(10,4,2,.96)),url(/themes/cups/table.jpg) center/320px;box-shadow:-20px 0 60px rgba(0,0,0,.65)}
.go-ui-pill{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:14px;color:#2a1a0c;padding:6px 14px;border-radius:999px;background:url(/themes/compass/parchment.jpg) center/200px;border:1px solid #8b6a33;box-shadow:0 6px 16px rgba(0,0,0,.5)}

/* Grimoire des règles : page de manuscrit enluminé */
.go-codex{width:min(1040px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:0;border:0;background:transparent;color:#2b1d12;overflow:visible}
.go-codex::backdrop{background:rgba(5,5,7,.78)}
.go-codex[open]{animation:go-up .3s ease-out}
.go-codex-page{position:relative;display:flex;flex-direction:column;gap:14px;max-height:calc(100dvh - 24px);box-sizing:border-box;padding:40px 52px 30px;
  font-family:'IM Fell English',Georgia,serif;font-size:17px;line-height:1.42;
  background:radial-gradient(130% 100% at 50% 50%,transparent 50%,rgba(150,105,50,.5)),#f1e3c0;
  border:6px solid #c79a2e;box-shadow:inset 0 0 0 6px #f1e3c0,inset 0 0 0 8px #a8321e,inset 0 0 0 12px #f1e3c0,inset 0 0 0 13.5px #1f3f8a,0 24px 70px rgba(0,0,0,.75)}
.go-codex-fleur{position:absolute;width:62px;height:62px;pointer-events:none}
.go-codex-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:10px;border-bottom:2px solid #a8321e}
.go-codex-kicker{font-family:'IM Fell English SC','IM Fell English',serif;font-size:18px;letter-spacing:.08em;color:#a8321e}
.go-codex-title{margin:0;font-family:'UnifrakturMaguntia','Pirata One',serif;font-weight:400;font-size:clamp(2rem,5vw,3.2rem);line-height:1;color:#2b1d12}
.go-codex-close{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:50%;color:#1f3f8a;background:#f1e3c0;border:2px solid #1f3f8a}
.go-codex-close:hover{background:#1f3f8a;color:#f1e3c0}
.go-codex-body{min-height:0;overflow-y:auto;columns:2 380px;column-gap:44px;column-rule:1px solid #c9a86a;padding-right:4px}
.go-codex-body p{margin:0 0 12px;break-inside:avoid}
.go-codex-rubric{font-family:'IM Fell English SC','IM Fell English',serif;color:#a8321e}
.go-codex-off{opacity:.55}
.go-codex-off .go-codex-tag{font-style:italic;font-size:15px}
.go-codex-lettrine{float:left;display:grid;place-items:center;width:60px;height:64px;margin:4px 10px 0 0;background:#1f3f8a;border:3px solid #c79a2e;box-shadow:inset 0 0 0 2px #a8321e;
  font-family:'UnifrakturMaguntia','Pirata One',serif;font-size:52px;line-height:1;color:#f0cf6a}
.go-codex-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;padding-top:12px;border-top:2px solid #a8321e;font-style:italic}
.go-codex-seal{min-width:150px;min-height:54px;padding:0 26px;border-radius:30px;color:#f8ead0;background:#a8321e;border:0;
  box-shadow:inset 0 0 0 4px #8a2414,inset 0 0 0 6px #c8553c,0 5px 10px rgba(60,20,5,.35);font-family:'UnifrakturMaguntia','Pirata One',serif;font-size:24px;font-style:normal}
.go-codex-seal:hover{filter:brightness(1.1)}
@media (max-width:640px){.go-codex-page{padding:30px 22px 22px;font-size:16px}.go-codex-fleur{width:44px;height:44px}}
@media (prefers-reduced-motion:reduce){.go *{animation:none!important;transition:none!important}.go-banner{animation:go-fade .2s both!important}.go-codex[open]{animation:none}}
@keyframes go-fade{from{opacity:0}to{opacity:1}}
`;
