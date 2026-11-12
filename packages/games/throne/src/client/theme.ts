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

/* ───── Palais : salle du trône, interface en parchemin enluminé et cadres dorés art déco ───── */
.tv{font-family:'IM Fell English','Tv Digits',Georgia,serif;font-weight:400;font-size:17px;background:#0c0406}
.tv-wall{background:radial-gradient(55% 45% at 50% 22%,#5a1d14 0%,#2c0c0a 55%,#0c0406 100%)}
.tv-wall::before,.tv-wall::after{display:none}
.tv-light{background:radial-gradient(28% 26% at 50% 26%,rgba(255,196,110,.20),transparent 70%),radial-gradient(140% 100% at 50% 30%,transparent 52%,rgba(0,0,0,.8) 100%)}
.tv-title{font-family:'Cinzel Decorative','Cinzel',serif}
.tv-num{font-family:'Limelight','Cinzel',serif;font-weight:400}

/* La salle */
.tv-hall{position:absolute;inset:0;z-index:-2;pointer-events:none;overflow:hidden}
.tv-hall > span{position:absolute;display:block}
.tv-hall .damask{left:0;right:0;top:0;height:720px;background:radial-gradient(circle,rgba(240,190,110,.08) 0 3px,transparent 4px) 0 0/34px 34px,radial-gradient(circle,rgba(240,190,110,.05) 0 2px,transparent 3px) 17px 17px/34px 34px}
.tv-hall .win{top:150px;width:54px;height:170px;border-radius:27px 27px 0 0;border:4px solid #2a1a10;background:linear-gradient(180deg,#9cc0ff,#3a5ea8);opacity:.5}
.tv-hall .win.is-left{left:calc(50% - 300px)}.tv-hall .win.is-right{right:calc(50% - 300px)}
.tv-hall .shaft{top:180px;width:240px;height:620px;filter:blur(14px);background:linear-gradient(180deg,rgba(160,190,255,.2),transparent 85%)}
.tv-hall .shaft.is-left{left:calc(50% - 330px);clip-path:polygon(10% 0,30% 0,100% 100%,55% 100%)}
.tv-hall .shaft.is-right{right:calc(50% - 330px);clip-path:polygon(70% 0,90% 0,45% 100%,0 100%)}
.tv-hall .floor{left:-25%;right:-25%;top:700px;height:760px;transform:perspective(700px) rotateX(64deg);transform-origin:50% 0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='130' height='130'%3E%3Crect width='130' height='130' fill='%23241c18'/%3E%3Crect width='65' height='65' fill='%23a8977a'/%3E%3Crect x='65' y='65' width='65' height='65' fill='%23a8977a'/%3E%3C/svg%3E") 0 0/130px 130px}
.tv-hall .floor-shade{left:0;right:0;top:700px;bottom:0;background:linear-gradient(180deg,rgba(20,6,6,.62),rgba(10,4,6,.95) 50%)}
.tv-hall .carpet{left:0;right:0;top:700px;height:900px;background:linear-gradient(90deg,#c9973e 0 2%,#8e1712 2% 98%,#c9973e 98%);clip-path:polygon(44.5% 0,55.5% 0,76% 100%,24% 100%);opacity:.7}
.tv-hall .col{background:linear-gradient(90deg,#3a2e24,#d9cdb6 35%,#fffaf0 50%,#a8987e 75%,#2e241c)}
.tv-hall .col.is-right{background:linear-gradient(270deg,#3a2e24,#d9cdb6 35%,#fffaf0 50%,#a8987e 75%,#2e241c)}
.tv-hall .col.near{top:0;bottom:0;width:clamp(50px,6vw,110px)}
.tv-hall .col.near.is-left{left:1vw}.tv-hall .col.near.is-right{right:1vw}
.tv-hall .col.mid{top:80px;height:680px;width:clamp(36px,4.4vw,66px);opacity:.92}
.tv-hall .col.mid.is-left{left:calc(50% - 600px)}.tv-hall .col.mid.is-right{right:calc(50% - 600px)}
.tv-hall .col.far{top:170px;height:560px;width:40px;opacity:.78}
.tv-hall .col.far.is-left{left:calc(50% - 400px)}.tv-hall .col.far.is-right{right:calc(50% - 400px)}
.tv-hall .col i{position:absolute;left:-14%;right:-14%;height:22px;background:linear-gradient(180deg,#fff0bf,#c9973e 60%,#6d4b12)}
.tv-hall .col i.cap{top:-16px}.tv-hall .col i.base{bottom:-16px}
.tv-hall .banner{top:240px;width:70px;height:210px;filter:drop-shadow(0 10px 10px rgba(0,0,0,.6))}
.tv-hall .banner.is-left{left:calc(50% - 510px)}.tv-hall .banner.is-right{right:calc(50% - 510px)}
.tv-hall .banner .emb{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%)}
.tv-hall .chand{top:0;width:110px;height:120px}
.tv-hall .chand::before{content:'';position:absolute;left:54px;top:0;width:2px;height:62px;background:#c9973e}
.tv-hall .chand i{position:absolute;left:15px;top:58px;width:80px;height:18px;border-radius:50%;border:3px solid #e2ad44;box-shadow:0 0 34px 16px rgba(255,210,130,.26)}
.tv-hall .chand.is-left{left:calc(50% - 420px)}.tv-hall .chand.is-right{right:calc(50% - 420px)}

/* Le trône sur son estrade */
.tv-stage{position:relative;width:440px;height:422px;margin:6px auto 0;transform-origin:50% 0;pointer-events:none}
.tv-stage > *{position:absolute;display:block}
.tv-stage .tapestry{left:70px;top:32px;width:300px;height:360px;box-shadow:0 0 30px rgba(0,0,0,.6)}
.tv-stage .halo{left:90px;top:54px;width:260px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(255,210,130,.5),transparent 65%);animation:tv-flicker 5s ease-in-out infinite}
.tv-stage .curtain{top:24px;width:92px;height:380px;background:repeating-linear-gradient(90deg,#4a0a08 0,#b8261e 10px,#7a120e 20px,#c42e24 28px,#4a0a08 36px)}
.tv-stage .curtain.is-left{left:30px;clip-path:polygon(0 0,100% 0,62% 55%,82% 100%,0 100%)}
.tv-stage .curtain.is-right{right:30px;clip-path:polygon(0 0,100% 0,100% 100%,18% 100%,38% 55%)}
.tv-stage .valance{left:20px;top:0;width:400px;height:80px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.6))}
.tv-stage .step{border-top:3px solid #e2ad44}
.tv-stage .s1{left:60px;top:354px;width:320px;height:22px;background:linear-gradient(180deg,#8e1712,#4a0a08)}
.tv-stage .s2{left:30px;top:376px;width:380px;height:22px;background:linear-gradient(180deg,#e9dfcc,#9a8a70)}
.tv-stage .s3{left:0;top:398px;width:440px;height:24px;background:linear-gradient(180deg,#d9ccb2,#7a6a52)}
.tv-stage .throne{left:100px;top:28px;width:240px;height:330px;filter:drop-shadow(0 0 22px rgba(255,190,90,.45)) drop-shadow(0 14px 12px rgba(0,0,0,.75))}
.tv-court-table{position:relative;z-index:1;margin-top:-150px}
@media (min-width:1024px){.tv-stage{transform:scale(.78);margin-bottom:-93px}}

/* Cadre commun : parchemin enluminé dans un double filet doré */
.tv-cartouche,.tv .tv-track,.tv .tv-call,.tv-letter,.tv-dock,.tv-ui-panel,.tv-chron,.tv .tv-steps.is-vertical{
  border-radius:0;color:#2b1a10;background:radial-gradient(120% 100% at 50% 40%,#fbf1d8,#ead8ae);
  border:2px solid #c9973e;outline:1px solid #c9973e;outline-offset:3px;box-shadow:0 16px 30px rgba(0,0,0,.6);backdrop-filter:none;-webkit-backdrop-filter:none}

/* En-tête */
.tv-head{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:start;gap:22px;width:min(1500px,calc(100% - 12px));margin:0 auto}
.tv-head-mid{display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:4px}
.tv-cartouche{display:flex;align-items:center;gap:4px;padding:8px 22px 8px 10px}
.tv-cartouche .lettrine{width:54px;height:54px;display:grid;place-items:center;background:radial-gradient(circle at 30% 30%,#3f6fd0,#1b3a8f 65%,#0f2259);border:2px solid #d9ad4c;box-shadow:inset 0 0 0 2px #f6e2a4;
  font-family:'Cinzel Decorative',serif;font-weight:900;font-size:40px;line-height:1;color:#f3d27a;text-shadow:0 2px 0 #6e4a10}
.tv-cartouche .rest{font-family:'UnifrakturMaguntia',serif;font-size:48px;line-height:1;color:#2b1a10;white-space:nowrap}
.tv-cartouche.is-small{padding:5px 12px 5px 6px}
.tv-cartouche.is-small .lettrine{width:38px;height:38px;font-size:28px}
.tv-cartouche.is-small .rest{font-size:31px}
.tv .tv-anger{display:flex;align-items:center;gap:10px;padding:5px 16px;border-radius:0;font-family:'Marcellus SC',serif;font-weight:400;font-size:14px;letter-spacing:.12em;color:#f1dca6;
  background:rgba(12,5,4,.75);border:1px solid rgba(201,151,62,.5);box-shadow:0 6px 16px rgba(0,0,0,.5)}

/* Pistes d'édits : cartes dans le parchemin */
.tv .tv-track{padding:12px 14px 14px}
.tv .tv-track::before{display:none}
.tv-track-head .lbl{font-family:'Marcellus SC',serif;font-size:17px;letter-spacing:.14em}
.tv-track-head .cnt{font-family:'Limelight',serif;font-size:17px}
.tv-track.crown .tv-track-head{color:#1b3a8f}.tv-track.shadow .tv-track-head{color:#9b1c12}
.tv .tv-slots{gap:7px}
.tv .tv-slot{height:76px;border-radius:0;gap:3px;background:transparent;box-shadow:none;font-size:11px;color:#1b3a8f;
  border:1px solid rgba(27,58,143,.45);outline:1px dashed rgba(27,58,143,.3);outline-offset:-5px}
.tv .tv-track.shadow .tv-slot{color:#7a1a10;border-color:rgba(155,28,18,.45);outline-color:rgba(155,28,18,.3)}
.tv .tv-slot > :first-child:not(.mark){opacity:1}
.tv-slot .numeral{font-family:'Limelight',serif;font-size:17px;line-height:1;opacity:.6}
.tv-slot .lbl{font-style:italic;font-size:11.5px;line-height:1.05}
.tv .tv-slot.goal{outline:0;border:2px solid currentColor;background:repeating-linear-gradient(45deg,rgba(27,58,143,.09) 0 5px,transparent 5px 10px)}
.tv .tv-track.shadow .tv-slot.goal{background:repeating-linear-gradient(45deg,rgba(155,28,18,.09) 0 5px,transparent 5px 10px)}
.tv .tv-slot.goal .lbl{font-family:'Marcellus SC',serif;font-style:normal;font-size:11px;letter-spacing:.06em}
.tv .tv-track.crown .tv-slot.filled{outline:0;border:2px solid #6e4a10;color:#1b3a8f;background:linear-gradient(135deg,#fff0b8,#e2b24a 40%,#a8761d 70%,#f0cf72);box-shadow:inset 0 0 0 3px rgba(255,255,255,.4)}
.tv .tv-track.shadow .tv-slot.filled{outline:0;border:2px solid #3e0604;color:#f3d27a;background:radial-gradient(circle at 40% 30%,#e0503a,#a3201a 60%,#6e0f0a);box-shadow:inset 0 0 0 3px rgba(240,205,110,.6)}
.tv-slot .emblem{filter:drop-shadow(0 1px 1px rgba(0,0,0,.4));animation:tv-stamp .7s .3s cubic-bezier(.2,1.6,.4,1) both}
@keyframes tv-stamp{0%{transform:scale(2.4) rotate(-20deg);opacity:0}60%{opacity:1}100%{transform:none}}
.tv .tv-slot .mark{border-radius:0;font-family:'Marcellus SC',serif;letter-spacing:.06em}
.tv-track .warn{margin-top:8px;text-align:center;font-style:italic;font-size:14px;color:#9b1c12}

/* Étapes du tour (losanges) */
.tv .tv-steps li{font-family:'Marcellus SC',serif;font-weight:400;letter-spacing:.08em;color:#f1dca6;background:rgba(12,5,4,.75);border:1px solid rgba(201,151,62,.45);border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none;gap:10px;padding:4px 12px 4px 8px}
.tv .tv-steps .n{width:22px;height:22px;border-radius:0;transform:rotate(45deg);background:transparent;border:1px solid #c9973e;color:#e9c46a}
.tv .tv-steps .n > svg{transform:rotate(-45deg)}
.tv .tv-steps li.now{color:#f6e2a4;background:linear-gradient(90deg,#1b3a8f,#2f5fb3);border-color:#c9973e;box-shadow:0 0 18px rgba(80,120,230,.45);font-weight:400}
.tv .tv-steps li.now .n{background:#e9c46a;color:#1b3a8f;border-color:#e9c46a}
.tv .tv-steps.is-vertical{flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px;margin:0;padding:14px}
.tv .tv-steps.is-vertical li{background:transparent;border:0;color:#4a3218;box-shadow:none;font-size:15px}
.tv .tv-steps.is-vertical li .n{border-color:#b8892e;color:#8a6a2a}
.tv .tv-steps.is-vertical li.now{color:#f6e2a4;background:linear-gradient(90deg,#1b3a8f,#2f5fb3);margin:0 -4px;box-shadow:0 4px 10px rgba(27,58,143,.35)}
.tv .tv-steps.is-vertical li.now .n{border-color:#e9c46a;color:#1b3a8f}
.tv .tv-steps.is-vertical li.done{opacity:.45}

/* Consigne */
.tv .tv-call{margin-top:10px;font-size:1.12rem;padding:9px 16px 9px 9px}
.tv .tv-call strong{color:#9b1c12;font-weight:700}
.tv .tv-call .ic{background:radial-gradient(circle at 35% 30%,#4a7ad8,#1b3a8f 60%,#0f2259);box-shadow:0 0 0 2px #d9ad4c}
.tv .tv-call.is-mine{color:#2b1a10;animation:tv-callglow 2.2s ease-in-out infinite}
@keyframes tv-callglow{0%,100%{box-shadow:0 0 0 2px rgba(240,205,110,.0),0 16px 30px rgba(0,0,0,.6)}50%{box-shadow:0 0 0 6px rgba(240,205,110,.45),0 0 34px rgba(240,205,110,.55),0 16px 30px rgba(0,0,0,.6)}}

/* Panneaux, lettre et dialogues */
.tv-letter,.tv-dock,.tv-ui-panel{padding:24px 20px 20px;font-family:'IM Fell English',Georgia,serif}
.tv-ui-panel::before{display:none}
.tv-dock h4,.tv-letter h4{font-family:'UnifrakturMaguntia',serif;font-weight:400;font-size:1.95rem;line-height:1.05;letter-spacing:0;color:#2b1a10}
.tv-letter .muted,.tv-dock .muted{color:#6b4f2a}
.tv-letter .tv-title{font-family:'Marcellus SC',serif}
.tv-ui-kicker{font-family:'Marcellus SC',serif;font-size:13px;letter-spacing:.24em;color:#9b1c12}
.tv-ui-title{font-family:'UnifrakturMaguntia',serif;font-weight:400;font-size:2.3rem;color:#2b1a10}
.tv-ui-text{font-family:'IM Fell English',Georgia,serif;color:#4a3218}
.tv-ui-drawer{font-family:'IM Fell English',Georgia,serif}
.tv-ui-pill{font-family:'IM Fell English',Georgia,serif;border-radius:0}

/* Boutons : lapis et or, ou vermillon pour les gestes graves */
.tv-btn{font-family:'Cinzel Decorative','Cinzel',serif;font-weight:900;letter-spacing:.03em;text-transform:none;font-size:1rem;border-radius:2px;padding:.75rem 1.4rem;color:#f6e2a4;
  border:2px solid #d9ad4c;outline:1px solid #1b3a8f;outline-offset:2px;background:radial-gradient(circle at 35% 25%,#4a7ad8,#1b3a8f 60%,#0f2259);text-shadow:0 1px 0 rgba(0,0,0,.45);
  box-shadow:inset 0 -4px 6px rgba(0,0,0,.3),inset 0 3px 4px rgba(255,255,255,.25),0 4px 0 #0a1638,0 10px 18px rgba(0,0,0,.35)}
.tv-btn.danger{outline-color:#6e0f0a;background:radial-gradient(circle at 35% 25%,#e0503a,#a3201a 60%,#5e0c08);box-shadow:inset 0 -4px 6px rgba(0,0,0,.3),inset 0 3px 4px rgba(255,255,255,.25),0 4px 0 #3e0604,0 10px 18px rgba(0,0,0,.35)}
.tv-btn:disabled{opacity:.5;filter:grayscale(.6)}
.tv-btn2{font-family:'Marcellus SC',serif;font-weight:400;letter-spacing:.1em;border-radius:2px;color:#3a2410;border:1px solid #b8892e;background:rgba(255,250,235,.6)}

/* Bulletins de vote : deux sceaux de cire */
.tv-ballot{max-width:150px;aspect-ratio:1/1.02;border-radius:48% 52% 50% 50% / 52% 48% 52% 48%;gap:2px;color:#f6e2a4;
  background:radial-gradient(circle at 35% 30%,#4a7ad8,#1b3a8f 60%,#0f2259);box-shadow:inset 0 -6px 10px rgba(0,0,0,.35),inset 0 5px 8px rgba(255,255,255,.3),0 5px 0 #0a1638,0 14px 22px rgba(0,0,0,.35)}
.tv-ballot:nth-child(2){border-radius:52% 48% 50% 50% / 48% 52% 48% 52%;background:radial-gradient(circle at 35% 30%,#e0503a,#a3201a 60%,#5e0c08);box-shadow:inset 0 -6px 10px rgba(0,0,0,.35),inset 0 5px 8px rgba(255,255,255,.3),0 5px 0 #3e0604,0 14px 22px rgba(0,0,0,.35)}
.tv-ballot::before{display:none}
.tv-ballot .word{font-family:'Cinzel Decorative',serif;font-weight:900;font-size:1.6rem;color:#f6e2a4!important;text-shadow:0 2px 2px rgba(0,0,0,.4)}
.tv-ballot .muted{color:rgba(246,226,164,.85)!important}
.tv-ballot:hover{transform:translateY(-5px) rotate(-2deg)}

/* Édits à choisir */
.tv-edict{border-radius:2px;background:radial-gradient(120% 90% at 50% 30%,#fffaf0,#ead8ae);box-shadow:0 0 0 2px #c9973e,0 0 0 4px #f4e6c2,0 0 0 5px #c9973e,0 10px 18px rgba(0,0,0,.4)}
.tv-edict .lbl{font-family:'Marcellus SC',serif;font-weight:400;font-size:12px;letter-spacing:.04em}
button[aria-pressed=true] > .tv-edict{box-shadow:0 0 0 2px #c9973e,0 0 0 4px #f4e6c2,0 0 0 6px #1b3a8f,0 18px 28px rgba(0,0,0,.45)}
.tv-pick[aria-checked=true]{background:rgba(27,58,143,.12);box-shadow:0 0 0 2px #1b3a8f;border-radius:4px}

/* Conseillers : nom sur une banderole */
.tv .tv-seat-plate{position:relative;isolation:isolate;border-radius:0;padding:1px 14px 2px;background:linear-gradient(180deg,#fbf1d8,#ead8ae);border:1.5px solid #b8892e;box-shadow:0 4px 8px rgba(0,0,0,.55);backdrop-filter:none;-webkit-backdrop-filter:none}
.tv .tv-seat-plate::before,.tv .tv-seat-plate::after{content:'';position:absolute;top:5px;width:13px;height:100%;background:#7a1810;z-index:-1}
.tv .tv-seat-plate::before{left:-10px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,45% 50%)}
.tv .tv-seat-plate::after{right:-10px;clip-path:polygon(0 0,100% 0,55% 50%,100% 100%,0 100%)}
.tv .tv-seat-name{font-family:'IM Fell English',Georgia,serif;font-style:italic;font-weight:400;font-size:15px;letter-spacing:0;color:#2b1a10}
.tv .tv-seat-tag{font-family:'Marcellus SC',serif;font-size:11px;color:#1b3a8f}
.tv .tv-seat.is-me .tv-seat-plate{border-color:#1b3a8f;box-shadow:0 0 0 2px rgba(80,120,230,.55),0 4px 8px rgba(0,0,0,.55)}
.tv .tv-chip,.tv .tv-role,.tv .tv-ballot-chip{font-family:'Marcellus SC',serif;font-weight:400;border-radius:0;letter-spacing:.06em}
.tv-cloth{background:radial-gradient(closest-side,rgba(140,175,255,.18),transparent 70%),repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,.03) 0 2px,transparent 2px 6px),radial-gradient(closest-side,#2f56b8,#14306e 70%,#0a1838)}

/* Registre et chronique */
.tv-chron{padding:14px 16px;font-size:15.5px;line-height:1.4;color:#3a2614}
.tv-chron-title{font-family:'Marcellus SC',serif;font-size:15px;letter-spacing:.14em;color:#9b1c12}
.tv-chron li{color:#6b4f2a}
.tv-chron li.is-new{color:#2b1a10}
.tv-chron li.is-new::first-letter{font-family:'UnifrakturMaguntia',serif;font-size:1.55em;color:#9b1c12}

/* Mise en page « cour » sur grand écran */
.tv-court{display:grid;grid-template-columns:260px minmax(0,1fr) 360px;gap:24px;align-items:start;width:min(1500px,calc(100% - 24px));margin:16px auto 0;padding-bottom:64px}
.tv-court-side{display:flex;flex-direction:column;gap:22px;min-width:0;padding-top:4px}
.tv-court-center{min-width:0}
@media (max-width:1279px){.tv-court{grid-template-columns:220px minmax(0,1fr) 330px;gap:16px}.tv-cartouche .rest{font-size:40px}}

@media (max-width:1023px){
  .tv-hall .win,.tv-hall .shaft,.tv-hall .col.mid,.tv-hall .col.far,.tv-hall .banner,.tv-hall .chand,.tv-hall .floor,.tv-hall .floor-shade,.tv-hall .carpet{display:none}
  .tv-hall .col.near{width:22px;opacity:.5}
  .tv-stage{transform:scale(.6);margin:4px auto -169px}
  .tv-court-table{margin-top:-64px}
  .tv .tv-slot{height:56px}
  .tv-slot .numeral{font-size:14px}
  .tv-slot .lbl{font-size:9.5px}
  .tv .tv-track{padding:10px 10px 12px}
  .tv .tv-seat-plate{padding:0 8px 1px}
  .tv .tv-seat-name{font-size:13px}
  .tv .tv-seat-plate::before,.tv .tv-seat-plate::after{width:9px;top:4px}
  .tv .tv-seat-plate::before{left:-7px}.tv .tv-seat-plate::after{right:-7px}
}
/* ───── Salle du trône en 3D ───── */
.tv-hall3d{overflow:hidden}
.tv-hall3d.is-fixed{position:fixed;inset:0;z-index:0}
.tv-hall3d.is-inline{position:relative;height:min(76vh,620px);margin:0 -10px;border-top:2px solid #c9973e;border-bottom:2px solid #c9973e;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 18px 40px rgba(0,0,0,.6)}
.tv-hall3d-stage{position:absolute;inset:0}
.tv-hall-loading{position:absolute;inset:0;display:grid;place-items:center;font-family:'Marcellus SC',serif;letter-spacing:.2em;color:#e9c46a;
  background:radial-gradient(50% 40% at 50% 45%,rgba(255,190,110,.18),transparent 70%),#0d0605}
.tv.has-hall > header,.tv.has-hall .tv-court{position:relative;z-index:1}
.tv.has-hall > header,.tv.has-hall .tv-court,.tv.has-hall .tv-court-center{pointer-events:none}
.tv.has-hall > header .tv-track,.tv.has-hall > header .tv-head-mid > *,.tv.has-hall .tv-court-side,.tv.has-hall .tv-court-center .tv-call{pointer-events:auto}
.tv.has-hall .tv-court{min-height:calc(100dvh - 230px)}

.tv-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.tv-tag{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:3px;visibility:hidden;will-change:transform;pointer-events:auto;padding:0;background:none;border:0;text-align:center}
.tv-tag .tv-chip{position:static;transform:none}
.tv-tag .tv-seat-plate{display:inline-flex;align-items:center;gap:5px}
.tv-tag.is-pickable{cursor:pointer}
.tv-tag.is-pickable .tv-seat-plate{animation:tv-tagpick 1.6s ease-in-out infinite}
@keyframes tv-tagpick{50%{box-shadow:0 0 0 3px rgba(255,236,170,.75),0 0 18px rgba(255,236,170,.8)}}
.tv-tag.is-pickable:hover{filter:brightness(1.08)}
.tv-tag.is-picked .tv-seat-plate{border-color:#fff;box-shadow:0 0 0 3px #fff,0 0 24px rgba(255,240,200,.95);animation:none}
.tv-tag.is-me .tv-seat-plate{border-color:#1b3a8f;box-shadow:0 0 0 2px rgba(80,120,230,.55),0 4px 8px rgba(0,0,0,.55)}
.tv-tag.is-dead{opacity:.7}
.tv-tag.is-center{pointer-events:none;padding:14px 26px;border-radius:50%;background:radial-gradient(closest-side,rgba(8,5,3,.55),transparent)}
.tv-tag.is-center .tv-title{font-size:14px}
@media (max-width:1023px){.tv-tag.is-center{transform-origin:50% 50%;scale:.8}}
@media (prefers-reduced-motion:reduce){.tv *{animation:none!important;transition:none!important}.tv-banner,.tv-scroll{animation:tv-fade .2s both!important}}
@keyframes tv-fade{from{opacity:0}to{opacity:1}}
`;
