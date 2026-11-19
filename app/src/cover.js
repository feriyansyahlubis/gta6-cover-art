// The cover engine: draws a GTA-poster-style cover onto a canvas from a state.
// Everything is drawn with the 2D canvas API — no images are fetched, no network
// is touched. The art is: a sunset sky with a striped sun, photo panels in one of
// six poster layouts, a Vice City colour grade over every photo, palm silhouettes
// framing a bold Anton title with a neon Pacifico subtitle, then film grain,
// a vignette and a poster frame.
//
// State shape (built in main.js):
//   { layout, grade, title, subtitle, tag, photos: [Image...],
//     panels: [{ photo: index|-1, zoom: 1..3, ox, oy }],   // one slot per layout panel
//     effects: { grain, vignette, palms, sun } }

import { layoutPanels } from './layouts.js';
import { applyGrade, gradeBackground, gradeById } from './grades.js';

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};
export const SIZE_IDS = Object.keys(SIZES);
export function sizeOf(id) { return SIZES[id] ?? SIZES['1080x1080']; }

/** Draws the whole cover for `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const s = w / 1080; // scale: all art measurements are authored at 1080 wide
  const grade = gradeById(state.grade);
  const geo = layoutPanels(state.layout, w, h);

  drawSky(ctx, grade, w, h, state.effects.sun);
  drawPanels(ctx, state, geo, grade, w, h, s);
  drawTitleBand(ctx, state, geo, grade, w, h, s);
  if (state.effects.grain) drawGrain(ctx, w, h);
  if (state.effects.vignette) drawVignette(ctx, w, h);
  drawPosterFrame(ctx, w, h, s);
}

/** Deep dusk sky with a striped synthwave sun peeking from the top right. */
function drawSky(ctx, grade, w, h, sunOn) {
  const bg = gradeBackground(grade);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, bg.top);
  sky.addColorStop(0.6, grade.dusk);
  sky.addColorStop(1, bg.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (!sunOn) return;
  const r = Math.min(w, h) * 0.30;
  const cx = w * 0.82;
  const cy = h * 0.20;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, '#fff3b0');
  sun.addColorStop(0.45, '#ffb347');
  sun.addColorStop(0.8, '#ff5e7a');
  sun.addColorStop(1, '#c62b8a');
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Horizontal slats cut the sun's lower half, synthwave style.
  ctx.fillStyle = bg.top;
  let y = cy + r * 0.05;
  let t = r * 0.02;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, t);
    y += t + r * 0.11;
    t *= 1.45;
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.7);
  glow.addColorStop(0, 'rgba(255, 140, 90, 0.28)');
  glow.addColorStop(1, 'rgba(255, 140, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);
}

/** Draws every layout panel: photo (cover-fit, zoomed, panned), grade, edge. */
function drawPanels(ctx, state, geo, grade, w, h, s) {
  geo.panels.forEach((p, i) => {
    const slot = state.panels[i] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const px = p.x * w;
    const py = p.y * h;
    const pw = p.w * w;
    const ph = p.h * h;
    ctx.save();
    if (p.rot) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(p.rot);
      ctx.translate(-pw / 2, -ph / 2);
    } else {
      ctx.translate(px, py);
    }
    if (state.layout === 'tilted') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 28 * s;
      ctx.shadowOffsetY = 10 * s;
    }
    // Snapshot print: a white border, thicker at the foot like a polaroid.
    const frame = state.layout === 'tilted' ? 14 * s : 0;
    const foot = state.layout === 'tilted' ? 34 * s : 0;
    if (frame) {
      ctx.fillStyle = '#fdf8ef';
      ctx.fillRect(-frame, -frame, pw + frame * 2, ph + frame + foot);
    }
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph);
    ctx.clip();
    const img = slot.photo >= 0 ? state.photos[slot.photo] : null;
    if (img) {
      drawPhotoCover(ctx, img, slot, pw, ph);
      applyGrade(ctx, grade, 0, 0, pw, ph);
    } else {
      drawEmptyPanel(ctx, grade, pw, ph, s);
    }
    ctx.restore();
    // Crisp panel edge + gutter line, drawn unrotated around the panel rect.
    ctx.save();
    ctx.strokeStyle = state.layout === 'tilted' ? 'rgba(0,0,0,0)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.restore();
  });
}

/** Cover-fit draw of one photo into a pw x ph box, with zoom and pan offsets. */
function drawPhotoCover(ctx, img, slot, pw, ph) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const base = Math.max(pw / iw, ph / ih);
  const scale = base * (slot.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - pw) / 2 / pw);
  const maxOy = Math.max(0, (dh - ph) / 2 / ph);
  const ox = Math.max(-maxOx, Math.min(maxOx, slot.ox || 0));
  const oy = Math.max(-maxOy, Math.min(maxOy, slot.oy || 0));
  ctx.drawImage(img, (pw - dw) / 2 + ox * pw, (ph - dh) / 2 + oy * ph, dw, dh);
}

/** What an empty panel looks like: a sunset wash, a small sun and a hint. */
function drawEmptyPanel(ctx, grade, pw, ph, s) {
  const wash = ctx.createLinearGradient(0, 0, 0, ph);
  wash.addColorStop(0, grade.sky);
  wash.addColorStop(1, grade.dusk);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, pw, ph);
  ctx.globalAlpha = 0.5;
  drawPalm(ctx, pw * 0.12, ph, pw * 0.22, '#1c0b33');
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `700 ${Math.max(12, 20 * s)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', pw / 2, ph / 2);
}

/** Title band: dark gradient, palms at the corners, big lettering, tag line. */
function drawTitleBand(ctx, state, geo, grade, w, h, s) {
  const z = geo.title;
  const bx = z.x * w;
  const by = z.y * h;
  const bw = z.w * w;
  const bh = z.h * h;
  const bandTop = by - bh * 0.25;
  const wash = ctx.createLinearGradient(0, bandTop, 0, by + bh);
  wash.addColorStop(0, 'rgba(16, 5, 32, 0)');
  wash.addColorStop(0.45, 'rgba(16, 5, 32, 0.72)');
  wash.addColorStop(1, 'rgba(12, 3, 24, 0.94)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, bandTop, w, h - bandTop);

  if (state.effects.palms) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawPalm(ctx, bx + 6 * s, by + bh, Math.min(bw, bh) * 0.42, '#3d1a5e');
    drawPalm(ctx, bx + bw - 6 * s, by + bh, Math.min(bw, bh) * 0.36, '#3d1a5e', true);
    ctx.restore();
  }

  const cx = z.align === 'left' ? bx + 10 * s : bx + bw / 2;
  const align = z.align === 'left' ? 'left' : 'center';
  const title = (state.title || 'SUNSET HEIST').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const tag = (state.tag || '').trim();

  // Neon script subtitle sits above the big title.
  let titleTop = by + bh * 0.10;
  if (subtitle) {
    const subSize = Math.min(bh * 0.16, bw * 0.05);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = 18 * s;
    ctx.fillStyle = '#ff8ad8';
    ctx.fillText(subtitle, cx, titleTop + subSize);
    ctx.shadowBlur = 0;
    titleTop += subSize * 1.1;
  }

  // Big title, wrapped to at most two lines, fitted to the band width and height.
  let lines = fitTitleLines(ctx, title, bw * 0.94, bh * 0.38, s);
  if (lines.text.length > 1) {
    const room = by + bh - titleTop - bh * 0.12; // leave room for the tag line
    lines = fitTitleLines(ctx, title, bw * 0.94, Math.min(bh * 0.38, room / 2.1), s);
  }
  const lineH = lines.size * 1.02;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const grad = ctx.createLinearGradient(0, titleTop, 0, titleTop + lineH * lines.text.length);
  grad.addColorStop(0, '#fffbe8');
  grad.addColorStop(0.45, '#ffd76a');
  grad.addColorStop(1, '#ff5e7a');
  ctx.font = `${lines.size}px Anton, 'Arial Narrow', sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1c0b33';
  ctx.lineWidth = Math.max(2, lines.size * 0.085);
  ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
  ctx.shadowBlur = 16 * s;
  ctx.shadowOffsetY = 4 * s;
  lines.text.forEach((line, i) => {
    const y = titleTop + lines.size + i * lineH;
    ctx.strokeText(line, cx, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, cx, y);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Tag line with a row of stars, letterspaced, under the title.
  if (tag) {
    const tagY = titleTop + lines.size + (lines.text.length - 1) * lineH + bh * 0.10;
    const tagSize = Math.min(bh * 0.08, 26 * s);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, 4 * s)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`★  ${tag}  ★`, cx, tagY);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
}

/** Fits the title into maxWidth, wrapping words to at most two lines. */
function fitTitleLines(ctx, title, maxWidth, maxSize, s) {
  let size = maxSize;
  const words = title.split(/\s+/).filter(Boolean);
  const measure = (text) => {
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    return ctx.measureText(text).width;
  };
  const wrap = () => {
    if (words.length <= 1) return [title];
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= maxWidth || !line) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  };
  let lines = wrap();
  while ((lines.length > 2 || lines.some((l) => measure(l) > maxWidth)) && size > 18 * s) {
    size -= 2;
    lines = wrap();
  }
  if (lines.length > 2) {
    // Last resort: join the overflow onto line two and shrink once more.
    lines = [lines[0], lines.slice(1).join(' ')];
    while (lines.some((l) => measure(l) > maxWidth) && size > 18 * s) {
      size -= 2;
    }
  }
  return { text: lines, size };
}

/** A palm silhouette: curved trunk, seven drooping fronds. */
export function drawPalm(ctx, x, baseY, size, color, flip = false) {
  ctx.save();
  ctx.translate(x, baseY);
  if (flip) ctx.scale(-1, 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning gently.
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.10, -size * 0.55, size * 0.22, -size * 0.95);
  ctx.stroke();
  // Fronds fanning from the crown.
  const cx = size * 0.22;
  const cy = -size * 0.95;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = size * (0.55 + 0.28 * Math.sin((i / 6) * Math.PI));
    const tipX = cx + Math.cos(a) * len;
    const tipY = cy - Math.sin(a) * len * 0.55 + len * 0.28;
    ctx.lineWidth = Math.max(1.5, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.5, cy - Math.sin(a) * len * 0.45, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(cx - size * 0.03, cy + size * 0.04, size * 0.045, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.05, cy + size * 0.05, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let noiseCanvas = null;
/** Film grain: a tiled random-noise pattern at low alpha. */
function drawGrain(ctx, w, h) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 180;
    noiseCanvas.height = 180;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 40);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noiseCanvas, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A soft dark vignette pulling the eye to the middle. */
function drawVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  v.addColorStop(0, 'rgba(10, 2, 20, 0)');
  v.addColorStop(1, 'rgba(10, 2, 20, 0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** The poster's outer edge: a white print border with a thin neon inner line. */
function drawPosterFrame(ctx, w, h, s) {
  const bw = Math.max(6, 12 * s);
  ctx.fillStyle = '#fdf8ef';
  ctx.fillRect(0, 0, w, bw);
  ctx.fillRect(0, h - bw, w, bw);
  ctx.fillRect(0, 0, bw, h);
  ctx.fillRect(w - bw, 0, bw, h);
  ctx.strokeStyle = 'rgba(255, 46, 136, 0.55)';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.strokeRect(bw + 3 * s, bw + 3 * s, w - (bw + 3 * s) * 2, h - (bw + 3 * s) * 2);
}
