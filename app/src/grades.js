// Colour grades — Vice City Cover Studio.
//
// A grade is a small palette: a sky colour for the top of the frame, a horizon
// colour for the middle, a dusk colour for the bottom, and a strength that says
// how hard the palette leans on the photo. The engine paints the palette over
// a photo with soft-light / overlay / multiply passes, so the grade tints the
// picture instead of covering it up.

const GRADE_TABLE = {
  sunset: {
    name: 'Vice Sunset',
    blurb: 'Hot orange horizon melting into magenta dusk.',
    sky: '#ff9a3d',
    horizon: '#ff5e7a',
    dusk: '#7b2fbe',
    strength: 0.55,
  },
  neon: {
    name: 'Neon Nights',
    blurb: 'Teal shadows, hot pink highlights — the night strip.',
    sky: '#19e3d6',
    horizon: '#ff2e88',
    dusk: '#2b0a4d',
    strength: 0.5,
  },
  gold: {
    name: 'Golden Hour',
    blurb: 'Warm honey light, soft amber shadows.',
    sky: '#ffd76a',
    horizon: '#ff8c42',
    dusk: '#5b2a6e',
    strength: 0.45,
  },
  noir: {
    name: 'Miami Noir',
    blurb: 'Desaturated contrast with a pink neon kiss.',
    sky: '#c9c9d6',
    horizon: '#ff5e7a',
    dusk: '#12081f',
    strength: 0.35,
  },
  dusk: {
    name: 'Palm Dusk',
    blurb: 'Deep violet evening, cool and cinematic.',
    sky: '#8a7bff',
    horizon: '#c65bff',
    dusk: '#160a33',
    strength: 0.45,
  },
};

/** The grades in picker order, each with its id attached. */
export const GRADES = Object.entries(GRADE_TABLE).map(([id, g]) => ({ id, ...g }));

/** Just the ids, for validating a query string or a saved choice. */
export const GRADE_IDS = GRADES.map((g) => g.id);

/** Looks a grade up by id; anything unknown falls back to Vice Sunset. */
export function gradeById(id) {
  return GRADE_TABLE[id] ? { id, ...GRADE_TABLE[id] } : { id: 'sunset', ...GRADE_TABLE.sunset };
}

/**
 * Tints the rectangle (x, y, w, h) — the photo was just drawn there, and the
 * caller has already clipped the context to the panel. Three passes:
 *   1. soft-light wash of the whole sky-to-dusk gradient,
 *   2. a lighter overlay pass of the same gradient for punch,
 *   3. a multiply shadow that deepens the foot of the frame.
 * Miami Noir additionally pulls the saturation down most of the way.
 */
export function applyGrade(ctx, grade, x, y, w, h) {
  const strength = grade.strength;
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, grade.sky);
  wash.addColorStop(0.55, grade.horizon);
  wash.addColorStop(1, grade.dusk);

  ctx.save();

  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = strength;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);

  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = strength * 0.7;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);

  const foot = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  foot.addColorStop(0, 'rgba(20, 6, 40, 0)');
  foot.addColorStop(1, 'rgba(20, 6, 40, 0.38)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 1;
  ctx.fillStyle = foot;
  ctx.fillRect(x, y, w, h);

  if (grade.id === 'noir') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#808080';
    ctx.fillRect(x, y, w, h);
  }

  ctx.restore();
}

/**
 * The deep dusk wash painted behind the panels, per grade: the grade's dusk
 * colour at the top fading into near-black at the bottom.
 */
export function gradeBackground(grade) {
  return { top: grade.dusk, bottom: '#0d0518' };
}
