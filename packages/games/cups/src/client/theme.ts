/** Décor de Gobelets : taverne enfumée — pierre, âtre, table de bois, gobelets de cuir, ardoise à la craie. */
export const CUPS_CSS = `
@font-face{font-family:'Go Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.go{position:relative;min-height:100dvh;color:#f3e3c6;font-family:'Go Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;background:#120a05;overflow:hidden;overflow:clip;isolation:isolate}
.go-wall{position:absolute;inset:0;z-index:-3;background:url(/themes/cups/wall.jpg) center top/420px}
.go-light{position:absolute;inset:0;z-index:-2;pointer-events:none;animation:go-flicker 5s ease-in-out infinite;
  background:radial-gradient(45% 35% at 50% 8%,rgba(255,170,80,.32),transparent 70%),radial-gradient(35% 45% at 0% 70%,rgba(255,140,50,.28),transparent 70%),
    radial-gradient(60% 50% at 50% 60%,rgba(255,170,90,.14),transparent 72%),radial-gradient(140% 100% at 50% 35%,transparent 42%,rgba(0,0,0,.85) 100%)}
@keyframes go-flicker{0%,100%{opacity:1}35%{opacity:.86}40%{opacity:.97}72%{opacity:.9}}
.go-title{font-family:'Pirata One','Cormorant Garamond',serif;letter-spacing:.02em}
.go-amber{color:#ffd07a;text-shadow:0 0 12px rgba(255,170,80,.55),0 2px 0 rgba(20,8,2,.9)}
.go-num{font-family:'Go Digits',serif;font-weight:700}
.go-sign{display:inline-flex;flex-direction:column;align-items:center;padding:8px 26px 10px;border-radius:12px;
  background:linear-gradient(180deg,rgba(255,215,160,.12),rgba(0,0,0,.35)),url(/themes/cups/table.jpg) center/300px;
  box-shadow:inset 0 0 0 2px rgba(255,208,122,.35),0 0 0 3px #2a1608,0 10px 22px rgba(0,0,0,.6)}

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

/* Gobelet de cuir */
.go-cup{position:relative;display:block;flex:none;clip-path:polygon(12% 0,88% 0,100% 100%,0 100%);
  background:linear-gradient(90deg,rgba(0,0,0,.45),rgba(255,220,180,.18) 35%,rgba(0,0,0,.1) 60%,rgba(0,0,0,.55)),url(/themes/cups/leather.jpg) center/120px;filter:drop-shadow(0 6px 6px rgba(0,0,0,.6))}
.go-cup::before{content:'';position:absolute;left:0;right:0;bottom:0;height:16%;background:linear-gradient(180deg,#8a5a2a,#4a2a10);box-shadow:inset 0 1px 0 rgba(255,220,170,.4)}
.go-cup::after{content:'';position:absolute;left:12%;right:12%;top:0;height:10%;background:linear-gradient(180deg,#a87a3a,#5a3a18)}
.go-cup.lift{animation:go-lift .6s cubic-bezier(.2,1.2,.4,1) forwards}
@keyframes go-lift{to{transform:translateY(-30%) rotate(-12deg);opacity:.35}}
.go-cup.shake{animation:go-shake .5s ease-in-out}
@keyframes go-shake{0%,100%{transform:none}20%{transform:rotate(-8deg) translateX(-3px)}40%{transform:rotate(7deg) translateX(3px)}60%{transform:rotate(-6deg)}80%{transform:rotate(4deg)}}

/* Consigne */
.go-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:14px;color:#f6e7cc;font-size:1.13rem;line-height:1.3;
  background:linear-gradient(180deg,rgba(255,215,160,.12),rgba(0,0,0,.45)),url(/themes/cups/table.jpg) center/320px;border:1px solid #1a0c04;box-shadow:inset 0 0 0 1px rgba(255,208,122,.25),0 8px 18px rgba(0,0,0,.55)}
.go-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8a2a1a,#3a0c06 70%);box-shadow:0 0 0 2px rgba(255,208,122,.6)}
.go-call strong{color:#ffd07a;font-weight:600}
.go-call.is-mine{animation:go-pulse 2.2s ease-in-out infinite}
@keyframes go-pulse{0%,100%{box-shadow:0 0 0 2px #b8812e,0 0 18px rgba(255,190,90,.35),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 2px #ffd07a,0 0 34px rgba(255,190,90,.7),0 8px 18px rgba(0,0,0,.5)}}
.go-dry{margin-top:8px;padding:6px 14px;border-radius:10px;text-align:center;color:#ffd2c9;background:rgba(90,14,8,.75);box-shadow:inset 0 0 0 1px rgba(255,120,100,.5)}

/* La table de la taverne */
.go-table{position:absolute;inset:8% 6%;border-radius:50%;
  background:radial-gradient(55% 50% at 50% 45%,rgba(255,200,120,.30),transparent 72%),url(/themes/cups/table.jpg) center/360px;
  box-shadow:0 0 0 9px #3a1f0c,0 0 0 11px #120a04,0 0 0 12px rgba(255,208,122,.3),0 26px 60px rgba(0,0,0,.8),inset 0 0 70px rgba(20,8,2,.85)}
.go-table::after{content:'';position:absolute;inset:-2%;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle at 18% 30%,rgba(60,25,8,.35) 0 18px,transparent 19px),radial-gradient(circle at 78% 70%,rgba(60,25,8,.3) 0 14px,transparent 15px)}
.go-slate{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 18px 12px;border-radius:10px;color:#f4f1ea;
  background:radial-gradient(120% 100% at 40% 30%,#4a4f52,#26292b 70%);box-shadow:0 0 0 6px #6b4422,0 0 0 8px #2a1608,0 10px 20px rgba(0,0,0,.6),inset 0 0 20px rgba(0,0,0,.5)}
.go-slate .chalk{font-family:'IM Fell English',Georgia,serif;font-style:italic;color:#f4f1ea;text-shadow:0 0 1px rgba(255,255,255,.6)}
.go-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;text-align:center}
.go-mug{position:relative;display:inline-block;flex:none;align-self:center;border-radius:50%;background:radial-gradient(circle at 40% 30%,#7a5030,#2a1508);box-shadow:0 0 0 2px #c58b3f,0 0 0 4px #2a1508,0 6px 10px rgba(0,0,0,.6)}
.go-seat.is-active .go-mug{box-shadow:0 0 0 2px #ffe0a0,0 0 0 4px #8a5a12,0 0 18px rgba(255,200,100,.9)}
.go-seat.is-out .go-mug{filter:grayscale(1)}
.go-seat.is-active .go-cup{filter:drop-shadow(0 0 12px rgba(255,200,100,.95)) drop-shadow(0 6px 6px rgba(0,0,0,.6))}
.go-seat.is-out{opacity:.45}
.go-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:7px;
  background:linear-gradient(180deg,rgba(40,20,8,.94),rgba(14,6,2,.96));border:1px solid rgba(255,208,122,.35);box-shadow:0 3px 8px rgba(0,0,0,.5)}
.go-name{font-family:'Pirata One',serif;font-size:16px;line-height:1.1;color:#f6e7cc;overflow:hidden;text-overflow:ellipsis}
.go-tag{font-size:11px;color:#ffd07a;flex:none}
.go-seat.is-me .go-plate{border-color:#ffd07a}
.go-bubble{position:relative;display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:8px;font-size:13px;color:#f4f1ea;background:#2e3234;box-shadow:0 0 0 1.5px #6b4422,0 2px 4px rgba(0,0,0,.5)}
.go-chip{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:12px;line-height:1.35;padding:0 8px;border-radius:999px;border:1px solid;background:rgba(14,6,2,.92);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.tone-gold{color:#1d1206;border-color:#6d4b12;background:linear-gradient(180deg,#ffe3a0,#e0a840)}.tone-red{color:#fff;border-color:#ff8a7a;background:#8e1b14}
.tone-green{color:#062a14;border-color:#1f7a46;background:#9ff0bd}.tone-dim{color:#d9c3a0;border-color:rgba(200,160,110,.45)}

/* Panneaux, boutons */
.go-dock{position:relative;color:#2a1a0c;border-radius:12px;padding:18px 16px 16px;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.35)),url(/themes/compass/parchment.jpg) center/320px;
  box-shadow:0 18px 34px rgba(0,0,0,.6),inset 0 0 46px rgba(120,75,25,.45),0 0 0 2px #3a1f0c;animation:go-up .35s ease-out}
@keyframes go-up{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.go-dock h4{font-family:'Pirata One',serif;font-size:1.55rem;color:#5a1a0e;text-align:center;line-height:1.1}
.go-dock .muted{color:#6b4f2a}
.go-mycup{position:relative;border-radius:14px;padding:14px;color:#f6e7cc;
  background:linear-gradient(180deg,rgba(255,215,160,.10),rgba(0,0,0,.5)),url(/themes/cups/felt.jpg) center/260px;box-shadow:inset 0 0 0 2px rgba(255,208,122,.3),inset 0 0 40px rgba(0,0,0,.6),0 12px 26px rgba(0,0,0,.55)}
.go-btn{font-family:'Pirata One',serif;font-size:1.3rem;letter-spacing:.02em;border-radius:12px;padding:.5rem 1.3rem;color:#2a1505;
  border:1px solid #5e3f12;background:linear-gradient(180deg,#f9e19a,#d9a440 52%,#a8741f);text-shadow:0 1px 0 rgba(255,240,200,.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.65),0 3px 0 #5e3f12,0 8px 16px rgba(0,0,0,.35);transition:transform .1s,filter .1s}
.go-btn:hover{filter:brightness(1.07)}.go-btn:active{transform:translateY(2px)}.go-btn:disabled{opacity:.45;filter:grayscale(.5);cursor:not-allowed}
.go-btn.liar{color:#fff;border-color:#3d0604;background:linear-gradient(180deg,#e0574a,#9c1b14 55%,#5e0c08);text-shadow:0 1px 0 rgba(0,0,0,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #3d0604,0 8px 16px rgba(0,0,0,.35)}
.go-btn.exact{color:#062a14;border-color:#1f5a32;background:linear-gradient(180deg,#d9ffe0,#7ee08f 55%,#3f9f5a);text-shadow:none;box-shadow:inset 0 1px 0 #fff,0 3px 0 #1f5a32,0 8px 16px rgba(0,0,0,.35)}
.go-btn2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:1.05rem;border-radius:10px;padding:.55rem 1.1rem;color:#3a2410;border:1px solid #8b6a33;background:rgba(255,250,235,.55)}
.go-face{border-radius:12px;padding:4px;transition:transform .12s}
.go-face:hover:not(:disabled){transform:translateY(-3px)}
.go-face[aria-checked=true]{background:rgba(90,26,14,.15);box-shadow:0 0 0 2px #5a1a0e}
.go-face:disabled{opacity:.25}
.go-step{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;font-size:1.4rem;font-weight:700;color:#2a1505;background:radial-gradient(circle at 35% 30%,#fff2cf,#d9a440);box-shadow:0 2px 0 #5e3f12}
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
@media (prefers-reduced-motion:reduce){.go *{animation:none!important;transition:none!important}.go-banner{animation:go-fade .2s both!important}}
@keyframes go-fade{from{opacity:0}to{opacity:1}}
`;
