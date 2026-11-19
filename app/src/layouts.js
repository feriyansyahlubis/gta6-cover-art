// Layouts — Vice City Cover Studio.
//
// A layout is a set of photo panels plus a title zone, all measured as
// fractions of the cover, so one definition serves the square (1080 x 1080),
// portrait (1080 x 1350) and landscape (1920 x 1080) post sizes. A panel is
// { x, y, w, h, rot }: its top-left corner, size, and tilt in radians. The
// title zone is where the big caption, the neon subtitle and the tag line sit.

/** One panel rect, fractions of the cover; rot defaults to no tilt. */
function panel(x, y, w, h, rot = 0) {
  return { x, y, w, h, rot };
}

/** The title zone for a layout: fractions, plus left/centre alignment. */
function titleZone(y, h, align) {
  return { x: 0.04, y, w: 0.92, h, align };
}

export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero + Three',
    blurb: 'One big hero shot, three stacked beside it — the classic poster.',
  },
  {
    id: 'grid',
    name: 'Four Panel',
    blurb: 'A clean 2 x 2 grid of moments.',
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    blurb: 'Seven panels: a wide middle strip between two rows of three.',
  },
  {
    id: 'fullbleed',
    name: 'Full Bleed',
    blurb: 'One photo edge to edge, a film strip of three across the top.',
  },
  {
    id: 'tilted',
    name: 'Snapshots',
    blurb: 'Tilted snapshot prints over a sunset sky.',
  },
  {
    id: 'duo',
    name: 'Duo Split',
    blurb: 'Two tall panels split down the middle.',
  },
];

export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);

/** How many photo panels each layout has. */
export const PANEL_COUNTS = {
  hero: 4,
  grid: 4,
  mosaic: 7,
  fullbleed: 4,
  tilted: 3,
  duo: 2,
};

/**
 * The panels and title zone for `layout` at a cover of w x h pixels.
 * `band` is the title band's height as a fraction of h; most layouts keep
 * their panels above it, while Full Bleed and Snapshots paint over the sky
 * and put the title near the foot instead.
 */
export function layoutPanels(layout, w, h) {
  const wide = w > h;
  const band = wide ? 0.3 : 0.24;
  const top = 1 - band; // panels live above the title band, unless noted
  const gx = 0.008; // gutter, as a fraction of the cover width
  const gy = gx * (w / h); // same gutter, as a fraction of the height
  const titleY = top;

  if (layout === 'hero') {
    const heroW = 0.62;
    const sideX = heroW + gx;
    const sideW = 1 - sideX;
    const third = top / 3;
    return {
      panels: [
        panel(0, 0, heroW, top),
        panel(sideX, 0, sideW, third - gy),
        panel(sideX, third, sideW, third - gy),
        panel(sideX, third * 2, sideW, top - third * 2),
      ],
      title: titleZone(titleY, band, wide ? 'left' : 'center'),
      band,
    };
  }

  if (layout === 'grid') {
    const half = 0.5;
    const cellW = half - gx / 2;
    const cellH = top / 2 - gy / 2;
    return {
      panels: [
        panel(0, 0, cellW, cellH),
        panel(half + gx / 2, 0, cellW, cellH),
        panel(0, top / 2 + gy / 2, cellW, top - top / 2 - gy / 2),
        panel(half + gx / 2, top / 2 + gy / 2, cellW, top - top / 2 - gy / 2),
      ],
      title: titleZone(titleY, band, 'center'),
      band,
    };
  }

  if (layout === 'mosaic') {
    const rowH = top * 0.26;
    const midH = top - rowH * 2 - gy * 2;
    const cellW = (1 - gx * 2) / 3;
    const row = (i, y) => panel(i * (cellW + gx), y, cellW, rowH);
    return {
      panels: [
        row(0, 0),
        row(1, 0),
        row(2, 0),
        panel(0, rowH + gy, 1, midH),
        row(0, rowH + gy + midH + gy),
        row(1, rowH + gy + midH + gy),
        row(2, rowH + gy + midH + gy),
      ],
      title: titleZone(titleY, band, 'center'),
      band,
    };
  }

  if (layout === 'fullbleed') {
    const stripH = 0.16;
    const stripW = (1 - gx * 2) / 3;
    const strip = (i) => panel(gx + i * (stripW + gx), gy, stripW, stripH);
    return {
      panels: [panel(0, 0, 1, 1), strip(0), strip(1), strip(2)],
      title: titleZone(1 - band - 0.02, band, wide ? 'left' : 'center'),
      band,
      strip: true,
    };
  }

  if (layout === 'tilted') {
    const pw = wide ? 0.3 : 0.42;
    const ph = wide ? 0.52 : 0.4;
    const y0 = wide ? 0.1 : 0.08;
    return {
      panels: [
        panel(0.05, y0, pw, ph, -0.1),
        panel(0.5 - pw / 2, y0 + 0.03, pw, ph, 0.03),
        panel(0.95 - pw, y0, pw, ph, 0.09),
      ],
      title: titleZone(1 - band - 0.02, band, 'center'),
      band,
      background: 'sunset',
    };
  }

  // 'duo' and anything unknown: two tall panels split down the middle.
  return {
    panels: [
      panel(0, 0, 0.5 - gx / 2, top),
      panel(0.5 + gx / 2, 0, 0.5 - gx / 2, top),
    ],
    title: titleZone(titleY, band, 'center'),
    band,
  };
}
