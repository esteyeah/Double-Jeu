import type { CSSProperties, ReactNode } from 'react';

/**
 * Habillage complet d'un jeu immersif : en plus du plateau, les écrans communs
 * (passe le téléphone, fin de partie, menus, discussion) prennent le décor du jeu,
 * pour qu'on oublie qu'on est sur un site.
 */
export interface StageSkin {
  /** Feuille de style du jeu, injectée par la scène même quand le plateau n'est pas affiché. */
  css: { href: string; text: string };
  /** Couleur/fond de la scène, sous le décor. */
  backdrop: string;
  /** Décor plein écran (fixe) affiché derrière les écrans de passage. */
  scenery?: ReactNode;
  /**
   * Jetons de couleur du site redéfinis dans les panneaux (discussion, règles, boutons) :
   * `--color-fg`, `--color-muted`, `--color-accent`, `--color-surface`, `--color-line`…
   */
  vars: CSSProperties;
  cls: {
    /** Panneau central (passage, résultat). */
    panel: string;
    /** Petit sur-titre. */
    kicker: string;
    /** Grand titre. */
    title: string;
    /** Texte courant dans un panneau. */
    text: string;
    primary: string;
    secondary: string;
    /** Boutons ronds flottants (discussion, menu, son, plein écran). */
    hud: string;
    /** Panneau latéral. */
    drawer: string;
    /** Titre du panneau latéral. */
    drawerTitle: string;
    /** Étiquette « Écran privé de… ». */
    pill: string;
    /** Message éphémère. */
    toast: string;
  };
  icons: { win: ReactNode; lose: ReactNode; handoff: ReactNode };
  words: {
    /** Sur-titre de l'écran de passage (« Transmission chiffrée »…). */
    handoffKicker: string;
    /** « Passe le téléphone à » à la mode du jeu. */
    handoffLead: string;
    /** « Les autres, ne regardez pas l'écran ! » à la mode du jeu. */
    handoffWarning: string;
    win: string;
    lose: string;
  };
}
