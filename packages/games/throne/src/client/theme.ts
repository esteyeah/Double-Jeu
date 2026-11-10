/** Décor du Trône Vide : salle du Conseil aux chandelles, pierre, chêne, velours, parchemin et cire. */
export const THRONE_CSS = `
@font-face{font-family:'Tv Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.tv{position:relative;min-height:100dvh;color:#efe3c8;font-family:'Tv Digits','Cormorant Garamond','IM Fell English',Georgia,serif;font-weight:500;font-size:17px;
  background:#0d0906;overflow:hidden;overflow:clip;isolation:isolate}
.tv-wall{position:absolute;inset:0;z-index:-3;background:radial-gradient(70% 45% at 50% 0%,rgba(120,80,40,.45),transparent 70%),linear-gradient(180deg,#1a120b,#0b0705 75%)}
.tv-wall::before{content:'';position:absolute;inset:0;background:url(/themes/throne/wall.jpg) center top/520px;opacity:.38;mix-blend-mode:luminosity;filter:contrast(1.1)}
.tv-wall::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(115deg,transparent 18%,rgba(170,200,255,.07) 24%,transparent 34%),linear-gradient(65deg,transparent 64%,rgba(170,200,255,.07) 72%,transparent 80%)}
.tv-motes{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.tv-motes i{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#ffe7b0;box-shadow:0 0 8px 2px rgba(255,200,120,.55);opacity:0;animation:tv-mote 16s linear infinite}
.tv-motes i:nth-child(2n){width:2.5px;height:2.5px}
@keyframes tv-mote{0%{transform:translate(0,0);opacity:0}15%{opacity:.7}50%{transform:translate(-30px,-50vh)}85%{opacity:.35}100%{transform:translate(10px,-104vh);opacity:0}}
.tv-pennant{position:absolute;top:-8px;width:clamp(70px,8vw,98px);aspect-ratio:1/2;filter:drop-shadow(0 12px 14px rgba(0,0,0,.7));transform-origin:50% 0;animation:tv-sway 7s ease-in-out infinite}
.tv-pennant.is-left{left:clamp(8px,13vw,240px)}.tv-pennant.is-right{right:clamp(8px,13vw,240px);animation-delay:-3.5s}
.tv-pennant .emb{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
@keyframes tv-sway{50%{transform:rotate(.8deg) skewX(.6deg)}}
.tv-anger{padding:4px 14px;border-radius:999px;background:linear-gradient(180deg,rgba(30,18,8,.72),rgba(10,6,3,.78));border:1px solid rgba(233,196,106,.25);box-shadow:0 6px 16px rgba(0,0,0,.45);backdrop-filter:blur(6px)}
.tv-light{position:absolute;inset:0;z-index:-2;pointer-events:none;animation:tv-flicker 5s ease-in-out infinite;
  background:radial-gradient(46% 32% at 50% 10%,rgba(255,184,96,.30),transparent 70%),radial-gradient(55% 45% at 50% 62%,rgba(255,160,70,.16),transparent 72%),
    radial-gradient(28% 40% at 4% 40%,rgba(255,150,60,.14),transparent 70%),radial-gradient(28% 40% at 96% 40%,rgba(255,150,60,.14),transparent 70%),
    radial-gradient(140% 100% at 50% 30%,transparent 45%,rgba(0,0,0,.86) 100%)}
@keyframes tv-flicker{0%,100%{opacity:1}38%{opacity:.88}42%{opacity:.97}70%{opacity:.9}}
.tv-title{font-family:'Cinzel','Cormorant Garamond',serif;font-weight:700;letter-spacing:.06em}
.tv-gold{background:linear-gradient(180deg,#fff4cf 0%,#f0cd6e 40%,#a8731c 70%,#f5d98d 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 rgba(20,10,2,.95)) drop-shadow(0 6px 12px rgba(0,0,0,.6))}
.tv-num{font-family:'Cinzel',serif;font-weight:700}

/* Bannières de velours et pistes d'édits */
.tv-track{position:relative;padding:10px 12px 12px;border-radius:14px;color:#f6e7c4;border:2px solid transparent;
  box-shadow:inset 0 0 0 4px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.12),0 16px 32px rgba(0,0,0,.65),0 0 0 1px #1a0f05}
.tv-track::before{content:'';position:absolute;inset:5px;border-radius:10px;border:1px dashed rgba(240,205,110,.35);pointer-events:none}
.tv-track.crown{background:radial-gradient(90% 120% at 50% 0%,rgba(120,160,255,.28),transparent 60%) padding-box,linear-gradient(180deg,rgba(40,80,170,.80),rgba(10,24,72,.94)) padding-box,url(/themes/throne/velvet.jpg) center/240px padding-box,linear-gradient(135deg,#fff2bf,#c99b3a 30%,#6d4b12 55%,#f0cd6e 80%,#8a6418) border-box}
.tv-track.shadow{background:radial-gradient(90% 120% at 50% 0%,rgba(255,110,90,.22),transparent 60%) padding-box,linear-gradient(180deg,rgba(130,16,12,.62),rgba(32,3,2,.92)) padding-box,url(/themes/throne/velvet.jpg) center/240px padding-box,linear-gradient(135deg,#fff2bf,#c99b3a 30%,#6d4b12 55%,#f0cd6e 80%,#8a6418) border-box}
.tv-track-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.tv-slots{display:grid;gap:6px}
.tv-slot{position:relative;height:84px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:2px;
  background:radial-gradient(80% 70% at 50% 40%,rgba(255,255,255,.06),transparent 70%),rgba(0,0,0,.42);box-shadow:inset 0 3px 9px rgba(0,0,0,.9),inset 0 0 0 1px rgba(233,196,106,.28),0 1px 0 rgba(255,255,255,.08);
  color:rgba(246,231,196,.66);font-size:10.5px;line-height:1.05;text-align:center}
.tv-slot > :first-child:not(.mark){opacity:.85}
.tv-slot.goal{box-shadow:inset 0 2px 7px rgba(0,0,0,.85),inset 0 0 0 1.5px rgba(233,196,106,.7)}
.tv-slot.filled{background:radial-gradient(120% 90% at 50% 30%,#fbf1d6,rgba(250,240,210,0) 70%),url(/themes/throne/parchment.jpg) center/160px;
  box-shadow:0 3px 7px rgba(0,0,0,.6),inset 0 0 12px rgba(120,75,25,.45);animation:tv-enact .8s cubic-bezier(.2,1.4,.4,1)}
@keyframes tv-enact{0%{transform:translateY(-30px) scale(1.4);opacity:0}60%{opacity:1}100%{transform:none}}
.tv-slot .mark{position:absolute;top:-7px;right:-5px;font-size:9px;padding:0 4px;border-radius:5px;background:#5a0d08;color:#ffd7c9;border:1px solid #c0392b;letter-spacing:.04em}
.tv-seal{display:grid;place-items:center;flex:none;border-radius:47% 53% 50% 50% / 52% 48% 52% 48%;
  box-shadow:0 2px 4px rgba(0,0,0,.6),inset 0 -2px 4px rgba(0,0,0,.4),inset 0 2px 3px rgba(255,255,255,.3)}
.tv-seal.crown{background:radial-gradient(circle at 36% 30%,#7fa6ee,#2a56b0 55%,#132d6b)}
.tv-seal.shadow{background:radial-gradient(circle at 36% 30%,#e0574a,#9c1b14 55%,#3e0604)}
.tv-seal.usurper{background:radial-gradient(circle at 36% 30%,#5a5a5a,#1e1e1e 55%,#050505)}
.tv-torch{display:inline-grid;place-items:center;width:30px;height:34px;border-radius:8px;filter:grayscale(1) brightness(.45)}
.tv-torch.lit{filter:none;animation:tv-burn 1.2s ease-in-out infinite}
@keyframes tv-burn{50%{filter:drop-shadow(0 -4px 8px rgba(255,140,40,.9))}}
.tv-throne{position:relative;display:grid;place-items:center}
.tv-throne::before{content:'';position:absolute;inset:-26px;border-radius:50%;background:radial-gradient(circle,rgba(255,205,120,.5),transparent 66%);animation:tv-flicker 4s ease-in-out infinite}
.tv-throne::after{content:'';position:absolute;inset:-70px;z-index:-1;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,215,140,.16) 0 5deg,transparent 5deg 15deg);
  -webkit-mask:radial-gradient(circle,#000 18%,transparent 68%);mask:radial-gradient(circle,#000 18%,transparent 68%);animation:tv-rays 80s linear infinite}
@keyframes tv-rays{to{transform:rotate(360deg)}}

@media (max-width:1023px){.tv-slot{height:46px;font-size:0;gap:0}.tv-slot .mark{font-size:9px}}

/* Étapes et consigne */
.tv-steps{display:flex;justify-content:center;flex-wrap:wrap;gap:5px;margin:12px 0 0;padding:0;list-style:none}
.tv-steps li{display:flex;align-items:center;gap:6px;padding:4px 11px 4px 4px;border-radius:999px;font-size:14px;color:#bba77f;background:rgba(10,6,3,.65);border:1px solid rgba(233,196,106,.2);white-space:nowrap}
.tv-steps .n{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#24170c;color:#a98d63}
.tv-steps li.done{opacity:.55}
.tv-steps li.now{color:#1d1206;background:linear-gradient(180deg,#fbe7a8,#d8a948);border-color:#6d4b12;font-weight:600;box-shadow:0 0 18px rgba(233,196,106,.5)}
.tv-steps li.now .n{background:#2a3f7a;color:#fbe7a8}
@media (max-width:639px){.tv-steps li:not(.now){padding:4px}.tv-steps li:not(.now) .t{display:none}}
.tv-call{display:flex;align-items:center;gap:12px;margin-top:10px;padding:9px 16px 9px 9px;border-radius:14px;color:#f3e5c3;font-size:1.13rem;line-height:1.3;
  background:linear-gradient(180deg,rgba(255,215,160,.10),rgba(0,0,0,.45)),url(/themes/throne/table.jpg) center/300px;border:1px solid #1a0e05;
  box-shadow:inset 0 0 0 1px rgba(233,196,106,.25),0 8px 18px rgba(0,0,0,.55)}
.tv-call .ic{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#4a6fc2,#1d3a80 60%,#0f2150);box-shadow:inset 0 -3px 0 rgba(0,0,0,.35),0 0 0 2px rgba(233,196,106,.6)}
.tv-call strong{color:#ffe3a0;font-weight:600}
.tv-call.is-mine{color:#fff0c8;animation:tv-callpulse 2.2s ease-in-out infinite}
@keyframes tv-callpulse{0%,100%{box-shadow:0 0 0 2px #b8892e,0 0 18px rgba(233,196,106,.35),0 8px 18px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 2px #f0cd6e,0 0 34px rgba(233,196,106,.7),0 8px 18px rgba(0,0,0,.5)}}

/* La table du Conseil */
.tv-table-under{position:absolute;inset:9% 7%;border-radius:50%;
  background:radial-gradient(58% 52% at 50% 44%,rgba(255,196,120,.30),transparent 72%),url(/themes/throne/table.jpg) center/420px;
  box-shadow:0 0 0 10px #3a2210,0 0 0 12px #140a03,0 0 0 13px rgba(233,196,106,.4),0 26px 60px rgba(0,0,0,.78),inset 0 0 80px rgba(18,8,2,.88)}
.tv-cloth{position:absolute;inset:13% 11%;border-radius:50%;
  background:radial-gradient(closest-side,rgba(255,190,110,.18),transparent 70%),repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,.035) 0 2px,transparent 2px 6px),radial-gradient(closest-side,#6e1410,#4a0a08 70%,#2a0504);
  box-shadow:0 0 0 2px #d8a948,0 0 0 5px #3a0806,0 0 0 6px rgba(240,205,110,.55),0 10px 24px rgba(0,0,0,.55),inset 0 0 40px rgba(0,0,0,.6)}
.tv-cloth::before{content:'';position:absolute;inset:7%;border-radius:50%;border:1.5px solid rgba(240,205,110,.55);box-shadow:0 0 0 5px rgba(240,205,110,.08),inset 0 0 0 4px rgba(0,0,0,.18)}
.tv-cloth::after{content:'';position:absolute;inset:24%;border-radius:50%;border:1px dashed rgba(240,205,110,.4)}
.tv-cloth .motif{position:absolute;transform:translate(-50%,-50%);opacity:.75;filter:drop-shadow(0 1px 1px rgba(0,0,0,.7))}
.tv-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;text-align:center;transition:transform .2s}
.tv-crest-wrap{position:relative;display:inline-block;filter:drop-shadow(0 5px 6px rgba(0,0,0,.75));transition:filter .2s}
.tv-frame{position:relative;display:block;border-radius:999px 999px 9px 9px;padding:4px;
  background:linear-gradient(145deg,#fff2bf 0%,#d8a948 22%,#6d4b12 48%,#f0cd6e 70%,#8a6418 100%);
  box-shadow:0 0 0 1px #241404,inset 0 0 0 1px rgba(255,240,190,.55)}
.tv-canvas{position:absolute;inset:4px;overflow:hidden;border-radius:999px 999px 6px 6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 -14px 18px rgba(0,0,0,.35)}
.tv-canvas::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(160deg,rgba(255,255,255,.22),transparent 38%),radial-gradient(120% 90% at 50% 40%,transparent 55%,rgba(20,10,2,.5));mix-blend-mode:soft-light}
.tv-sitter{position:absolute!important;left:50%;bottom:-4%;transform:translateX(-50%)}
.tv-blazon{position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:grid;place-items:center;z-index:1;
  clip-path:polygon(0 0,100% 0,100% 62%,50% 100%,0 62%);box-shadow:inset 0 0 0 2px rgba(240,205,110,.9)}
.tv-seat.is-regent .tv-crest-wrap{filter:drop-shadow(0 0 2px #f0cd6e) drop-shadow(0 0 12px rgba(240,205,110,.9))}
.tv-seat.is-nominee .tv-crest-wrap{filter:drop-shadow(0 0 2px #9fc0ff) drop-shadow(0 0 12px rgba(130,170,255,.85))}
.tv-seat.is-picked .tv-crest-wrap{filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 14px rgba(255,236,170,1))}
.tv-seat.is-dead{opacity:.55}.tv-seat.is-dead .tv-canvas{filter:grayscale(1) sepia(.35) brightness(.7)}
.tv-seat-plate{display:flex;align-items:baseline;justify-content:center;gap:4px;max-width:150px;white-space:nowrap;padding:1px 8px 2px;border-radius:7px;
  background:linear-gradient(180deg,rgba(40,24,10,.94),rgba(14,8,3,.96));border:1px solid rgba(233,196,106,.32);box-shadow:0 3px 8px rgba(0,0,0,.5)}
.tv-seat-name{font-family:'Cinzel',serif;font-weight:700;font-size:13px;line-height:1.2;color:#f6e7c4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tv-seat-tag{font-size:11px;color:#a9c4ff;flex:none}
.tv-seat.is-me .tv-seat-plate{border-color:rgba(169,196,255,.75)}
.tv-token{position:absolute;display:grid;place-items:center;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,.7),0 0 0 2px rgba(233,196,106,.75)}
.tv-chip{position:absolute;top:-13px;left:50%;transform:translateX(-50%);z-index:2;white-space:nowrap;font-size:12px;line-height:1.35;padding:0 8px;border-radius:999px;
  border:1px solid;background:rgba(12,7,3,.92);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.tone-green{color:#cdeab3;border-color:rgba(130,180,100,.7)}.tone-dim{color:#cdb48a;border-color:rgba(168,138,92,.45)}
.tone-red{color:#fff;border-color:#ff8a7a;background:#7d150f}.tone-gold{color:#1d1206;border-color:#6d4b12;background:linear-gradient(180deg,#fbe7a8,#d8a948)}
.tv-ballot-chip{font-family:'Cinzel',serif;font-weight:700;font-size:11px;letter-spacing:.06em;padding:1px 8px;border-radius:999px;text-transform:uppercase}
.tv-ballot-chip.yes{color:#20140a;background:linear-gradient(180deg,#f8e7a8,#c9a043);box-shadow:0 0 0 1px #6d4b12}
.tv-ballot-chip.no{color:#ffe9e4;background:linear-gradient(180deg,#b6352a,#6b0e09);box-shadow:0 0 0 1px #2a0503}
.tv-role{font-family:'Cinzel',serif;font-weight:700;font-size:10.5px;letter-spacing:.05em;padding:0 6px;border-radius:4px;text-transform:uppercase}
.tv-role.crown{color:#dbe6ff;background:#1f3f86;box-shadow:0 0 0 1px #9db8f2}
.tv-role.shadow{color:#ffe1db;background:#7a120c;box-shadow:0 0 0 1px #e46a5e}
button.tv-seat{cursor:pointer}
button.tv-seat:hover{transform:translateY(-3px)}
button.tv-seat .tv-crest-wrap{animation:tv-pickable 1.6s ease-in-out infinite}
@keyframes tv-pickable{50%{filter:drop-shadow(0 0 8px rgba(255,236,170,.9))}}

/* Lettre de cachet (rôle secret) et parchemins d'action */
.tv-letter,.tv-dock{position:relative;color:#2a1a0c;border-radius:6px;padding:20px 16px 16px;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.38)),url(/themes/throne/parchment.jpg) center/320px;
  box-shadow:0 18px 34px rgba(0,0,0,.6),inset 0 0 46px rgba(120,75,25,.5),0 0 0 1px rgba(80,50,15,.6)}
.tv-dock{animation:tv-rise .35s ease-out}
@keyframes tv-rise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
.tv-letter .muted,.tv-dock .muted{color:#6b4f2a}
.tv-dock h4,.tv-letter h4{font-family:'Cinzel',serif;font-weight:700;color:#4a1a10;font-size:1.25rem;letter-spacing:.03em;text-align:center}
.tv-btn{font-family:'Cinzel',serif;font-weight:700;letter-spacing:.06em;font-size:.95rem;border-radius:10px;padding:.7rem 1.3rem;color:#22150a;
  border:1px solid #6d4b12;background:linear-gradient(180deg,#fff0bf,#e2b452 50%,#a8761d);text-shadow:0 1px 0 rgba(255,240,200,.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 3px 0 #5e3f0e,0 8px 16px rgba(0,0,0,.35);transition:transform .1s,filter .1s}
.tv-btn:hover{filter:brightness(1.06)}.tv-btn:active{transform:translateY(2px)}
.tv-btn:disabled{opacity:.45;filter:grayscale(.5);cursor:not-allowed}
.tv-btn.danger{color:#ffeae4;border-color:#3d0604;background:linear-gradient(180deg,#d9574a,#9c1b14 55%,#5e0c08);text-shadow:0 1px 0 rgba(0,0,0,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #3d0604,0 8px 16px rgba(0,0,0,.35)}
.tv-btn2{font-family:'Cinzel',serif;font-weight:700;letter-spacing:.05em;font-size:.85rem;border-radius:10px;padding:.6rem 1.1rem;color:#3a2410;border:1px solid #8b6a33;background:rgba(255,250,235,.5)}
.tv-btn2:hover{background:rgba(255,250,235,.85)}
.tv-pick{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 6px;border-radius:12px;transition:transform .15s,background .15s}
.tv-pick:hover{transform:translateY(-2px)}
.tv-pick[aria-checked=true]{background:rgba(42,63,122,.16);box-shadow:0 0 0 2px #2a3f7a}
.tv-ballot{position:relative;flex:1 1 0;max-width:170px;aspect-ratio:4/5;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  background:radial-gradient(120% 90% at 50% 30%,#fff9e8,rgba(255,250,235,0) 70%),url(/themes/throne/parchment.jpg) center/240px;
  box-shadow:inset 0 1px 0 #fff,0 0 0 1px #8b6a33,0 10px 20px rgba(0,0,0,.4);transition:transform .2s cubic-bezier(.3,1.4,.5,1)}
.tv-ballot:hover{transform:translateY(-6px) rotate(-1.5deg)}
.tv-ballot::before{content:'';position:absolute;inset:7px;border:1.5px solid #8b6a33;border-radius:8px;pointer-events:none}
.tv-ballot .word{font-family:'Cinzel',serif;font-weight:700;font-size:2rem;line-height:1}
.tv-edict{position:relative;width:96px;aspect-ratio:3/4;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px;
  background:radial-gradient(120% 90% at 50% 30%,#fff9e8,rgba(255,250,235,0) 70%),url(/themes/throne/parchment.jpg) center/200px;color:#2a1a0c;
  box-shadow:inset 0 1px 0 #fff,0 0 0 1px #8b6a33,0 8px 16px rgba(0,0,0,.4);transition:transform .2s cubic-bezier(.3,1.4,.5,1),box-shadow .2s;animation:tv-unroll .45s ease-out}
@keyframes tv-unroll{from{transform:scaleY(.2);opacity:0}to{transform:none;opacity:1}}
button[aria-pressed=true] > .tv-edict{transform:translateY(-10px);box-shadow:0 0 0 3px #2a3f7a,0 18px 28px rgba(0,0,0,.45)}
.tv-edict .lbl{font-family:'Cinzel',serif;font-weight:700;font-size:11.5px;line-height:1.1;text-align:center}
.tv-facedown{width:46px;aspect-ratio:3/4;border-radius:6px;background:linear-gradient(135deg,#5a3a1a,#2a1708);box-shadow:inset 0 0 0 2px rgba(233,196,106,.45),0 4px 8px rgba(0,0,0,.6)}

/* Annonces */
.tv-banner{position:relative;isolation:isolate;width:min(780px,100%);padding:22px 12px 20px;text-align:center;animation:tv-banner 2s cubic-bezier(.2,.8,.2,1) both}
.tv-banner::before{content:'';position:absolute;inset:0 -40vw;z-index:-1;background:linear-gradient(90deg,transparent,rgba(10,6,3,.9) 22%,rgba(10,6,3,.9) 78%,transparent);
  border-top:1px solid rgba(233,196,106,.45);border-bottom:1px solid rgba(233,196,106,.45)}
.tv-banner .k{font-size:13px;letter-spacing:.42em;text-transform:uppercase;color:#d9c08a;font-family:'Cinzel',serif}
.tv-banner .s{margin-top:8px;color:#f1e3c2;font-style:italic;font-size:1.15rem}
@keyframes tv-banner{0%{opacity:0;transform:scale(1.1)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
.tv-scroll{position:relative;width:min(340px,86vw);padding:30px 24px 26px;text-align:center;color:#2a1a0c;border-radius:6px;animation:tv-scroll 2.6s cubic-bezier(.2,.8,.2,1) both;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.4)),url(/themes/throne/parchment.jpg) center/300px;box-shadow:0 30px 70px rgba(0,0,0,.8),inset 0 0 50px rgba(120,75,25,.55)}
.tv-scroll::before,.tv-scroll::after{content:'';position:absolute;left:-12px;right:-12px;height:20px;border-radius:10px;
  background:linear-gradient(180deg,#e9d3a2,#b8915a 45%,#6e4c22 100%);box-shadow:0 3px 6px rgba(0,0,0,.5)}
.tv-scroll::before{top:-10px}.tv-scroll::after{bottom:-10px}
@keyframes tv-scroll{0%{opacity:0;transform:scaleY(.08)}14%{opacity:1;transform:scaleY(1)}82%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-14px)}}

/* Écrans communs */
.tv-ui-panel{position:relative;padding:30px 22px 24px;border-radius:6px;color:#2a1a0c;font-family:'Tv Digits','Cormorant Garamond',Georgia,serif;font-weight:500;
  background:radial-gradient(130% 100% at 50% 50%,transparent 55%,rgba(110,60,15,.42)),url(/themes/throne/parchment.jpg) center/320px;
  box-shadow:0 30px 70px rgba(0,0,0,.78),inset 0 0 50px rgba(120,75,25,.55),0 0 0 1px rgba(80,50,15,.6)}
.tv-ui-panel::before{content:'';position:absolute;inset:8px;border:1.5px solid rgba(120,80,25,.55);border-radius:4px;pointer-events:none}
.tv-ui-kicker{font-family:'Cinzel',serif;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:#7a2a14}
.tv-ui-title{font-family:'Cinzel',serif;font-weight:700;font-size:1.9rem;line-height:1.15;color:#3e1a0c}
.tv-ui-text{font-family:'Tv Digits','Cormorant Garamond',Georgia,serif;color:#4a3418;font-size:1.12rem}
.tv-hud{border-radius:50%;color:#f0cd6e;border:2px solid #a8761d;
  background:radial-gradient(circle at 50% 30%,rgba(255,210,140,.16),transparent 60%),linear-gradient(180deg,rgba(30,18,8,.6),rgba(8,4,2,.85)),url(/themes/throne/table.jpg) center/140px;
  box-shadow:inset 0 1px 0 rgba(255,230,170,.3),inset 0 0 0 2px #1d1206,0 4px 12px rgba(0,0,0,.6)}
.tv-hud:hover{color:#ffe3a0;border-color:#e9c46a}
.tv-ui-drawer{color:#efe3c8;font-family:'Tv Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:3px solid #6d4b12;
  background:linear-gradient(180deg,rgba(20,12,6,.9),rgba(8,5,2,.96)),url(/themes/throne/wall.jpg) center/360px;box-shadow:-20px 0 60px rgba(0,0,0,.65)}
.tv-ui-pill{font-family:'Tv Digits','Cormorant Garamond',Georgia,serif;font-size:14px;color:#2a1a0c;padding:6px 14px;border-radius:999px;
  background:url(/themes/throne/parchment.jpg) center/200px;border:1px solid #8b6a33;box-shadow:0 6px 16px rgba(0,0,0,.5)}
@media (prefers-reduced-motion:reduce){.tv *{animation:none!important;transition:none!important}.tv-banner,.tv-scroll{animation:tv-fade .2s both!important}}
@keyframes tv-fade{from{opacity:0}to{opacity:1}}
`;
