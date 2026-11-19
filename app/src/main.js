// Vice City Cover Studio — the editor.
//
// Wires the page: the photo library, the layout / size / grade pickers, the
// caption fields, per-panel crop (drag to pan, wheel to zoom, sliders too),
// a live preview and PNG export. Photos are read with object URLs on this
// machine only and never uploaded anywhere.

import { drawCover, sizeOf, SIZE_IDS } from './cover.js';
import { LAYOUTS, PANEL_COUNTS, layoutPanels } from './layouts.js';
import { GRADES } from './grades.js';
import { blankSlots, dealPhotos, fillAllWith, clampPan, zoomSlot, CROP_SPREAD } from './panels.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const MAX_PANELS = 7;

/** Everything the cover is made of, in one place. */
const studio = {
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'Vice City Nights',
  tag: 'EST. 2026',
  photos: [], // { img, name } — the library, in the order it was added
  slots: blankSlots(MAX_PANELS),
  selected: 0,
  effects: { grain: true, vignette: true, palms: true, sun: true },
};

function setStatus(text) {
  statusEl.textContent = text;
}

/* ---------- live preview ---------- */

let redrawQueued = false;
function redraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    const [w, h] = sizeOf(studio.size);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    drawCover(canvas, {
      layout: studio.layout,
      grade: studio.grade,
      title: studio.title,
      subtitle: studio.subtitle,
      tag: studio.tag,
      photos: studio.photos.map((p) => p.img),
      panels: studio.slots,
      effects: studio.effects,
    });
    syncPanelControls();
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/* ---------- photos ---------- */

/** Adds images to the library and deals them into any empty panel slots. */
async function addPhotos(files) {
  let added = 0;
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      studio.photos.push({ img, name: file.name });
      added += 1;
    } catch {
      setStatus(`Could not read ${file.name} — try a JPG or PNG photo.`);
    }
  }
  if (!added) return;
  studio.slots = dealPhotos(studio.slots, studio.photos.length);
  renderTray();
  setStatus(`${added} photo${added > 1 ? 's' : ''} added — click a panel, then drag to position it.`);
  redraw();
}

/** Loads one of the bundled sample photos (free to use, made with an image model). */
async function addSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  studio.photos.push({ img, name: `${name}.jpg` });
  studio.slots = dealPhotos(studio.slots, studio.photos.length);
  renderTray();
  setStatus(`${name}.jpg loaded — click a panel, then drag to position it.`);
  redraw();
}

/** Rebuilds the thumbnail tray from the photo library. */
function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  if (!studio.photos.length) {
    tray.innerHTML = '<p class="tray-empty">No photos yet — add yours, or try a sample below.</p>';
    return;
  }
  studio.photos.forEach((photo, i) => {
    const card = document.createElement('div');
    card.className = 'thumb';
    card.title = `${photo.name} — click to fill every panel with this photo`;
    const thumb = document.createElement('canvas');
    thumb.width = 96;
    thumb.height = 96;
    const tctx = thumb.getContext('2d');
    const s = Math.max(96 / photo.img.naturalWidth, 96 / photo.img.naturalHeight);
    const dw = photo.img.naturalWidth * s;
    const dh = photo.img.naturalHeight * s;
    tctx.drawImage(photo.img, (96 - dw) / 2, (96 - dh) / 2, dw, dh);
    const label = document.createElement('span');
    label.textContent = photo.name.length > 14 ? `${photo.name.slice(0, 12)}…` : photo.name;
    card.append(thumb, label);
    card.addEventListener('click', () => {
      studio.slots = fillAllWith(studio.slots, i);
      setStatus(`Every panel now uses ${photo.name}.`);
      redraw();
    });
    tray.append(card);
  });
}

/* ---------- pickers ---------- */

/** Fills `el` with one button per item, marking the current one active. */
function buildPicker(el, items, current, onPick, renderLabel) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    if (item.id === current) b.classList.add('active');
    b.innerHTML = renderLabel(item);
    b.addEventListener('click', () => {
      onPick(item.id);
      buildPicker(el, items, item.id, onPick, renderLabel);
    });
    el.append(b);
  }
}

function renderPickers() {
  buildPicker($('layoutRow'), LAYOUTS, studio.layout, (id) => {
    studio.layout = id;
    studio.selected = 0;
    const picked = LAYOUTS.find((l) => l.id === id);
    setStatus(`${picked.name} layout — ${PANEL_COUNTS[id]} panels.`);
    redraw();
  }, (l) => `<strong>${l.name}</strong><small>${l.blurb}</small>`);

  buildPicker(
    $('sizeRow'),
    SIZE_IDS.map((id) => ({ id, name: id.replace('x', ' × ') })),
    studio.size,
    (id) => {
      studio.size = id;
      setStatus(`Post size ${id.replace('x', ' × ')} — the preview redraws at full export size.`);
      redraw();
    },
    (s) => `<strong>${s.name}</strong>`,
  );

  buildPicker($('gradeRow'), GRADES, studio.grade, (id) => {
    studio.grade = id;
    setStatus(`${GRADES.find((g) => g.id === id).name} grade applied to every photo.`);
    redraw();
  }, (g) => `<span class="swatch" style="background:linear-gradient(135deg, ${g.sky}, ${g.horizon} 55%, ${g.dusk})"></span><strong>${g.name}</strong><small>${g.blurb}</small>`);
}

/* ---------- per-panel crop ---------- */

/** Reflects the selected slot's crop in the slider row and the panel label. */
function syncPanelControls() {
  const count = PANEL_COUNTS[studio.layout];
  const slot = studio.slots[studio.selected] ?? studio.slots[0];
  $('panelLabel').textContent = `Panel ${studio.selected + 1} of ${count}`;
  $('zoomRange').value = String(slot.zoom);
  $('panXRange').value = String(Math.round(slot.ox * 100));
  $('panYRange').value = String(Math.round(slot.oy * 100));
  $('zoomOut').textContent = `${slot.zoom.toFixed(2)}×`;
}

/** Applies a crop change to the selected slot, clamped inside its panel. */
function updateSlot(patch) {
  const slot = studio.slots[studio.selected];
  const img = slot.photo >= 0 ? studio.photos[slot.photo]?.img : null;
  const [w, h] = sizeOf(studio.size);
  const geo = layoutPanels(studio.layout, w, h);
  const p = geo.panels[studio.selected];
  studio.slots[studio.selected] = clampPan({ ...slot, ...patch }, img, p.w * w, p.h * h);
  redraw();
}

/** Which panel (if any) sits under canvas point (x, y), in canvas pixels. */
function hitPanel(x, y) {
  const [w, h] = sizeOf(studio.size);
  const geo = layoutPanels(studio.layout, w, h);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    const px = p.x * w;
    const py = p.y * h;
    const pw = p.w * w;
    const ph = p.h * h;
    let lx = x - (px + pw / 2);
    let ly = y - (py + ph / 2);
    if (p.rot) {
      const c = Math.cos(-p.rot);
      const s = Math.sin(-p.rot);
      [lx, ly] = [lx * c - ly * s, lx * s + ly * c];
    }
    if (Math.abs(lx) <= pw / 2 && Math.abs(ly) <= ph / 2) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = hitPanel(x, y);
  if (hit < 0) return;
  studio.selected = hit;
  const slot = studio.slots[hit];
  drag = { x, y, ox: slot.ox, oy: slot.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const [w, h] = sizeOf(studio.size);
  const p = layoutPanels(studio.layout, w, h).panels[studio.selected];
  const dx = (x - drag.x) / (p.w * w);
  const dy = (y - drag.y) / (p.h * h);
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  updateSlot({ ox: drag.ox + dx, oy: drag.oy + dy });
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) setStatus(`Panel ${studio.selected + 1} repositioned — drag again or use the sliders.`);
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = studio.slots[studio.selected];
  studio.slots[studio.selected] = zoomSlot(slot, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  redraw();
}, { passive: false });

/* ---------- export ---------- */

/** Renders the cover at export size and returns a PNG data URL. */
export async function exportCoverDataURL(sizeId = studio.size) {
  await document.fonts.ready;
  const [w, h] = sizeOf(sizeId);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, {
    layout: studio.layout,
    grade: studio.grade,
    title: studio.title,
    subtitle: studio.subtitle,
    tag: studio.tag,
    photos: studio.photos.map((p) => p.img),
    panels: studio.slots,
    effects: studio.effects,
  });
  return new Promise((resolve) => off.toBlob((blob) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  }, 'image/png'));
}
window.__exportCover = exportCoverDataURL;

function downloadPNG(dataURL, name) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = name;
  a.click();
}

async function exportOne(sizeId) {
  setStatus(`Rendering ${sizeId} PNG…`);
  const url = await exportCoverDataURL(sizeId);
  downloadPNG(url, `vice-city-cover-${sizeId}.png`);
  setStatus(`Saved vice-city-cover-${sizeId}.png — share it anywhere.`);
}

/** Picks a random layout and grade — a quick way to try another look. */
function shuffleLook() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  studio.layout = pick(LAYOUTS).id;
  studio.grade = pick(GRADES).id;
  studio.selected = 0;
  renderPickers();
  setStatus('Shuffled the layout and grade — keep it or shuffle again.');
  redraw();
}

/* ---------- page wiring ---------- */

$('photoFiles').addEventListener('change', (e) => {
  addPhotos([...e.target.files]);
  e.target.value = '';
});
$('samplePier').addEventListener('click', () => addSample('pier'));
$('sampleBoulevard').addEventListener('click', () => addSample('boulevard'));
$('titleInput').addEventListener('input', (e) => { studio.title = e.target.value; redraw(); });
$('subtitleInput').addEventListener('input', (e) => { studio.subtitle = e.target.value; redraw(); });
$('tagInput').addEventListener('input', (e) => { studio.tag = e.target.value; redraw(); });
$('zoomRange').addEventListener('input', (e) => updateSlot({ zoom: Number(e.target.value) }));
$('panXRange').addEventListener('input', (e) => updateSlot({ ox: Number(e.target.value) / 100 }));
$('panYRange').addEventListener('input', (e) => updateSlot({ oy: Number(e.target.value) / 100 }));
$('resetCrop').addEventListener('click', () => {
  studio.slots[studio.selected] = { ...studio.slots[studio.selected], zoom: 1, ox: 0, oy: 0 };
  setStatus(`Panel ${studio.selected + 1} crop reset.`);
  redraw();
});
$('fillAll').addEventListener('click', () => {
  const slot = studio.slots[studio.selected];
  if (slot.photo < 0) {
    setStatus('That panel has no photo yet — add one first.');
    return;
  }
  studio.slots = fillAllWith(studio.slots, slot.photo);
  setStatus('Every panel now uses the selected panel’s photo.');
  redraw();
});
$('shuffleBtn').addEventListener('click', shuffleLook);
for (const key of ['grain', 'vignette', 'palms', 'sun']) {
  $(`${key}Toggle`).addEventListener('change', (e) => {
    studio.effects[key] = e.target.checked;
    redraw();
  });
}
$('exportBtn').addEventListener('click', () => exportOne(studio.size));
$('exportAllBtn').addEventListener('click', async () => {
  for (const id of SIZE_IDS) await exportOne(id);
});

/* ---------- shot scenes (screenshots) ---------- */

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (p) => {
    try { await document.fonts.load('90px Anton'); } catch { /* fall back to system sans */ }
    try { await document.fonts.load('40px Pacifico'); } catch { /* fall back to cursive */ }
    const pier = await loadImage(`samples/${p.photo}.jpg`);
    const second = p.photo2 === p.photo ? pier : await loadImage(`samples/${p.photo2}.jpg`);
    studio.photos = [
      { img: pier, name: `${p.photo}.jpg` },
      { img: second, name: `${p.photo2}.jpg` },
    ];
    studio.layout = p.layout;
    studio.grade = p.grade;
    studio.size = p.size;
    studio.title = p.caption;
    studio.subtitle = p.subtitle;
    studio.tag = p.tag;
    // Spread the two samples across the panels, alternating photos and
    // framings so no two panels show the same slice.
    studio.slots = studio.slots.map((slot, i) => {
      const spread = CROP_SPREAD[i % CROP_SPREAD.length];
      return { ...slot, photo: i % 2 === 0 ? 0 : 1, zoom: 1, ox: spread.ox, oy: spread.oy };
    });
    renderTray();
    renderPickers();
    redraw();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
} else {
  renderTray();
  renderPickers();
  redraw();
}
