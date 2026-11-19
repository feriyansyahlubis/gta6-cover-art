// Layouts for Vice City Cover Studio: every layout is a set of photo panels plus a
// title zone, all expressed as fractions of the cover so one definition serves the
// square (1080 x 1080), portrait (1080 x 1350) and landscape (1920 x 1080) sizes.
// Each panel is { x, y, w, h, rot } in fractions; the title zone is where the big
// caption, the neon subtitle and the tag line live.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero + Three', blurb: 'One big hero shot, three stacked beside it — the classic poster.' },
  { id: 'grid', name: 'Four Panel', blurb: 'A clean 2 x 2 grid of moments.' },
  { id: 'mosaic', name: 'Mosaic', blurb: 'Seven panels: a wide middle strip between two rows of three.' },
  { id: 'fullbleed', name: 'Full Bleed', blurb: 'One photo edge to edge, a film strip of three across the top.' },
  { id: 'tilted', name: 'Snapshots', blurb: 'Tilted snapshot prints over a sunset sky.' },
  { id: 'duo', name: 'Duo Split', blurb: 'Two tall panels split down the middle.' },
];

export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);
export const PANEL_COUNTS = { hero: 4, grid: 4, mosaic: 7, fullbleed: 4, tilted: 3, duo: 2 };

/** Panel rects and title zone for a layout at cover size w x h (fractions of 1). */
export function layoutPanels(layout, w, h) {
  const landscape = w > h;
  const band = landscape ? 0.30 : 0.24; // title band height, as a fraction of h
  const top = 1 - band; // panels live above the title band (except fullbleed / tilted)
  const g = 0.008; // gutter between panels, as a fraction of the cover width
  const gx = g;
  const gy = g * (w / h);

  switch (layout) {
    case 'hero': {
      const heroW = 0.62;
      const colX = heroW + gx;
      const colW = 1 - colX;
      const third = top / 3;
      return {
        panels: [
          { x: 0, y: 0, w: heroW, h: top, rot: 0 },
          { x: colX, y: 0, w: colW, h: third - gy, rot: 0 },
          { x: colX, y: third, w: colW, h: third - gy, rot: 0 },
          { x: colX, y: third * 2, w: colW, h: top - third * 2, rot: 0 },
        ],
        title: { x: 0.04, y: top, w: 0.92, h: band, align: landscape ? 'left' : 'center' },
        band,
      };
    }
    case 'grid': {
      const half = 0.5;
      return {
        panels: [
          { x: 0, y: 0, w: half - gx / 2, h: top / 2 - gy / 2, rot: 0 },
          { x: half + gx / 2, y: 0, w: half - gx / 2, h: top / 2 - gy / 2, rot: 0 },
          { x: 0, y: top / 2 + gy / 2, w: half - gx / 2, h: top - top / 2 - gy / 2, rot: 0 },
          { x: half + gx / 2, y: top / 2 + gy / 2, w: half - gx / 2, h: top - top / 2 - gy / 2, rot: 0 },
        ],
        title: { x: 0.04, y: top, w: 0.92, h: band, align: 'center' },
        band,
      };
    }
    case 'mosaic': {
      const rowH = top * 0.26;
      const midH = top - rowH * 2 - gy * 2;
      const cellW = (1 - gx * 2) / 3;
      const cell = (i, y, hh) => ({ x: i * (cellW + gx), y, w: cellW, h: hh, rot: 0 });
      return {
        panels: [
          cell(0, 0, rowH), cell(1, 0, rowH), cell(2, 0, rowH),
          { x: 0, y: rowH + gy, w: 1, h: midH, rot: 0 },
          cell(0, rowH + gy + midH + gy, rowH), cell(1, rowH + gy + midH + gy, rowH), cell(2, rowH + gy + midH + gy, rowH),
        ],
        title: { x: 0.04, y: top, w: 0.92, h: band, align: 'center' },
        band,
      };
    }
    case 'fullbleed': {
      const stripH = 0.16;
      const stripW = (1 - gx * 2) / 3;
      return {
        panels: [
          { x: 0, y: 0, w: 1, h: 1, rot: 0 },
          { x: gx, y: gy, w: stripW, h: stripH, rot: 0 },
          { x: gx + stripW + gx, y: gy, w: stripW, h: stripH, rot: 0 },
          { x: gx + (stripW + gx) * 2, y: gy, w: stripW, h: stripH, rot: 0 },
        ],
        title: { x: 0.04, y: 1 - band - 0.02, w: 0.92, h: band, align: landscape ? 'left' : 'center' },
        band,
        strip: true,
      };
    }
    case 'tilted': {
      const pw = landscape ? 0.30 : 0.42;
      const ph = landscape ? 0.52 : 0.40;
      const y0 = landscape ? 0.10 : 0.08;
      return {
        panels: [
          { x: 0.05, y: y0, w: pw, h: ph, rot: -0.10 },
          { x: 0.5 - pw / 2, y: y0 + 0.03, w: pw, h: ph, rot: 0.03 },
          { x: 0.95 - pw, y: y0, w: pw, h: ph, rot: 0.09 },
        ],
        title: { x: 0.04, y: 1 - band - 0.02, w: 0.92, h: band, align: 'center' },
        band,
        background: 'sunset',
      };
    }
    case 'duo':
    default: {
      return {
        panels: [
          { x: 0, y: 0, w: 0.5 - gx / 2, h: top, rot: 0 },
          { x: 0.5 + gx / 2, y: 0, w: 0.5 - gx / 2, h: top, rot: 0 },
        ],
        title: { x: 0.04, y: top, w: 0.92, h: band, align: 'center' },
        band,
      };
    }
  }
}
