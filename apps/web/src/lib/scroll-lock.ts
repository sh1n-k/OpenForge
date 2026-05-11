let lockCount = 0;
let savedOverflow = "";

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

export function lockBodyScroll(): void {
  if (!isBrowser()) return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockBodyScroll(): void {
  if (!isBrowser()) return;
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
  }
}
