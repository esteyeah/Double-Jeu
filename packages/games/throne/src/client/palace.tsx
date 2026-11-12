import { RichIcon } from '@arcade/tabletop';

/** Fleur de lys (game-icons.net, CC BY 3.0), pour la tapisserie et le dossier du trône. */
const LYS =
  'M256 24c-31.466 48-62.932 96-62.932 160c0 56.794 37.144 113.568 45.514 148h34.836c8.37-34.432 45.514-91.206 45.514-148c0-64-31.466-112-62.932-160M98.637 206c-47.2 0-78.664 32-78.664 80c0 32 22.115 63.526 62.930 64c-15.732-16 .002-64 31.468-64c31.89 0 56.58 21.916 69.253 46h33.828c-13.744-47.52-49.108-126-118.813-126zm314.726 0c-69.705 0-105.070 78.48-118.814 126h33.827c12.673-24.084 37.362-46 69.252-46c31.465 0 47.2 48 31.466 64c40.816-.474 62.930-32 62.930-64c0-48-31.464-80-78.663-80zM153.076 350c-38.705 0-54.440 16-54.440 48c0 16 15.734 48 47.2 48c35.4 0 61.948-27 73.010-54h-35.682c-4.657 3.57-11.5 6-21.596 6c-15.733 0-31.464-32-8.492-48m37.694 0c.017.064.03.127.048.19c-13.29 2.16-12.694 23.343 1.793 23.79v.02H319.39l-.003-.02c14.486-.447 15.083-21.63 1.792-23.79c.017-.063.03-.126.048-.19zm168.154 0c22.972 16 7.24 48-8.492 48c-10.096 0-16.940-2.43-21.596-6h-35.682c11.062 27 37.610 54 73.010 54c31.466 0 47.2-32 47.2-48c0-32-15.735-48-54.440-48m-118.656 42c-15.733 16-15.734 48-31.467 64l31.468-16c0 16 0 32 15.732 48c15.733-16 15.732-32 15.732-48l31.467 16c-15.734-16-15.735-48-31.468-64z';

/**
 * La salle du trône derrière tout le plateau : mur de damas, hautes fenêtres et rais de lune,
 * colonnades de marbre en profondeur, bannières des deux camps, lustres, sol en damier et tapis rouge.
 */
export function PalaceHall() {
  return (
    <div className="tv-hall" aria-hidden="true">
      <span className="damask" />
      <span className="win is-left" />
      <span className="win is-right" />
      <span className="shaft is-left" />
      <span className="shaft is-right" />
      <span className="floor" />
      <span className="floor-shade" />
      <span className="carpet" />
      <span className="col far is-left" />
      <span className="col far is-right" />
      <span className="col mid is-left">
        <i className="cap" />
        <i className="base" />
      </span>
      <span className="col mid is-right">
        <i className="cap" />
        <i className="base" />
      </span>
      <span className="col near is-left" />
      <span className="col near is-right" />
      <HallBanner team="crown" />
      <HallBanner team="shadow" />
      <span className="chand is-left">
        <i />
      </span>
      <span className="chand is-right">
        <i />
      </span>
    </div>
  );
}

function HallBanner({ team }: { team: 'crown' | 'shadow' }) {
  const crown = team === 'crown';
  return (
    <span className={`banner ${crown ? 'is-left' : 'is-right'}`}>
      <svg viewBox="0 0 70 210" width="100%" height="100%">
        <rect x="0" y="0" width="70" height="7" rx="3" fill="#e2ad44" />
        <path d="M6 6H64V200L35 176L6 200Z" fill={crown ? '#1f45a8' : '#9c1b14'} />
        <path d="M11 12H59V188L35 168L11 188Z" fill="none" stroke="#e9c46a" strokeWidth="1.5" />
      </svg>
      <span className="emb">
        <RichIcon name={crown ? 'fleur-de-lys' : 'all-seeing-eye'} metal="gold" size={40} />
      </span>
    </span>
  );
}

/** Le trône vide sur son estrade, sous un baldaquin de velours, devant une tapisserie fleurdelisée. */
export function ThroneStage() {
  return (
    <div className="tv-stage" aria-hidden="true">
      <svg className="tapestry" viewBox="0 0 300 360" preserveAspectRatio="none">
        <defs>
          <pattern id="tvp-tapestry" width="40" height="44" patternUnits="userSpaceOnUse">
            <rect width="40" height="44" fill="#14245a" />
            <g fill="#c99a3a" opacity=".55">
              <path d={LYS} transform="translate(10 10) scale(.039)" />
              <path d={LYS} transform="translate(-10 32) scale(.039)" />
              <path d={LYS} transform="translate(30 32) scale(.039)" />
            </g>
          </pattern>
        </defs>
        <rect width="300" height="360" fill="url(#tvp-tapestry)" />
      </svg>
      <span className="halo" />
      <span className="curtain is-left" />
      <span className="curtain is-right" />
      <svg className="valance" viewBox="0 0 400 80">
        <defs>
          <linearGradient id="tvp-velvet" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a0a08" />
            <stop offset=".3" stopColor="#a81e18" />
            <stop offset=".55" stopColor="#7a120e" />
            <stop offset=".8" stopColor="#b8261e" />
            <stop offset="1" stopColor="#4a0a08" />
          </linearGradient>
          <linearGradient id="tvp-goldv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset=".45" stopColor="#e2ad44" />
            <stop offset="1" stopColor="#6d4512" />
          </linearGradient>
        </defs>
        <path d="M0 14H400V44Q375 64 350 44Q325 64 300 44Q275 64 250 44Q225 64 200 44Q175 64 150 44Q125 64 100 44Q75 64 50 44Q25 64 0 44Z" fill="url(#tvp-velvet)" />
        <rect x="0" y="6" width="400" height="12" fill="url(#tvp-goldv)" />
        <path
          d="M0 44Q25 64 50 44Q75 64 100 44Q125 64 150 44Q175 64 200 44Q225 64 250 44Q275 64 300 44Q325 64 350 44Q375 64 400 44"
          fill="none"
          stroke="#e9c46a"
          strokeWidth="3"
          strokeDasharray="2 3"
        />
        <path d="M180 8L190 0L200 6L210 0L220 8Z" fill="url(#tvp-goldv)" />
      </svg>
      <span className="step s1" />
      <span className="step s2" />
      <span className="step s3" />
      <Throne />
    </div>
  );
}

function Throne() {
  return (
    <svg className="throne" viewBox="0 0 240 330">
      <defs>
        <linearGradient id="tvp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset=".3" stopColor="#e8b64e" />
          <stop offset=".6" stopColor="#8f6216" />
          <stop offset=".8" stopColor="#e9c46a" />
          <stop offset="1" stopColor="#7a5212" />
        </linearGradient>
        <linearGradient id="tvp-gold2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset=".45" stopColor="#e2ad44" />
          <stop offset="1" stopColor="#6d4512" />
        </linearGradient>
        <radialGradient id="tvp-cushion" cx=".5" cy=".3" r=".8">
          <stop offset="0" stopColor="#d23a2c" />
          <stop offset=".6" stopColor="#8e1712" />
          <stop offset="1" stopColor="#3e0605" />
        </radialGradient>
        <pattern id="tvp-tuft" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 11L11 0L22 11L11 22Z" fill="none" stroke="rgba(30,0,0,.45)" strokeWidth="1.2" />
          <circle cx="11" cy="0" r="2" fill="#f0cd6e" />
          <circle cx="0" cy="11" r="2" fill="#f0cd6e" />
          <circle cx="22" cy="11" r="2" fill="#f0cd6e" />
          <circle cx="11" cy="22" r="2" fill="#f0cd6e" />
        </pattern>
      </defs>
      <path d="M100 26L108 8L120 22L132 8L140 26Z" fill="url(#tvp-gold2)" stroke="#5e3f0e" strokeWidth="1" />
      <circle cx="120" cy="6" r="5" fill="#e0503a" stroke="#5e3f0e" />
      <path d="M36 300V96Q36 48 120 22Q204 48 204 96V300Z" fill="url(#tvp-gold)" stroke="#4a3008" strokeWidth="2" />
      <path d="M58 236V104Q58 68 120 44Q182 68 182 104V236Z" fill="url(#tvp-cushion)" stroke="#5e3f0e" strokeWidth="2" />
      <path d="M58 236V104Q58 68 120 44Q182 68 182 104V236Z" fill="url(#tvp-tuft)" />
      <path d="M58 236V104Q58 68 120 44Q182 68 182 104V236Z" fill="none" stroke="#f3d27a" strokeWidth="2" />
      <path d={LYS} fill="#f3d27a" transform="translate(98 70) scale(.086)" />
      <rect x="16" y="80" width="22" height="236" rx="3" fill="url(#tvp-gold)" stroke="#4a3008" />
      <rect x="202" y="80" width="22" height="236" rx="3" fill="url(#tvp-gold)" stroke="#4a3008" />
      <circle cx="27" cy="72" r="12" fill="url(#tvp-gold)" stroke="#4a3008" />
      <circle cx="213" cy="72" r="12" fill="url(#tvp-gold)" stroke="#4a3008" />
      <path d="M27 60L27 52M213 60L213 52" stroke="#e9c46a" strokeWidth="3" />
      <path d="M4 200H60V216H4Z" fill="url(#tvp-gold)" stroke="#4a3008" />
      <path d="M180 200H236V216H180Z" fill="url(#tvp-gold)" stroke="#4a3008" />
      <circle cx="10" cy="208" r="11" fill="url(#tvp-gold)" stroke="#4a3008" />
      <circle cx="10" cy="208" r="5" fill="none" stroke="#5e3f0e" strokeWidth="1.5" />
      <circle cx="230" cy="208" r="11" fill="url(#tvp-gold)" stroke="#4a3008" />
      <circle cx="230" cy="208" r="5" fill="none" stroke="#5e3f0e" strokeWidth="1.5" />
      <rect x="44" y="232" width="152" height="26" rx="12" fill="url(#tvp-cushion)" stroke="#5e3f0e" />
      <path d="M44 258H196V290Q182 300 168 290Q154 300 140 290Q126 300 112 290Q98 300 84 290Q70 300 56 290L44 290Z" fill="url(#tvp-gold)" stroke="#4a3008" />
      <path d="M14 316Q14 306 26 306Q38 306 38 316V326H14Z" fill="url(#tvp-gold)" stroke="#4a3008" />
      <path d="M202 316Q202 306 214 306Q226 306 226 316V326H202Z" fill="url(#tvp-gold)" stroke="#4a3008" />
    </svg>
  );
}

/** Cartouche du titre : lettrine bleue enluminée, puis le reste du nom en gothique. */
export function TitleCartouche({ small = false }: { small?: boolean }) {
  return (
    <div className={`tv-cartouche ${small ? 'is-small' : ''}`}>
      <span className="lettrine">L</span>
      <span className="rest">e Trône Vide</span>
    </div>
  );
}
