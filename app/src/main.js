// Vice City Cover Studio — the editor. Wires the page: photo library, layout /
// size / grade pickers, caption fields, per-panel crop (drag to pan, wheel to
// zoom, sliders as well), live preview and PNG export. Photos are read with
// object URLs on this machine only and never uploaded anywhere.

import { drawCover, sizeOf, SIZE_IDS } from './cover.js';
import { LAYOUTS, PANEL_COUNTS, layoutPanels } from './layouts.js';
import { GRADES } from './grades.js';
import { blankSlots, dealPhotos, fillAllWith, clampPan, zoomSlot, CROP_SPREAD } from './panels.js';
import { runShot, shotParams } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const MAX_PANELS = 7;

const state = {
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

let redrawQueued = false;
function redraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    const [w, h] = sizeOf(state.size);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    drawCover(canvas, {
      layout: state.layout,
      grade: state.grade,
      title: state.title,
      subtitle: state.subtitle,
      tag: state.tag,
      photos: state.photos.map((p) => p.img),
      panels: state.slots,
      effects: state.effects,
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

/** Adds images to the library and deals them into any empty panel slots. */
async function addPhotos(files) {
  let added = 0;
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      state.photos.push({ img, name: file.name });
      added += 1;
    } catch {
      setStatus(`Could not read ${file.name} — try a JPG or PNG photo.`);
    }
  }
  if (!added) return;
  state.slots = dealPhotos(state.slots, state.photos.length);
  renderTray();
  setStatus(`${added} photo${added > 1 ? 's' : ''} added — click a panel, then drag to position it.`);
  redraw();
}

/** Loads a bundled sample photo (free to use, made with an image model). */
async function addSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos.push({ img, name: `${name}.jpg` });
  state.slots = dealPhotos(state.slots, state.photos.length);
  renderTray();
  redraw();
}

function setStatus(text) {
  statusEl.textContent = text;
}

/* ---------- photo tray ---------- */

function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  if (!state.photos.length) {
    tray.innerHTML = '<p class="tray-empty">No photos yet — add yours, or try a sample below.</p>';
    return;
  }
  state.photos.forEach((photo, i) => {
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
      state.slots = fillAllWith(state.slots, i);
      setStatus(`Every panel now uses ${photo.name}.`);
      redraw();
    });
    tray.append(card);
  });
}

/* ---------- pickers ---------- */

function buildPicker(el, items, current, onPick, renderLabel) {
  el.innerHTML = '';
  items.forEach((item) => {
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
  });
}

function renderPickers() {
  buildPicker($('layoutRow'), LAYOUTS, state.layout, (id) => {
    state.layout = id;
    state.selected = 0;
    setStatus(`${LAYOUTS.find((l) => l.id === id).name} layout — ${PANEL_COUNTS[id]} panels.`);
    redraw();
  }, (l) => `<strong>${l.name}</strong><small>${l.blurb}</small>`);
  buildPicker($('sizeRow'), SIZE_IDS.map((id) => ({ id, name: id.replace('x', ' × ') })), state.size, (id) => {
    state.size = id;
    setStatus(`Post size ${id.replace('x', ' × ')} — the preview redraws at full export size.`);
    redraw();
  }, (s) => `<strong>${s.name}</strong>`);
  buildPicker($('gradeRow'), GRADES, state.grade, (id) => {
    state.grade = id;
    setStatus(`${GRADES.find((g) => g.id === id).name} grade applied to every photo.`);
    redraw();
  }, (g) => `<span class="swatch" style="background:linear-gradient(135deg, ${g.sky}, ${g.horizon} 55%, ${g.dusk})"></span><strong>${g.name}</strong><small>${g.blurb}</small>`);
}

/* ---------- per-panel crop ---------- */

function syncPanelControls() {
  const count = PANEL_COUNTS[state.layout];
  const slot = state.slots[state.selected] ?? state.slots[0];
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${count}`;
  $('zoomRange').value = String(slot.zoom);
  $('panXRange').value = String(Math.round(slot.ox * 100));
  $('panYRange').value = String(Math.round(slot.oy * 100));
  $('zoomOut').textContent = `${slot.zoom.toFixed(2)}×`;
}

function updateSlot(patch) {
  const slot = state.slots[state.selected];
  const img = slot.photo >= 0 ? state.photos[slot.photo]?.img : null;
  const [w, h] = sizeOf(state.size);
  const geo = layoutPanels(state.layout, w, h);
  const p = geo.panels[state.selected];
  state.slots[state.selected] = clampPan({ ...slot, ...patch }, img, p.w * w, p.h * h);
  redraw();
}

/** Which panel (if any) sits under canvas point (x, y) in canvas pixels. */
function hitPanel(x, y) {
  const [w, h] = sizeOf(state.size);
  const geo = layoutPanels(state.layout, w, h);
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
  state.selected = hit;
  drag = { x, y, ox: state.slots[hit].ox, oy: state.slots[hit].oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const [w, h] = sizeOf(state.size);
  const p = layoutPanels(state.layout, w, h).panels[state.selected];
  const dx = (x - drag.x) / (p.w * w);
  const dy = (y - drag.y) / (p.h * h);
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  updateSlot({ ox: drag.ox + dx, oy: drag.oy + dy });
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) setStatus(`Panel ${state.selected + 1} repositioned — drag again or use the sliders.`);
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.slots[state.selected];
  state.slots[state.selected] = zoomSlot(slot, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  redraw();
}, { passive: false });

/* ---------- export ---------- */

/** Renders the cover at export size and returns a PNG data URL. */
export async function exportCoverDataURL(sizeId = state.size) {
  await document.fonts.ready;
  const [w, h] = sizeOf(sizeId);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    tag: state.tag,
    photos: state.photos.map((p) => p.img),
    panels: state.slots,
    effects: state.effects,
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

/* ---------- page wiring ---------- */

$('photoFiles').addEventListener('change', (e) => {
  addPhotos([...e.target.files]);
  e.target.value = '';
});
$('samplePier').addEventListener('click', () => addSample('pier'));
$('sampleBoulevard').addEventListener('click', () => addSample('boulevard'));
$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('tagInput').addEventListener('input', (e) => { state.tag = e.target.value; redraw(); });
$('zoomRange').addEventListener('input', (e) => updateSlot({ zoom: Number(e.target.value) }));
$('panXRange').addEventListener('input', (e) => updateSlot({ ox: Number(e.target.value) / 100 }));
$('panYRange').addEventListener('input', (e) => updateSlot({ oy: Number(e.target.value) / 100 }));
$('resetCrop').addEventListener('click', () => {
  state.slots[state.selected] = { ...state.slots[state.selected], zoom: 1, ox: 0, oy: 0 };
  setStatus(`Panel ${state.selected + 1} crop reset.`);
  redraw();
});
$('fillAll').addEventListener('click', () => {
  const slot = state.slots[state.selected];
  if (slot.photo < 0) { setStatus('That panel has no photo yet — add one first.'); return; }
  state.slots = fillAllWith(state.slots, slot.photo);
  setStatus('Every panel now uses the selected panel’s photo.');
  redraw();
});
for (const key of ['grain', 'vignette', 'palms', 'sun']) {
  $(`${key}Toggle`).addEventListener('change', (e) => {
    state.effects[key] = e.target.checked;
    redraw();
  });
}
$('exportBtn').addEventListener('click', () => exportOne(state.size));
$('exportAllBtn').addEventListener('click', async () => {
  for (const id of SIZE_IDS) await exportOne(id);
});

/* ---------- shot scenes (screenshots) ---------- */

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  const query = new URLSearchParams(location.search);
  runShot(shot, query, async (p) => {
    try { await document.fonts.load('90px Anton'); } catch { /* fall back to system sans */ }
    try { await document.fonts.load('40px Pacifico'); } catch { /* fall back to cursive */ }
    const pier = await loadImage(`samples/${p.photo}.jpg`);
    const second = p.photo2 === p.photo ? pier : await loadImage(`samples/${p.photo2}.jpg`);
    state.photos = [{ img: pier, name: `${p.photo}.jpg` }, { img: second, name: `${p.photo2}.jpg` }];
    state.layout = p.layout;
    state.grade = p.grade;
    state.size = p.size;
    state.title = p.caption;
    state.subtitle = p.subtitle;
    state.tag = p.tag;
    // Spread the two samples across the panels, alternating photos and
    // framings so no two panels show the same slice.
    state.slots = state.slots.map((slot, i) => {
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
