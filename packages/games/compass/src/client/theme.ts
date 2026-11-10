/** Décor de Boussole : table de cartographe — chêne ciré, grande carte sur parchemin, rose des vents, encre. */
export const COMPASS_CSS = `
@font-face{font-family:'Bs Digits';src:local('Times New Roman'),local('TimesNewRomanPSMT'),local('Liberation Serif'),local('Noto Serif'),local('Droid Serif'),local('Tinos');unicode-range:U+0030-0039}
.bs{position:relative;min-height:100dvh;font-family:'Bs Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:17px;overflow:hidden;overflow:clip;isolation:isolate;
  --color-fg:#2a1d0e;--color-muted:#6b5432;--color-accent:#1f5f7a;--color-bg:#fbf3df;--color-surface:#f6ecd4;--color-surface-2:#fbf4e2;--color-line:#b8995e;
  --color-key:#8e3a14;--color-good:#2f7a3c;--color-sabo:#a3241a;--color-tech:#1f5f7a;color:var(--color-fg);background:#3a2410}
.bs-desk{position:absolute;inset:0;z-index:-3;background:url(/themes/compass/desk.jpg) center/520px}
.bs-light{position:absolute;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(60% 45% at 50% 30%,rgba(255,236,190,.28),transparent 70%),radial-gradient(140% 100% at 50% 30%,transparent 45%,rgba(20,10,2,.7) 100%)}
.bs-map{position:relative;padding:22px 18px 26px;border-radius:4px;background:radial-gradient(130% 100% at 50% 40%,transparent 55%,rgba(110,70,20,.35)),url(/themes/compass/parchment.jpg) center/420px;
  box-shadow:0 26px 60px rgba(0,0,0,.6),inset 0 0 70px rgba(120,80,25,.45)}
.bs-map::before{content:'';position:absolute;inset:10px;border:1.5px solid rgba(120,80,25,.5);outline:1px solid rgba(120,80,25,.3);outline-offset:4px;pointer-events:none}
.bs-rose{position:absolute;right:-30px;bottom:-30px;width:240px;height:240px;opacity:.12;pointer-events:none;z-index:0}
.bs-map > *{position:relative;z-index:1}
.bs-title{font-family:'IM Fell English',Georgia,serif;letter-spacing:.02em}
.bs .bg-surface,.bs .bg-surface-2{background-image:linear-gradient(rgba(255,250,235,.55),rgba(255,250,235,.55)),url(/themes/compass/parchment.jpg);background-size:auto,260px}
.bs .rounded-xl,.bs .rounded-2xl{box-shadow:0 2px 6px rgba(80,50,15,.18)}
.bs button.bg-accent{color:#fbf4e2;background:linear-gradient(180deg,#2c7a99,#1f5f7a 55%,#164557);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #123a49}
.bs input{background:#fffaf0}
.bs h4{font-family:'IM Fell English',Georgia,serif;font-size:1.25rem}
.bs-btn{font-family:'IM Fell English',Georgia,serif;font-size:1.1rem;border-radius:10px;padding:.65rem 1.3rem;color:#fbf4e2;border:1px solid #123a49;background:linear-gradient(180deg,#2c7a99,#1f5f7a 55%,#164557);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 3px 0 #123a49,0 8px 16px rgba(0,0,0,.3)}
.bs-btn:disabled{opacity:.45}
.bs-btn2{font-family:'IM Fell English',Georgia,serif;font-size:1rem;border-radius:10px;padding:.6rem 1.1rem;color:#2a1d0e;border:1px solid #b8995e;background:rgba(255,250,235,.7)}
.bs-ui-panel{position:relative;padding:28px 22px 24px;border-radius:4px;color:#2a1d0e;font-family:'Bs Digits','Cormorant Garamond',Georgia,serif;font-weight:500;
  background:radial-gradient(130% 100% at 50% 40%,transparent 55%,rgba(110,70,20,.38)),url(/themes/compass/parchment.jpg) center/360px;box-shadow:0 30px 70px rgba(0,0,0,.7),inset 0 0 50px rgba(120,80,25,.45)}
.bs-ui-panel::before{content:'';position:absolute;inset:8px;border:1.5px solid rgba(120,80,25,.5);pointer-events:none}
.bs-ui-kicker{font-family:'IM Fell English',Georgia,serif;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#1f5f7a}
.bs-ui-title{font-family:'IM Fell English',Georgia,serif;font-size:2rem;line-height:1.1;color:#2a1d0e}
.bs-ui-text{font-family:'Bs Digits','Cormorant Garamond',Georgia,serif;color:#4a3418;font-size:1.12rem}
.bs-hud{border-radius:50%;color:#f6e7c4;border:2px solid #b8995e;background:radial-gradient(circle at 50% 30%,rgba(255,230,180,.2),transparent 60%),linear-gradient(180deg,rgba(40,24,10,.55),rgba(14,8,3,.85)),url(/themes/compass/desk.jpg) center/140px;box-shadow:0 4px 12px rgba(0,0,0,.55)}
.bs-hud:hover{border-color:#f6e7c4}
.bs-ui-drawer{color:#2a1d0e;font-family:'Bs Digits','Cormorant Garamond',Georgia,serif;font-weight:500;font-size:1.05rem;border-left:4px solid #6b4a22;background:url(/themes/compass/parchment.jpg) center/360px;box-shadow:-20px 0 60px rgba(0,0,0,.55)}
.bs-ui-pill{font-family:'IM Fell English',Georgia,serif;font-size:14px;color:#2a1d0e;padding:6px 14px;border-radius:999px;background:url(/themes/compass/parchment.jpg) center/200px;border:1px solid #b8995e;box-shadow:0 6px 16px rgba(0,0,0,.45)}
`;
