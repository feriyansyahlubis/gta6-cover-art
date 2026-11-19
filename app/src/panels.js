// The photo slots: which library photo fills each layout panel, and how it is
// cropped inside that panel (zoom + pan offsets). Offsets are fractions of the
// panel's own size, so they survive a change of post size.

export function blankSlot() {
  return { photo: -1, zoom: 1, ox: 0, oy: 0 };
}

/** A fresh slot list with `count` slots. */
export function blankSlots(count) {
  return Array.from({ length: count }, () => blankSlot());
}

/**
 * Deals the library photos across the slots: slot i takes photo i, wrapping
 * around, so one photo fills every panel and several photos spread out. Slots
 * that get a (new) photo also get a different framing from a spread of crops,
 * so repeated photos never show the same slice twice.
 */
const SPREAD = [
  { ox: 0, oy: 0.12 },
  { ox: 0, oy: 0.18 },
  { ox: -0.1, oy: 0.05 },
  { ox: 0.1, oy: 0.15 },
  { ox: 0, oy: -0.15 },
  { ox: -0.08, oy: 0.1 },
  { ox: 0.08, oy: -0.05 },
];
export const CROP_SPREAD = SPREAD;

export function dealPhotos(slots, photoCount) {
  if (photoCount <= 0) return slots.map(() => blankSlot());
  return slots.map((slot, i) => {
    const photo = i % photoCount;
    if (slot.photo === photo && slot.photo >= 0) return slot;
    const spread = SPREAD[i % SPREAD.length];
    return { ...slot, photo, zoom: 1, ox: spread.ox, oy: spread.oy };
  });
}

/** Points every slot at the same library photo (and resets its crop). */
export function fillAllWith(slots, photoIndex) {
  return slots.map(() => ({ photo: photoIndex, zoom: 1, ox: 0, oy: 0 }));
}

/** Clamps a pan offset so the photo can never leave a gap in its panel. */
export function clampPan(slot, img, panelW, panelH) {
  if (!img || !img.naturalWidth) return slot;
  const base = Math.max(panelW / img.naturalWidth, panelH / img.naturalHeight);
  const dw = img.naturalWidth * base * slot.zoom;
  const dh = img.naturalHeight * base * slot.zoom;
  const maxOx = Math.max(0, (dw - panelW) / 2 / panelW);
  const maxOy = Math.max(0, (dh - panelH) / 2 / panelH);
  return {
    ...slot,
    ox: Math.max(-maxOx, Math.min(maxOx, slot.ox)),
    oy: Math.max(-maxOy, Math.min(maxOy, slot.oy)),
  };
}

/** Zooms a slot about its centre, keeping the crop inside the panel. */
export function zoomSlot(slot, factor) {
  const zoom = Math.max(1, Math.min(3, slot.zoom * factor));
  return { ...slot, zoom };
}
