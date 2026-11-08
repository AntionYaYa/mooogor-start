export const DRAG_HOVER_DELAY_MS = 280;

export function createDragCombineHover(onConfirmed: (id: string | undefined) => void) {
  let hoveredId: string | undefined;
  let confirmedId: string | undefined;
  let releasedId: string | undefined;
  let released = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function confirm(id: string | undefined) {
    confirmedId = id;
    onConfirmed(id);
  }

  return {
    get hoveredId() { return hoveredId; },
    get releasedId() { return releasedId; },
    get released() { return released; },
    update(id: string | undefined) {
      if (released || hoveredId === id) return false;
      clearTimeout(timer);
      hoveredId = id;
      confirm(undefined);
      if (id !== undefined) {
        timer = setTimeout(() => confirm(id), DRAG_HOVER_DELAY_MS);
      }
      return true;
    },
    capture(id: string | undefined) {
      if (released) return;
      clearTimeout(timer);
      released = true;
      releasedId = confirmedId === id ? id : undefined;
    },
    reset() {
      clearTimeout(timer);
      hoveredId = releasedId = undefined;
      released = false;
      confirm(undefined);
    },
  };
}
