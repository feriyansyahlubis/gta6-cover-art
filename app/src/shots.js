// Fixed scenes for screenshots: ?shot=cover draws one exported cover full frame,
// ?shot=editor opens the editor with a sample photo loaded. `photo` picks a sample
// (samples/<photo>.jpg), `photo2` a second one for the other panels, `layout`,
// `grade` and `size` pick the cover. window.__shotReady is set once painted, so a
// screenshot tool can wait on it instead of guessing a delay.

import { SIZE_IDS } from './cover.js';
import { LAYOUT_IDS } from './layouts.js';
import { GRADE_IDS } from './grades.js';

export function shotParams(query) {
  const pick = (name, ids, fallback) => {
    const v = query.get(name);
    return ids.includes(v) ? v : fallback;
  };
  return {
    photo: query.get('photo') ?? 'pier',
    photo2: query.get('photo2') ?? 'boulevard',
    caption: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Vice City Nights',
    tag: query.get('tag') ?? 'EST. 2026',
    layout: pick('layout', LAYOUT_IDS, 'hero'),
    grade: pick('grade', GRADE_IDS, 'sunset'),
    size: pick('size', SIZE_IDS, '1080x1080'),
  };
}

/** Runs a shot scene: hides the editor for a cover shot, loads the samples. */
export async function runShot(shot, query, setup) {
  const p = shotParams(query);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup(p);
  // Two frames so the canvas paint lands before the screenshot is taken.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
