/**
 * Décor de fond de Gobelets : la cave aux fûts.
 * Mur en blocs de pierre, trois voûtes garnies de fûts couchés, deux torches, sol dallé.
 * Dessiné en SVG (net à toutes les tailles) ; « slice » le recadre pour remplir l'écran.
 */
export function Vault() {
  return (
    <div className="go-vault" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMin slice">
        <defs>
          <pattern id="go-stone" width="120" height="60" patternUnits="userSpaceOnUse">
            <rect width="120" height="60" fill="#24282d" />
            <rect x="4" y="4" width="52" height="22" fill="#2b3036" />
            <rect x="64" y="4" width="52" height="22" fill="#282c32" />
            <rect x="4" y="34" width="112" height="22" fill="#292d33" />
            <path d="M0 0H120M0 30H120M60 0V30M0 30V60M120 30V60" stroke="#17191d" strokeWidth="3" />
          </pattern>
          <pattern id="go-flags" width="200" height="90" patternUnits="userSpaceOnUse">
            <rect width="200" height="90" fill="#202327" />
            <rect x="4" y="4" width="92" height="38" fill="#24272c" />
            <rect x="104" y="48" width="92" height="38" fill="#24272c" />
            <path d="M0 0H200M0 45H200M100 0V45M0 45V90M200 45V90" stroke="#141619" strokeWidth="3" />
          </pattern>
          <radialGradient id="go-torchglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff9a3c" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="go-depth" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff8a30" stopOpacity="0.1" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="go-floorshade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.25" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="go-topshade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <g id="go-cask">
            <path d="M0 20 Q110 0 220 20 V120 Q110 140 0 120 Z" fill="#6e4322" stroke="#0c0d10" strokeWidth="3" />
            <path d="M0 46 Q110 30 220 46 M0 94 Q110 110 220 94" stroke="#4e2e16" strokeWidth="2" fill="none" />
            <path d="M8 30 Q110 14 212 30" stroke="#a8703a" strokeWidth="3" fill="none" opacity="0.35" />
            <path d="M30 14 V126 M60 9 V131 M160 9 V131 M190 14 V126" stroke="#1a1a1c" strokeWidth="7" />
            <ellipse cx="220" cy="70" rx="18" ry="50" fill="#5a361b" stroke="#0c0d10" strokeWidth="3" />
            <circle cx="222" cy="92" r="5" fill="#b58a3a" />
          </g>
          <g id="go-torch">
            <path d="M-22 40 H22 M0 40 V62" stroke="#2a2c30" strokeWidth="6" />
            <rect x="-6" y="0" width="12" height="74" rx="2" fill="#3a2414" />
            <path d="M-15 0 H15 L11 -13 H-11 Z" fill="#2a2c30" />
            <path className="go-fire" d="M0 -74 Q24 -42 13 -19 Q6 -8 0 -12 Q-6 -8 -13 -19 Q-24 -42 0 -74 Z" fill="#ff7a1c" />
            <path className="go-fire" d="M0 -52 Q13 -34 6 -19 Q0 -14 -6 -19 Q-13 -34 0 -52 Z" fill="#ffd27a" />
          </g>
          <path id="go-arches" d="M90 680 V340 Q90 170 260 170 Q430 170 430 340 V680 Z M620 680 V310 Q620 130 800 130 Q980 130 980 310 V680 Z M1170 680 V340 Q1170 170 1340 170 Q1510 170 1510 340 V680 Z" />
        </defs>

        <rect width="1600" height="1000" fill="url(#go-stone)" />

        {/* Les voûtes : niches sombres garnies de fûts */}
        <use href="#go-arches" fill="#0a0b0e" />
        <rect x="90" y="560" width="340" height="120" fill="#121418" />
        <rect x="1170" y="560" width="340" height="120" fill="#121418" />
        <use href="#go-cask" x="150" y="540" />
        <use href="#go-cask" x="150" y="410" />
        <use href="#go-cask" x="1230" y="540" />
        <use href="#go-cask" x="1230" y="410" />
        <use href="#go-cask" x="690" y="540" />
        <use href="#go-arches" fill="none" stroke="#4a4f57" strokeWidth="24" />
        <use href="#go-arches" fill="none" stroke="#17191d" strokeWidth="24" strokeDasharray="3 41" />
        <use href="#go-arches" fill="none" stroke="#0b0c0f" strokeWidth="3" />

        {/* Le sol dallé */}
        <rect y="680" width="1600" height="320" fill="url(#go-flags)" />
        <rect y="680" width="1600" height="320" fill="url(#go-floorshade)" />
        <rect y="672" width="1600" height="10" fill="#3a3e45" />

        {/* Les torches et leur lueur */}
        <g className="go-glow">
          <circle cx="525" cy="170" r="240" fill="url(#go-torchglow)" />
          <circle cx="1075" cy="170" r="240" fill="url(#go-torchglow)" />
        </g>
        <use href="#go-torch" x="525" y="195" />
        <use href="#go-torch" x="1075" y="195" />
        <circle cx="800" cy="620" r="700" fill="url(#go-depth)" />
        <rect width="1600" height="1000" fill="url(#go-topshade)" />
      </svg>
    </div>
  );
}
