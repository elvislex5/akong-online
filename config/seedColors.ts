/**
 * Seed colour catalogue.
 *
 * Each entry defines the visual appearance of seeds on the board for one
 * cosmetic variant. The id (e.g. 'ezang') is what gets stored in
 * `profiles.selected_seed_color`. The CSS values are applied directly to
 * the seed `<div>` in BoardRevolutionary's renderPit / renderGranary.
 *
 * Names are deliberately culturally rooted (Ekang / West-African).
 */

export type SeedColorId = 'ezang' | 'ebene' | 'cauris' | 'acajou';

export interface SeedColorConfig {
  id: SeedColorId;
  name: string;
  description: string;
  /** Background gradient (used as `background:` on the seed div). */
  gradient: string;
  /** Box-shadow stack — depth + inner highlight for the 3D effect. */
  shadow: string;
  /** Single representative colour, used for swatches and previews. */
  swatch: string;
}

export const SEED_COLORS: Record<SeedColorId, SeedColorConfig> = {
  ezang: {
    id: 'ezang',
    name: 'Ézang',
    description: 'Graine authentique du Songo. Crème naturel.',
    gradient:
      'radial-gradient(circle at 30% 30%, #E5C9A0, #C8AC7F 50%, #9A7E54)',
    shadow:
      '0 1px 2px rgba(60, 40, 20, 0.55), 0 0 2px rgba(60, 40, 20, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
    swatch: '#C8AC7F',
  },
  ebene: {
    id: 'ebene',
    name: 'Ébène',
    description: 'Graine sombre, polie. Profondeur graphite.',
    gradient:
      'radial-gradient(circle at 30% 30%, #2d2d2d, #1a1a1a 50%, #0a0a0a)',
    shadow:
      '0 1px 3px rgba(0, 0, 0, 0.8), 0 0 3px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
    swatch: '#1a1a1a',
  },
  cauris: {
    id: 'cauris',
    name: 'Cauris',
    description: 'Coquillage nacré. Monnaie ancestrale ouest-africaine.',
    gradient:
      'radial-gradient(circle at 30% 30%, #FBF6E4, #ECE0BE 50%, #C9BB95)',
    shadow:
      '0 1px 2px rgba(80, 60, 30, 0.4), 0 0 2px rgba(80, 60, 30, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.55)',
    swatch: '#ECE0BE',
  },
  acajou: {
    id: 'acajou',
    name: 'Acajou',
    description: 'Bois rouge profond. Chaud et vibré.',
    gradient:
      'radial-gradient(circle at 30% 30%, #B2553A, #7E351E 50%, #4A1E0F)',
    shadow:
      '0 1px 3px rgba(40, 15, 5, 0.7), 0 0 2px rgba(40, 15, 5, 0.4), inset 0 1px 1px rgba(255, 200, 170, 0.25)',
    swatch: '#7E351E',
  },
};

export const SEED_COLOR_LIST: SeedColorConfig[] = [
  SEED_COLORS.ezang,
  SEED_COLORS.ebene,
  SEED_COLORS.cauris,
  SEED_COLORS.acajou,
];

export const DEFAULT_SEED_COLOR: SeedColorConfig = SEED_COLORS.ezang;

export function getSeedColor(id: string | null | undefined): SeedColorConfig {
  if (id && id in SEED_COLORS) return SEED_COLORS[id as SeedColorId];
  return DEFAULT_SEED_COLOR;
}
