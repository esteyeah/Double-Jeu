/** Décor du Chaudron : antre d'alchimiste — pierre humide, lueurs vertes, étagères de fioles, grimoire. */
export const CAULDRON_CSS = `
@font-face{font-family:'Ch Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.ch{position:relative;min-height:100dvh;color:#e7efd9;font-family:'Ch Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;background:#070a08;overflow:hidden;overflow:clip;isolation:isolate}
.ch-stone{position:absolute;inset:0;z-index:-3;background:radial-gradient(120% 70% at 50% 0%,rgba(40,70,48,.55),transparent 60%),linear-gradient(180deg,#0b120d,#050806 70%)}
.ch-stone::before{content:'';position:absolute;inset:0;background:url(/themes/cauldron/stone.jpg) center top/520px;opacity:.32;filter:saturate(.6) contrast(1.15);mix-blend-mode:luminosity}
.ch-stone::after{content:'';position:absolute;left:8%;top:-10%;width:34%;height:120%;transform:skewX(-18deg);background:linear-gradient(180deg,rgba(190,255,210,.10),rgba(190,255,210,0) 70%);filter:blur(18px)}
.ch-motes{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.ch-motes i{position:absolute;bottom:-12px;width:5px;height:5px;border-radius:50%;background:#d6ffc4;box-shadow:0 0 10px 2px rgba(120,255,150,.7);opacity:0;animation:ch-mote 12s linear infinite}
.ch-motes i:nth-child(3n){width:3px;height:3px;background:#f2d9ff;box-shadow:0 0 8px 2px rgba(190,130,255,.6)}
@keyframes ch-mote{0%{transform:translate(0,0);opacity:0}12%{opacity:.85}50%{transform:translate(24px,-52vh)}88%{opacity:.5}100%{transform:translate(-12px,-104vh);opacity:0}}
.ch-glow{position:absolute;inset:0;z-index:-2;pointer-events:none;animation:ch-breathe 7s ease-in-out infinite;
  background:radial-gradient(50% 40% at 50% 58%,rgba(90,255,140,.22),transparent 70%),radial-gradient(30% 30% at 12% 20%,rgba(255,170,70,.18),transparent 70%),
    radial-gradient(30% 30% at 88% 22%,rgba(180,110,255,.16),transparent 70%),radial-gradient(140% 100% at 50% 35%,transparent 42%,rgba(0,0,0,.88) 100%)}
@keyframes ch-breathe{50%{opacity:.82}}
.ch-shelf{position:relative;display:flex;justify-content:center;align-items:flex-end;gap:clamp(4px,2vw,22px);padding:0 16px 6px;height:64px}
.ch-shelf::after{content:'';position:absolute;left:4%;right:4%;bottom:0;height:12px;border-radius:3px;
  background:linear-gradient(180deg,rgba(255,220,170,.18),rgba(0,0,0,.4)),url(/themes/cauldron/wood.jpg) 0 0/240px;box-shadow:0 8px 14px rgba(0,0,0,.7)}
.ch-shelf > span{filter:drop-shadow(0 4px 6px rgba(0,0,0,.8));animation:ch-sway 5s ease-in-out infinite}
@keyframes ch-sway{50%{transform:translateY(-1px)}}
.ch-title{font-family:'Uncial Antiqua','Cormorant Garamond',serif;letter-spacing:.02em}
.ch-green{color:#c9ffb8;text-shadow:0 0 10px rgba(110,255,140,.65),0 2px 0 rgba(0,0,0,.8)}
.ch-num{font-family:'Ch Digits',serif;font-weight:700}

/* L'alambic : force annoncée contre force visée */
.ch-glass{position:relative;border-radius:18px;background:linear-gradient(180deg,rgba(28,44,32,.62),rgba(8,14,10,.72));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  box-shadow:inset 0 1px 0 rgba(220,255,220,.18),inset 0 0 0 1px rgba(170,255,170,.16),0 14px 34px rgba(0,0,0,.55)}
.ch-gauge{position:relative;height:34px;border-radius:17px;overflow:hidden;
  background:linear-gradient(180deg,rgba(220,255,230,.12),rgba(255,255,255,.03) 45%,rgba(0,0,0,.4));
  box-shadow:inset 0 0 0 1.5px rgba(220,255,220,.42),inset 0 -6px 12px rgba(0,0,0,.55),0 0 0 4px #1a140a,0 0 0 6px #a88a4a,0 0 0 7px #3b2a14,0 10px 20px rgba(0,0,0,.6)}
.ch-gauge::after{content:'';position:absolute;left:14px;right:14px;top:4px;height:8px;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0));pointer-events:none;z-index:3}
.ch-gauge .fill{position:absolute;left:0;top:0;bottom:0;border-radius:17px;transition:width .9s cubic-bezier(.3,1.2,.5,1),background .6s}
.ch-gauge .fill::before{content:'';position:absolute;right:0;top:0;bottom:0;width:10px;border-radius:0 17px 17px 0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45))}
.ch-gauge .fill.brew{background:linear-gradient(180deg,#d8ffb8,#4fcf68 50%,#145a28);box-shadow:0 0 22px rgba(110,255,140,.75)}
.ch-gauge .fill.ready{background:linear-gradient(180deg,#fffbd0,#cde84a 50%,#5a8a12);box-shadow:0 0 24px rgba(230,255,120,.8)}
.ch-gauge .fill.poison{background:linear-gradient(180deg,#f0d2ff,#9b50e6 50%,#4a1d80);box-shadow:0 0 22px rgba(180,110,255,.7)}
.ch-gauge .fill::after{content:'';position:absolute;inset:0;background:radial-gradient(4px 4px at 20% 60%,rgba(255,255,255,.8),transparent),radial-gradient(3px 3px at 45% 35%,rgba(255,255,255,.7),transparent),radial-gradient(3px 3px at 70% 70%,rgba(255,255,255,.7),transparent),radial-gradient(2px 2px at 88% 40%,rgba(255,255,255,.7),transparent);animation:ch-fizz 2.4s linear infinite}
@keyframes ch-fizz{from{transform:translateY(10px)}to{transform:translateY(-10px)}}
.ch-gauge .mark{position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;z-index:4;border-radius:2px;background:linear-gradient(180deg,#fff2b8,#d8a948);box-shadow:0 0 10px #ffd27a,0 0 0 1px #3b2a14}
.ch-gauge .tick{position:absolute;top:9px;bottom:9px;width:1px;background:rgba(255,255,255,.22)}

/* Consigne */
.ch-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:14px;color:#e7efd9;font-size:1.13rem;line-height:1.3;
  background:linear-gradient(180deg,rgba(255,220,170,.10),rgba(0,0,0,.5)),url(/themes/cauldron/wood.jpg) 0 0/280px;border:1px solid #0e0a06;box-shadow:inset 0 0 0 1px rgba(170,255,170,.2),0 8px 18px rgba(0,0,0,.55)}
.ch-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a6b3f,#122916 70%);box-shadow:0 0 0 2px rgba(190,255,170,.55),0 0 14px rgba(110,255,140,.4)}
.ch-call strong{color:#c9ffb8;font-weight:600}
.ch-call.is-mine{animation:ch-pulse 2.2s ease-in-out infinite}
@keyframes ch-pulse{0%,100%{box-shadow:0 0 0 2px #3fbf5a,0 0 18px rgba(110,255,140,.35),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 2px #b6ff9e,0 0 34px rgba(110,255,140,.7),0 8px 18px rgba(0,0,0,.5)}}

/* L'antre : la guilde autour du chaudron */
.ch-floor{position:absolute;inset:7% 4%;border-radius:50%;color:#9dffb2;
  background:radial-gradient(34% 32% at 50% 50%,var(--brew-floor,rgba(90,255,140,.30)),transparent 72%),radial-gradient(closest-side,#18221b,#0c120e 72%,#060907);
  box-shadow:0 0 0 2px rgba(150,255,160,.18),0 30px 70px rgba(0,0,0,.85),inset 0 0 90px rgba(0,0,0,.9)}
.ch-floor::before{content:'';position:absolute;inset:0;border-radius:50%;background:url(/themes/cauldron/stone.jpg) center/260px;opacity:.22;mix-blend-mode:luminosity}
.ch-circle{position:absolute;inset:3%;width:94%;height:94%;opacity:.78;animation:ch-breathe 5s ease-in-out infinite}
.ch-spin{transform-origin:100px 100px;animation:ch-spin 140s linear infinite}
.ch-spin.rev{animation-duration:200s;animation-direction:reverse}
@keyframes ch-spin{to{transform:rotate(360deg)}}
.ch-pot{position:relative;display:grid;place-items:center}
.ch-pot::before{content:'';position:absolute;left:-10%;right:-10%;top:5%;bottom:30%;border-radius:50%;background:radial-gradient(circle,var(--brew,rgba(110,255,140,.55)),transparent 66%);animation:ch-breathe 2.6s ease-in-out infinite;transition:background .6s}
.ch-art{position:relative;filter:drop-shadow(0 14px 14px rgba(0,0,0,.75))}
.ch-flame{transform-box:fill-box;transform-origin:50% 100%;animation:ch-flick .7s ease-in-out infinite alternate}
@keyframes ch-flick{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(.92,1.12) skewX(3deg)}100%{transform:scale(1.05,.9) skewX(-3deg)}}
.ch-steam{transform-box:fill-box;transform-origin:50% 100%;animation:ch-steam 4.2s ease-in infinite;opacity:0}
@keyframes ch-steam{0%{transform:translateY(24px) scale(.6);opacity:0}30%{opacity:.9}100%{transform:translateY(-34px) scale(1.4);opacity:0}}
.ch-pop{transform-box:fill-box;transform-origin:center;animation:ch-pop 2.6s ease-in infinite;opacity:0}
@keyframes ch-pop{0%{transform:scale(.2);opacity:0}35%{transform:scale(1);opacity:1}70%{transform:scale(1.15);opacity:.95}78%{transform:scale(1.6);opacity:0}100%{opacity:0}}
.ch-splash{animation:ch-splash .7s ease-out}
@keyframes ch-splash{30%{transform:scale(1.12) rotate(-3deg)}100%{transform:none}}
.ch-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;text-align:center}
.ch-medal{position:relative;display:grid;place-items:center;border-radius:50%;box-shadow:inset 0 -5px 10px rgba(0,0,0,.5),inset 0 4px 8px rgba(255,255,255,.2),0 0 0 3px #a88a4a,0 0 0 5px #1a1208,0 6px 12px rgba(0,0,0,.7)}
.ch-emblem{position:absolute;right:-6%;bottom:-6%;z-index:2;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a2c14,#120c05);box-shadow:0 0 0 2px #a88a4a,0 3px 6px rgba(0,0,0,.7)}
.ch-seat.is-active .ch-medal{box-shadow:inset 0 -5px 10px rgba(0,0,0,.5),0 0 0 3px #b6ff9e,0 0 0 5px #1d6b33,0 0 24px rgba(110,255,140,.9)}
.ch-seat.is-out{opacity:.45}.ch-seat.is-out .ch-medal{filter:grayscale(1)}
.ch-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:7px;
  background:linear-gradient(180deg,rgba(26,20,10,.94),rgba(8,6,3,.96));border:1px solid rgba(170,255,170,.3);box-shadow:0 3px 8px rgba(0,0,0,.6)}
.ch-name{font-family:'Uncial Antiqua',serif;font-size:13px;line-height:1.3;color:#eef6dd;overflow:hidden;text-overflow:ellipsis}
.ch-tag{font-size:11px;color:#c9ffb8;flex:none}
.ch-seat.is-me .ch-plate{border-color:#c9ffb8}
.ch-chip{position:absolute;top:-30px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:12px;line-height:1.35;padding:0 8px;border-radius:999px;border:1px solid;background:rgba(8,10,6,.92);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.tone-green{color:#d5f7c2;border-color:rgba(130,220,120,.7)}.tone-dim{color:#c3cbb4;border-color:rgba(170,190,150,.45)}
.tone-red{color:#fff;border-color:#ff8a7a;background:#7d150f}.tone-gold{color:#0b1d0e;border-color:#3fbf5a;background:linear-gradient(180deg,#d9ffc9,#7ee08f)}
.ch-skull{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#1b1610;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
.ch-skull.on{background:radial-gradient(circle,#ff6a5a,#7d150f 70%);box-shadow:0 0 8px rgba(255,90,74,.8)}
.ch-role{font-family:'Uncial Antiqua',serif;font-size:10.5px;padding:0 6px;border-radius:4px}
.ch-role.alchemist{color:#dbffd0;background:#1d6b33;box-shadow:0 0 0 1px #8de29c}.ch-role.poisoner{color:#ffe1f7;background:#5b1a6b;box-shadow:0 0 0 1px #d58bff}
.ch-vote{font-size:11.5px;padding:0 7px;border-radius:999px;font-weight:700}
.ch-vote.yes{color:#0b1d0e;background:#9ff0bd}.ch-vote.no{color:#fff;background:#8e1b14}
button.ch-seat{cursor:pointer;transition:transform .15s}button.ch-seat:hover{transform:translateY(-3px)}

/* Grimoire : cartes, panneaux, boutons */
.ch-dock,.ch-page{position:relative;color:#2a1d0e;border-radius:6px;padding:18px 16px 16px;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(80,50,15,.35)),url(/themes/compass/parchment.jpg) center/320px;
  box-shadow:0 18px 34px rgba(0,0,0,.65),inset 0 0 46px rgba(90,60,20,.45),0 0 0 2px #3b2a14,0 0 0 4px #a88a4a}
.ch-dock{animation:ch-up .35s ease-out}
@keyframes ch-up{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.ch-dock h4,.ch-page h4{font-family:'Uncial Antiqua',serif;font-size:1.2rem;color:#1d4a26;text-align:center;line-height:1.25}
.ch-dock .muted,.ch-page .muted{color:#5f4a2a}
.ch-card{position:relative;flex:none;width:var(--w,104px);aspect-ratio:5/7;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 6px;text-align:center;color:#2a1d0e;
  background:radial-gradient(70% 42% at 50% 34%,color-mix(in srgb,var(--tint,#a87a14) 38%,transparent),transparent 72%),radial-gradient(120% 90% at 50% 30%,#fff9e8,rgba(255,250,235,0) 70%),url(/themes/compass/parchment.jpg) center/200px;
  box-shadow:inset 0 0 0 2px #a88a4a,inset 0 0 0 5px rgba(255,250,235,.6),inset 0 0 0 6px color-mix(in srgb,var(--tint,#a87a14) 60%,#5a4020),0 10px 20px rgba(0,0,0,.55);transition:transform .2s cubic-bezier(.3,1.4,.5,1)}
.ch-card::before{content:'';position:absolute;inset:7px;border-radius:7px;border:1px solid color-mix(in srgb,var(--tint,#a87a14) 45%,transparent);pointer-events:none}
.ch-card .v{font-family:'Ch Digits',serif;font-weight:700;font-size:1.6rem;line-height:1}
.ch-card .n{font-family:'Uncial Antiqua',serif;font-size:12px;line-height:1.1}
.ch-card .h{font-size:11.5px;line-height:1.15;color:#5f4a2a;font-style:italic}
button[aria-checked=true] > .ch-card{transform:translateY(-10px);box-shadow:inset 0 0 0 2px #1d6b33,0 0 0 3px #3fbf5a,0 0 18px rgba(110,255,140,.6),0 16px 26px rgba(0,0,0,.5)}
button:hover > .ch-card{transform:translateY(-5px)}
.ch-vial{display:inline-flex;align-items:center;gap:4px;padding:1px 8px 1px 3px;border-radius:999px;font-family:'Ch Digits',serif;font-weight:700;font-size:13px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.ch-btn{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:1.12rem;border-radius:10px;padding:.7rem 1.3rem;color:#0b1d0e;border:1px solid #1d6b33;
  background:linear-gradient(180deg,#eaffde,#8de29c 50%,#3fbf5a);box-shadow:inset 0 1px 0 #fff,0 3px 0 #1d4a26,0 8px 16px rgba(0,0,0,.35),0 0 14px rgba(110,255,140,.3);transition:transform .1s,filter .1s}
.ch-btn:hover{filter:brightness(1.06)}.ch-btn:active{transform:translateY(2px)}.ch-btn:disabled{opacity:.45;filter:grayscale(.6);cursor:not-allowed}
.ch-btn.danger{color:#fff;border-color:#3d0604;background:linear-gradient(180deg,#d9574a,#9c1b14 55%,#5e0c08);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #3d0604,0 8px 16px rgba(0,0,0,.35)}
.ch-btn2{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:1.02rem;border-radius:10px;padding:.6rem 1.1rem;color:#1d4a26;border:1px solid #6f8f5a;background:rgba(255,250,235,.6)}
.ch-btn2:hover{background:rgba(255,250,235,.95)}.ch-btn2:disabled{opacity:.4}
.ch-opt{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;border-radius:10px;border:1.5px solid rgba(120,90,40,.4);background:rgba(255,250,235,.55);min-width:0}
.ch-opt[aria-checked=true]{border-color:#1d6b33;background:#effff0;box-shadow:0 0 0 2px #3fbf5a}
.ch-pick{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px;border-radius:12px}
.ch-pick[aria-checked=true],.ch-pick[aria-pressed=true]{background:rgba(29,107,51,.14);box-shadow:0 0 0 2px #1d6b33}

/* Annonces */
.ch-banner{position:relative;isolation:isolate;width:min(780px,100%);padding:20px 12px 18px;text-align:center;animation:ch-banner 2s cubic-bezier(.2,.8,.2,1) both}
.ch-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(5,10,6,.9) 22%,rgba(5,10,6,.9) 78%,transparent);
  border-top:1px solid rgba(150,255,160,.4);border-bottom:1px solid rgba(150,255,160,.4)}
.ch-banner .k{font-family:'Uncial Antiqua',serif;font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#a8e3a0}
.ch-banner .s{margin-top:6px;color:#e7efd9;font-style:italic;font-size:1.15rem}
@keyframes ch-banner{0%{opacity:0;transform:scale(1.1)}12%{opacity:1;transform:none}82%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}

/* Écrans communs */
.ch-ui-panel{position:relative;padding:28px 22px 24px;border-radius:6px;color:#2a1d0e;font-family:'Ch Digits','Cormorant Garamond',Georgia,serif;font-weight:500;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(80,50,15,.38)),url(/themes/compass/parchment.jpg) center/320px;
  box-shadow:0 30px 70px rgba(0,0,0,.8),inset 0 0 50px rgba(90,60,20,.5),0 0 0 2px #3b2a14,0 0 0 4px #a88a4a}
.ch-ui-kicker{font-family:'Uncial Antiqua',serif;font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:#1d6b33}
.ch-ui-title{font-family:'Uncial Antiqua',serif;font-size:1.9rem;line-height:1.15;color:#1d3a20}
.ch-ui-text{font-family:'Ch Digits','Cormorant Garamond',Georgia,serif;color:#4a3a1c;font-size:1.12rem}
.ch-hud{border-radius:50%;color:#c9ffb8;border:2px solid #3fbf5a;background:radial-gradient(circle at 50% 30%,rgba(140,255,160,.25),transparent 60%),linear-gradient(180deg,#1d2a18,#070a06);
  box-shadow:0 0 12px rgba(110,255,140,.3),0 4px 12px rgba(0,0,0,.6)}
.ch-hud:hover{border-color:#b6ff9e;color:#fff}
.ch-ui-drawer{color:#e7efd9;font-family:'Ch Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:2px solid #3fbf5a;
  background:linear-gradient(180deg,rgba(10,14,8,.92),rgba(4,6,3,.97)),url(/themes/cauldron/stone.jpg) center/320px;box-shadow:-20px 0 60px rgba(0,0,0,.7)}
.ch-ui-pill{font-family:'Uncial Antiqua',serif;font-size:13px;color:#1d3a20;padding:6px 14px;border-radius:999px;background:#f3ead2;border:1.5px solid #3fbf5a;box-shadow:0 6px 16px rgba(0,0,0,.5)}
@media (prefers-reduced-motion:reduce){.ch *{animation:none!important;transition:none!important}.ch-banner{animation:ch-fade .2s both!important}}
@keyframes ch-fade{from{opacity:0}to{opacity:1}}
`;
