// Photo slots — Vice City Cover Studio.
//
// A slot says which library photo fills one layout panel and how it is
// cropped inside that panel (zoom + pan offsets). Offsets are fractions of
// the panel's own size, so a crop survives a change of post size.

/** A fresh slot: no photo yet, no zoom, centred. */
export function blankSlot() {
  return { photo: -1, zoom: 1, ox: 0, oy: 0 };
}

/** A fresh list of `count` slots. */
export function blankSlots(count) {
  return Array.from({ length: count }, blankSlot);
}

// When a photo is dealt into a slot for the first time it also gets one of
// these framings, so the same photo repeated across panels never shows the
// same slice twice.
const FRAMINGS = [
  { ox: 0, oy: 0.12 },
  { ox: 0, oy: 0.18 },
  { ox: -0.1, oy: 0.05 },
  { ox: 0.1, oy: 0.15 },
  { ox: 0, oy: -0.15 },
  { ox: -0.08, oy: 0.1 },
  { ox: 0.08, oy: -0.05 },
];
export const CROP_SPREAD = FRAMINGS;

/**
 * Deals the library photos across the slots: slot i takes photo i, wrapping
 * around, so one photo fills every panel and several photos spread out.
 * A slot that already holds the photo it would be dealt keeps its crop;
 * a slot dealt a new photo gets a fresh framing from the spread above.
 */
export function dealPhotos(slots, photoCount) {
  if (photoCount <= 0) return slots.map(blankSlot);
  return slots.map((slot, i) => {
    const photo = i % photoCount;
    if (slot.photo === photo && slot.photo >= 0) return slot;
    const framing = FRAMINGS[i % FRAMINGS.length];
    return { ...slot, photo, zoom: 1, ox: framing.ox, oy: framing.oy };
  });
}

/** Points every slot at the same library photo and resets every crop. */
export function fillAllWith(slots, photoIndex) {
  return slots.map(() => ({ photo: photoIndex, zoom: 1, ox: 0, oy: 0 }));
}

/**
 * How far a photo may be panned inside a panel of panelW x panelH before a
 * gap would show at the edge. Zero when the photo barely covers the panel.
 */
function panLimits(img, panelW, panelH, zoom) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return { x: 0, y: 0 };
  const base = Math.max(panelW / img.naturalWidth, panelH / img.naturalHeight);
  const drawnW = img.naturalWidth * base * zoom;
  const drawnH = img.naturalHeight * base * zoom;
  return {
    x: Math.max(0, (drawnW - panelW) / 2 / panelW),
    y: Math.max(0, (drawnH - panelH) / 2 / panelH),
  };
}

/** Clamps a slot's pan offsets so the photo can never leave a gap in its panel. */
export function clampPan(slot, img, panelW, panelH) {
  const limits = panLimits(img, panelW, panelH, slot.zoom);
  return {
    ...slot,
    ox: Math.max(-limits.x, Math.min(limits.x, slot.ox)),
    oy: Math.max(-limits.y, Math.min(limits.y, slot.oy)),
  };
}

/** Zooms a slot about its centre, keeping the zoom between 1x and 3x. */
export function zoomSlot(slot, factor) {
  const zoom = Math.max(1, Math.min(3, slot.zoom * factor));
  return { ...slot, zoom };
}
