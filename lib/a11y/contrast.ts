/**
 * WCAG 2.1 contrast maths, in one place.
 *
 * This used to live inside lib/__tests__/contrast.test.ts and covered exactly
 * one pairing: a palette primary under white button text. Everything else on
 * the dark background — the `text-white/NN` tiers, the class chip, the focus
 * ring, the chart bars — was never measured, and measured between 1.4:1 and
 * 3.8:1 when it finally was. Contrast is a property of a *pair*, so the module
 * has to be able to composite a translucent foreground over its real backdrop
 * rather than only compare two opaque hexes.
 */

export type Rgb = readonly [number, number, number];

/** Pure white, the foreground behind every `text-white/NN` tier. */
export const WHITE: Rgb = [255, 255, 255];

/**
 * The two stops of the app-wide background gradient (app/globals.css and the
 * inline style in app/layout.tsx). White text is *least* legible over the
 * lighter stop, so #1a1035 is the worst case every assertion should use.
 */
export const BG_TOP: Rgb = [0x0f, 0x0a, 0x1e];
export const BG_BOTTOM: Rgb = [0x1a, 0x10, 0x35];

/** Parse an `#rrggbb` (or `rrggbb`) colour. */
export function parseHex(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  return [r, g, b];
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(colour: Rgb): number {
  const [r, g, b] = colour.map((c) => {
    const channel = c / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Flatten a translucent foreground onto an opaque backdrop.
 *
 * `text-white/30` is not a colour, it is white at 30% over whatever is behind
 * it, and the resulting ratio depends entirely on that backdrop. Comparing
 * white against the background and calling it 15:1 is how these tiers shipped.
 */
export function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ];
}

/** WCAG 2.1 contrast ratio between two opaque colours. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Contrast between an `#rrggbb` surface and white text sitting on it. */
export function contrastWithWhite(hex: string): number {
  return contrastRatio(parseHex(hex), WHITE);
}

/**
 * Contrast of `text-white/<alpha>` over `bg`, i.e. the composited tier against
 * the very backdrop it was composited onto.
 */
export function whiteAlphaContrast(alpha: number, bg: Rgb): number {
  return contrastRatio(compositeOver(WHITE, alpha, bg), bg);
}

/** WCAG AA floor for body text. */
export const AA_TEXT = 4.5;

/** WCAG AA floor for large text (18.66px bold / 24px) and meaningful non-text. */
export const AA_LARGE_OR_NON_TEXT = 3;

/**
 * The lowest `text-white/NN` tier that clears {@link AA_TEXT} everywhere,
 * including over a `bg-white/5` card sitting on the lighter gradient stop.
 * /50 measures 4.98:1 there; the app uses /55 as its quiet tier so that a
 * future card tint cannot quietly eat the margin.
 */
export const MIN_WHITE_TEXT_ALPHA = 0.5;
