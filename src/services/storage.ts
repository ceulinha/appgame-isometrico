import type { PlacedFurniture, CharacterState } from '../types';

const KEY = 'mundo-leo-quarto-v1';

interface SavedState {
  items: PlacedFurniture[];
  character: CharacterState;
}

export function loadRoomState(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRoomState(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignora falha de storage */
  }
}

export function resetRoomState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
}
