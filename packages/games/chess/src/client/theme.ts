/** Décor des Échecs Sournois : ardoise claire et laiton, comme la première version du jeu. */
export const CHESS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+Symbols+2&display=swap');
.ch{position:relative;min-height:100dvh;overflow:hidden;overflow:clip;isolation:isolate;color:#18202d;font-family:'Instrument Sans','Segoe UI',system-ui,sans-serif;font-size:15px;line-height:1.5;
  --ch-bg:#eceff3;--ch-surface:#ffffff;--ch-surface2:#f5f7fa;--ch-line:#d3d9e2;--ch-muted:#5a6475;--ch-accent:#a8701a;--ch-accent-ink:#ffffff;
  --sq-l:#e3e8ef;--sq-d:#7690ae;--void:#0a0d12;--void-edge:#2a3342;--pw:#fbfaf6;--pw-edge:#1e2533;--pb:#1a1f2b;--pb-edge:#c9d2de;
  --sel:rgba(168,112,26,.55);--last:rgba(168,112,26,.28);--dot:rgba(24,32,45,.32);--mission:#a8701a;--vanish:#c2410c;--imposter:#6d3fd6;--swap:#0e7c86;
  --danger:#c0392b;--ok:#2f7d4f;--arrow:rgba(214,110,20,.82);--pre:rgba(192,57,43,.34);--pre-dot:rgba(192,57,43,.6);
  --color-fg:#18202d;--color-muted:#5a6475;--color-accent:#a8701a;--color-bg:#eceff3;--color-surface:#ffffff;--color-surface-2:#f5f7fa;--color-line:#d3d9e2;
  background:#eceff3}
.ch.dark{color:#e6eaf0;
  --ch-bg:#10141a;--ch-surface:#181f28;--ch-surface2:#1f2732;--ch-line:#2c3543;--ch-muted:#9aa5b6;--ch-accent:#e2a647;--ch-accent-ink:#1a1408;
  --sq-l:#aeb8c6;--sq-d:#4d6382;--void:#030407;--void-edge:#1c2430;--pw:#fbfaf6;--pw-edge:#1e2533;--pb:#161a23;--pb-edge:#b9c3d1;
  --sel:rgba(226,166,71,.6);--last:rgba(226,166,71,.3);--dot:rgba(10,14,20,.42);--mission:#e2a647;--vanish:#fb8a4c;--imposter:#a98bfa;--swap:#4fd1c5;
  --danger:#f0705f;--ok:#5fc48a;--arrow:rgba(240,140,40,.85);--pre:rgba(240,112,95,.38);--pre-dot:rgba(240,112,95,.75);
  --color-fg:#e6eaf0;--color-muted:#9aa5b6;--color-accent:#e2a647;--color-bg:#10141a;--color-surface:#181f28;--color-surface-2:#1f2732;--color-line:#2c3543;
  background:radial-gradient(90% 60% at 50% 0%,#1a222d 0%,#10141a 70%);color-scheme:dark}
.ch.dark .ch-sw{border-color:#e6eaf0}
.ch.dark .ch-board{box-shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.45)}
.ch.dark .ch-btn.imp{color:#160d2c}.ch.dark .ch-btn.swp{color:#06201f}
.ch.dark .ch-promo{background:rgba(5,8,12,.75)}
.ch *{box-sizing:border-box}
.ch-wrap{max-width:1400px;margin:0 auto;padding:4.2rem 14px 5rem}
.ch-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:16px}
.ch-title{font-family:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;font-size:2rem;font-weight:800;letter-spacing:-.02em}
.ch-title b{color:var(--ch-accent);font-weight:700}
.ch-chips{display:flex;flex-wrap:wrap;gap:6px}
.ch-chip{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:99px;border:1px solid var(--cc,var(--ch-line));color:var(--cc,var(--ch-muted))}
.ch-play{display:grid;grid-template-columns:minmax(0,min(calc(100dvh - 9.5rem),860px)) minmax(280px,1fr);gap:24px;align-items:start}
@media (max-width:880px){.ch-play{grid-template-columns:minmax(0,1fr)}}
.ch-boardwrap{position:relative}
.ch-board{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));aspect-ratio:1;width:100%;container-type:inline-size;border-radius:8px;overflow:hidden;
  box-shadow:0 1px 2px rgba(20,28,40,.06),0 8px 28px rgba(20,28,40,.14);user-select:none;-webkit-user-select:none;touch-action:manipulation}
.ch-cell{position:relative;border:0;padding:0;margin:0;min-width:0;min-height:0;overflow:hidden;display:grid;place-items:center;line-height:1;cursor:pointer;background:var(--sq);
  font-family:'Noto Sans Symbols 2','Segoe UI Symbol','DejaVu Sans',serif;font-size:10.4cqi}
.ch-cell.lt{--sq:var(--sq-l)}.ch-cell.dk{--sq:var(--sq-d)}
.ch-cell:focus-visible{outline:3px solid var(--ch-accent);outline-offset:-3px;z-index:2}
.ch-cell.last{box-shadow:inset 0 0 0 100cqi var(--last)}
.ch-cell.sel{box-shadow:inset 0 0 0 100cqi var(--sel)}
.ch-cell.premove{box-shadow:inset 0 0 0 100cqi var(--pre)}
.ch-cell.check{background:radial-gradient(circle,var(--danger) 0%,color-mix(in srgb,var(--danger) 40%,var(--sq)) 45%,var(--sq) 72%)}
.ch-cell.tgt::after{content:"";position:absolute;width:3.4cqi;height:3.4cqi;border-radius:50%;background:var(--dot);z-index:2}
.ch-cell.tgt.cap::after{width:10.6cqi;height:10.6cqi;background:transparent;border:1.1cqi solid var(--dot)}
.ch-cell.tgt.swp::after{width:10.6cqi;height:10.6cqi;background:transparent;border:1.1cqi solid var(--swap)}
.ch-cell.tgt.plc::after{width:5cqi;height:5cqi;background:var(--mission);opacity:.8}
.ch-cell.tgt.pre::after{background:var(--pre-dot)}
.ch-cell.tgt.pick::after{width:10.6cqi;height:10.6cqi;background:transparent;border:.8cqi dashed var(--imposter)}
.ch-cell.swpsrc::before{content:"";position:absolute;inset:.9cqi;border-radius:50%;border:.6cqi dotted var(--swap);z-index:1;pointer-events:none}
.ch-cell.mole::before{content:"";position:absolute;inset:.9cqi;border-radius:50%;border:.7cqi dashed var(--imposter);z-index:1;pointer-events:none}
.ch-cell.hole{background:radial-gradient(circle at 50% 45%,var(--void) 40%,var(--void-edge) 100%);cursor:default;box-shadow:inset 0 0 2.4cqi rgba(0,0,0,.9)}
.ch-pc{position:relative;z-index:1;pointer-events:none;transition:transform .12s}
.ch-pc.w{color:var(--pw);-webkit-text-stroke:.32cqi var(--pw-edge);paint-order:stroke fill;filter:drop-shadow(0 .3cqi .2cqi rgba(0,0,0,.35))}
.ch-pc.b{color:var(--pb);-webkit-text-stroke:.18cqi var(--pb-edge);paint-order:stroke fill;filter:drop-shadow(0 .3cqi .2cqi rgba(0,0,0,.3))}
.ch-cell.sel .ch-pc{transform:scale(1.08)}
.ch-coord{position:absolute;z-index:1;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:2.1cqi;font-weight:600;line-height:1;pointer-events:none;color:var(--sq-d)}
.ch-cell.dk .ch-coord{color:var(--sq-l)}
.ch-coord.f{right:.7cqi;bottom:.6cqi}.ch-coord.r{left:.7cqi;top:.7cqi}
.ch-crack{position:absolute;inset:0;pointer-events:none;background-repeat:no-repeat;background-size:100% 100%;z-index:0}
.ch-crack.c1{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 34L17 38L25 49L39 52L47 63L58 66M25 49L22 60' stroke='rgba(255,255,255,.4)' stroke-width='1.2' transform='translate(.9 .9)'/%3E%3Cpath d='M3 34L17 38L25 49L39 52L47 63L58 66M25 49L22 60' stroke='rgba(12,16,24,.62)' stroke-width='1.6'/%3E%3C/svg%3E")}
.ch-crack.c2{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M47 63L53 57L58 66L50 70Z M71 24L77 27L74 33Z M22 60L16 62L19 67Z' fill='rgba(12,16,24,.5)'/%3E%3Cpath d='M1 34L17 38L25 49L39 52L47 63L58 66L67 79L82 82L99 93M25 49L22 60L13 67M39 52L50 41L63 38L71 24L69 1M67 79L63 99M50 41L45 29M82 82L89 70M63 38L77 45L86 41' stroke='rgba(255,255,255,.38)' stroke-width='1.3' transform='translate(1 1)'/%3E%3Cpath d='M1 34L17 38L25 49L39 52L47 63L58 66L67 79L82 82L99 93M25 49L22 60L13 67M39 52L50 41L63 38L71 24L69 1M67 79L63 99M50 41L45 29M82 82L89 70M63 38L77 45L86 41' stroke='rgba(12,16,24,.78)' stroke-width='2.3'/%3E%3C/svg%3E");box-shadow:inset 0 0 3.4cqi rgba(0,0,0,.35)}
.ch-crack.v1{transform:rotate(90deg)}.ch-crack.v2{transform:scaleX(-1)}.ch-crack.v3{transform:rotate(180deg)}
.ch-arrows{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
.ch-side{display:flex;flex-direction:column;gap:14px;min-width:0}
.ch-panel{background:var(--ch-surface);border:1px solid var(--ch-line);border-radius:14px;padding:15px 17px;min-width:0}
.ch-panel h3{font-family:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;font-size:15px;font-weight:700;margin:0 0 10px}
.ch-panel.mission{border-color:color-mix(in srgb,var(--mission) 45%,var(--ch-line))}
.ch-panel.swap{border-color:color-mix(in srgb,var(--swap) 45%,var(--ch-line))}
.ch-turn{display:flex;align-items:center;gap:12px;font-family:'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;font-size:21px;font-weight:700}
.ch-sw{width:20px;height:20px;border-radius:50%;flex:none;border:2px solid #18202d}
.ch-sw.w{background:var(--pw)}.ch-sw.b{background:var(--pb);border-color:var(--pb-edge)}
.ch-badge{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:6px;background:var(--danger);color:#fff}
.ch-sub{color:var(--ch-muted);font-size:13.5px;margin:6px 0 0}
.ch-note{font-size:13.5px;border-radius:10px;padding:9px 12px;background:var(--ch-surface2);border:1px dashed var(--ch-line);margin:10px 0 0}
.ch-note.warn{border-color:var(--mission)}
.ch-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.ch-list li{display:flex;gap:10px;align-items:flex-start;font-size:14px}
.ch-k{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:5px;flex:none;margin-top:2px}
.ch-k.no{background:color-mix(in srgb,var(--danger) 18%,transparent);color:var(--danger)}
.ch-k.goal{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}
.ch-k.mole{background:color-mix(in srgb,var(--imposter) 20%,transparent);color:var(--imposter)}
.ch-prog{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12px;color:var(--mission);white-space:nowrap}
.ch-row{display:flex;flex-wrap:wrap;gap:8px}
.ch-btn{border-radius:10px;padding:9px 15px;font-weight:600;cursor:pointer;background:var(--ch-surface2);border:1px solid var(--ch-line);color:inherit;font:inherit;font-weight:600}
.ch-btn:hover{border-color:var(--ch-muted)}
.ch-btn:focus-visible{outline:3px solid var(--ch-accent);outline-offset:2px}
.ch-btn.primary{background:var(--ch-accent);color:var(--ch-accent-ink);border-color:var(--ch-accent)}
.ch-btn.imp{background:var(--imposter);border-color:var(--imposter);color:#fff}
.ch-btn.swp{background:var(--swap);border-color:var(--swap);color:#fff}
.ch-btn.danger{color:var(--danger)}
.ch-btn:disabled{opacity:.45;cursor:not-allowed}
.ch-pills{display:flex;gap:6px;align-items:center}
.ch-pill{width:12px;height:12px;border-radius:50%;border:2px solid var(--swap)}.ch-pill.on{background:var(--swap)}
.ch-caps{display:flex;flex-direction:column;gap:6px}
.ch-caps>div{display:flex;align-items:center;gap:8px;min-height:24px}
.ch-lbl{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:11px;color:var(--ch-muted);width:64px;flex:none;text-transform:uppercase;letter-spacing:.08em}
.ch-g{font-family:'Noto Sans Symbols 2','Segoe UI Symbol','DejaVu Sans',serif;font-size:21px;line-height:1;word-break:break-all}
.ch-g .w{color:var(--pw);-webkit-text-stroke:.8px var(--pw-edge);paint-order:stroke fill}.ch-g .b{color:var(--pb);-webkit-text-stroke:.5px var(--pb-edge)}.ch-g .gone{opacity:.45}
.ch-hist{max-height:220px;overflow-y:auto;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:13px;font-variant-numeric:tabular-nums;display:grid;grid-template-columns:auto 1fr 1fr;gap:2px 12px;align-content:start}
.ch-hist .n{color:var(--ch-muted)}.ch-hist .e{overflow-wrap:anywhere}
.ch-hist .flip{color:var(--imposter)}.ch-hist .swap{color:var(--swap)}.ch-hist .queen{color:var(--mission)}
.ch-blind{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.ch-blind input{font:600 16px 'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:.08em;width:140px;padding:9px 12px;border-radius:10px;border:1px solid var(--ch-line);background:var(--ch-surface2);color:inherit}
.ch-promo{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:rgba(236,239,243,.82);backdrop-filter:blur(8px);padding:16px}
.ch-promo>div{background:var(--ch-surface);border:1px solid var(--ch-line);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:14px;width:min(420px,100%)}
.ch-promo .opts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ch-promo .opts button{aspect-ratio:1;border-radius:12px;border:1px solid var(--ch-line);background:var(--sq-l);cursor:pointer;font-family:'Noto Sans Symbols 2','Segoe UI Symbol','DejaVu Sans',serif;font-size:44px;line-height:1}
.ch-reveal{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:620px){.ch-reveal{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.ch *{transition:none!important;animation:none!important}}
`;
