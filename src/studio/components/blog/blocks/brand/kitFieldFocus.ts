/** Canvas → left panel: which kit field was just clicked, so the panel can scroll to it. */
export type KitFieldTarget = { blockId: string; field: string };

let pending: KitFieldTarget | null = null;
let current: KitFieldTarget | null = null;
const listeners = new Set<(t: KitFieldTarget) => void>();

export function revealKitField(target: KitFieldTarget) {
  pending = target;
  current = target;
  listeners.forEach((fn) => fn(target));
}

/** The green bar selects the whole section, so the piece selection has to drop. */
export function clearKitField(blockId: string) {
  if (current?.blockId === blockId) current = null;
  if (pending?.blockId === blockId) pending = null;
  listeners.forEach((fn) => fn({ blockId, field: '' }));
}

export function currentKitField(blockId: string): string | null {
  if (!current || current.blockId !== blockId) return null;
  return current.field;
}

/** The panel may mount after the click (block was not selected yet), so it can claim the last target. */
export function takePendingKitField(blockId: string): string | null {
  if (!pending || pending.blockId !== blockId) return null;
  const field = pending.field;
  pending = null;
  return field;
}

export function subscribeKitField(fn: (t: KitFieldTarget) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function scrollToKitField(blockId: string, field: string) {
  const root = document.querySelector(`[data-kit-fields-for="${CSS.escape(blockId)}"]`);
  const el = root?.querySelector<HTMLElement>(`[data-kit-field="${CSS.escape(field)}"]`);
  if (!el) return;
  /* Scroll the panel's own container: a smooth scrollIntoView gets cancelled by the canvas focus scroll in Chrome. */
  let box = el.parentElement;
  while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (box) {
    const offset = el.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTo({ top: box.scrollTop + offset - box.clientHeight / 2 + el.offsetHeight / 2, behavior: 'smooth' });
  } else {
    el.scrollIntoView({ block: 'center' });
  }
  el.animate(
    [
      { boxShadow: '0 0 0 3px rgba(253, 194, 15, 0.9)', borderRadius: '8px' },
      { boxShadow: '0 0 0 3px rgba(253, 194, 15, 0)', borderRadius: '8px' },
    ],
    { duration: 1600, easing: 'ease-out' },
  );
}
