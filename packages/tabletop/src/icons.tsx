'use client';

import { useId, type CSSProperties } from 'react';
import { GAME_ICONS, type GameIconName } from './icons.generated';

export type { GameIconName };

/** Dégradés de métaux, du reflet à l'ombre. */
const METALS = {
  gold: ['#fff7d1', '#f7d774', '#d9a537', '#8f5f12', '#c8922c', '#ffe9a3'],
  brass: ['#fbe8b4', '#d8b264', '#a97a2c', '#5e3f12', '#9b6f2a', '#e8c983'],
  silver: ['#ffffff', '#e4e8ee', '#a9b0ba', '#5d646e', '#8e959f', '#f3f5f8'],
  steel: ['#e9eef4', '#b7c0cb', '#77818e', '#3a4049', '#626b77', '#c8d0da'],
  copper: ['#ffe0c7', '#f0a173', '#c4642f', '#6d2e10', '#a9542a', '#f5b48c'],
  iron: ['#a7adb5', '#6f7680', '#454b53', '#24282d', '#3c4148', '#868d96'],
  bone: ['#fffdf2', '#f1e7c8', '#d9c99c', '#9c8a5c', '#c4b283', '#fbf3d9'],
  ruby: ['#ffd0cc', '#f0645a', '#b3241b', '#5a0a06', '#8f1a12', '#ff8a7f'],
  ink: ['#4a3a28', '#2c2116', '#1a130c', '#0d0905', '#1a130c', '#3a2c1d'],
} as const;
export type Metal = keyof typeof METALS;

const safeId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

type Common = {
  name: GameIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Texte alternatif : sans lui, l'icône est décorative. */
  title?: string;
};

function a11y(title?: string) {
  return title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
}

/** Icône simple, de la couleur du texte. */
export function Icon({ name, size = 24, className, style, title }: Common) {
  const icon = GAME_ICONS[name];
  return (
    <svg
      viewBox={`0 0 ${icon.w} ${icon.h}`}
      width={size}
      height={size}
      className={className}
      style={style}
      {...a11y(title)}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

/**
 * Icône en relief : métal poli (dégradé + éclairage spéculaire + ombre portée),
 * gravée dans la matière (ombre interne), ou lumineuse (halo de néon).
 */
export function RichIcon({
  name,
  size = 48,
  className,
  style,
  title,
  metal = 'gold',
  variant = 'metal',
  glow = '#5ff3ff',
}: Common & { metal?: Metal; variant?: 'metal' | 'engraved' | 'neon'; glow?: string }) {
  const id = safeId(useId());
  const icon = GAME_ICONS[name];
  const unit = icon.w / 512;
  const fill = variant === 'neon' ? glow : `url(#g${id})`;
  const body = icon.body.replaceAll('currentColor', fill);
  const stops = METALS[metal];
  return (
    <svg viewBox={`0 0 ${icon.w} ${icon.h}`} width={size} height={size} className={className} style={style} {...a11y(title)}>
      <defs>
        <linearGradient id={`g${id}`} x1="0.15" y1="0" x2="0.85" y2="1">
          {stops.map((c, i) => (
            <stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        {variant === 'metal' && (
          <filter id={`f${id}`} x="-15%" y="-15%" width="130%" height="135%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation={6 * unit} result="blur" />
            <feSpecularLighting in="blur" surfaceScale={6} specularConstant={1.1} specularExponent={28} lightingColor="#fff" result="spec">
              <feDistantLight azimuth={235} elevation={42} />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="shine" />
            <feComposite in="SourceGraphic" in2="shine" operator="arithmetic" k1={0} k2={1} k3={0.75} k4={0} result="lit" />
            <feDropShadow in="lit" dx={0} dy={10 * unit} stdDeviation={9 * unit} floodColor="#000" floodOpacity={0.6} />
          </filter>
        )}
        {variant === 'engraved' && (
          <filter id={`f${id}`} x="-5%" y="-5%" width="110%" height="110%">
            <feOffset in="SourceAlpha" dx={0} dy={6 * unit} result="off" />
            <feGaussianBlur in="off" stdDeviation={5 * unit} result="blur" />
            <feComposite in="SourceAlpha" in2="blur" operator="out" result="inner" />
            <feFlood floodColor="#000" floodOpacity={0.75} />
            <feComposite in2="inner" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="shadow" />
            </feMerge>
          </filter>
        )}
        {variant === 'neon' && (
          <filter id={`f${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={14 * unit} result="halo" />
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <g filter={`url(#f${id})`} dangerouslySetInnerHTML={{ __html: body }} />
    </svg>
  );
}
