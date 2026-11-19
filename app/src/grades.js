// Colour grades for Vice City Cover Studio: each grade is a Vice City sunset or
// neon look painted over a photo with canvas composite operations, so the grade
// follows the photo instead of flattening it. Colours are the grade's sky (top),
// horizon (middle) and dusk (bottom) stops.

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', blurb: 'Hot orange horizon melting into magenta dusk.', sky: '#ff9a3d', horizon: '#ff5e7a', dusk: '#7b2fbe', warm: 0.55 },
  { id: 'neon', name: 'Neon Nights', blurb: 'Teal shadows, hot pink highlights — the night strip.', sky: '#19e3d6', horizon: '#ff2e88', dusk: '#2b0a4d', warm: 0.5 },
  { id: 'gold', name: 'Golden Hour', blurb: 'Warm honey light, soft amber shadows.', sky: '#ffd76a', horizon: '#ff8c42', dusk: '#5b2a6e', warm: 0.45 },
  { id: 'noir', name: 'Miami Noir', blurb: 'Desaturated contrast with a pink neon kiss.', sky: '#c9c9d6', horizon: '#ff5e7a', dusk: '#12081f', warm: 0.35 },
  { id: 'dusk', name: 'Palm Dusk', blurb: 'Deep violet evening, cool and cinematic.', sky: '#8a7bff', horizon: '#c65bff', dusk: '#160a33', warm: 0.45 },
];

export const GRADE_IDS = GRADES.map((g) => g.id);

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/**
 * Paints a grade over the rectangle (x, y, w, h) that a photo was just drawn
 * into. `ctx` must already be clipped to the panel. The grade is three passes:
 * a soft-light sky wash, an overlay horizon band, and a multiply dusk foot
 * that deepens the bottom of the frame.
 */
export function applyGrade(ctx, grade, x, y, w, h) {
  const a = grade.warm;
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, grade.sky);
  wash.addColorStop(0.55, grade.horizon);
  wash.addColorStop(1, grade.dusk);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = a;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = a * 0.7;
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

/** The page background wash behind the panels, per grade (deep dusk tones). */
export function gradeBackground(grade) {
  return { top: grade.dusk, bottom: '#0d0518' };
}
