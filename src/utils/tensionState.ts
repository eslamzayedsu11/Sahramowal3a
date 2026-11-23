type TensionListener = (level: number) => void;

let currentTensionLevel = 0;
const listeners = new Set<TensionListener>();

export function setTensionLevel(level: number): void {
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  if (clamped === currentTensionLevel) return;
  currentTensionLevel = clamped;
  listeners.forEach((cb) => cb(currentTensionLevel));
}

export function subscribeTensionLevel(cb: TensionListener): () => void {
  listeners.add(cb);
  cb(currentTensionLevel);
  return () => {
    listeners.delete(cb);
  };
}
