import { useEffect, useRef, useState } from 'react';
import RoomCanvas from './components/RoomCanvas';
import { FURNITURE_CATALOG, STARTING_QUANTITIES, getFurnitureDef } from './data/furniture';
import { isWithinGrid, getEffectiveFootprint, getFootprintCells, pathfind, GRID_COLS, GRID_ROWS } from './utils/iso';
import { loadRoomState, saveRoomState, resetRoomState } from './services/storage';
import type { PlacedFurniture, GridPosition, Rotation, CharacterState, Direction } from './types';
import { ROOM_ENVIRONMENTS } from './data/environment';

const ALL_ROTATIONS: Rotation[] = [0, 90, 180, 270];
const STEP_MS = 220;

function computeOccupiedCells(items: PlacedFurniture[]): Set<string> {
  const set = new Set<string>();
  items
    .filter((i) => i.placed)
    .forEach((i) => {
      const def = getFurnitureDef(i.furnitureId);
      if (!def) return;
      const fp = getEffectiveFootprint(def.footprintCols, def.footprintRows, i.rotation);
      getFootprintCells(i.position, fp.cols, fp.rows).forEach((c) => set.add(`${c.col},${c.row}`));
    });
  return set;
}

function createInitialItems(): PlacedFurniture[] {
  const items: PlacedFurniture[] = [];
  const startPositions: Record<string, GridPosition> = {
    cama: { col: 0, row: 0 },
    'guarda-roupa': { col: 4, row: 0 },
  };

  Object.entries(STARTING_QUANTITIES).forEach(([furnitureId, qty]) => {
    for (let i = 0; i < qty; i++) {
      const startsPlaced = i === 0 && startPositions[furnitureId] !== undefined;
      items.push({
        instanceId: `item-${furnitureId}-${i}`,
        furnitureId,
        position: startsPlaced ? startPositions[furnitureId] : { col: 0, row: 0 },
        rotation: 0,
        placed: startsPlaced,
      });
    }
  });

  return items;
}

function getNextRotation(def: { images?: Partial<Record<Rotation, string>> }, current: Rotation): Rotation {
  const available = def.images ? (Object.keys(def.images).map(Number) as Rotation[]) : ALL_ROTATIONS;
  const pool = available.length > 0 ? available.sort((a, b) => a - b) : ALL_ROTATIONS;
  const currentIndex = pool.indexOf(current);
  return pool[(currentIndex + 1) % pool.length];
}

function findFreeSpot(items: PlacedFurniture[], cols: number, rows: number): GridPosition {
  const placed = items.filter((i) => i.placed);
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!isWithinGrid(col, row, cols, rows)) continue;
      const overlaps = placed.some((it) => {
        const def = getFurnitureDef(it.furnitureId)!;
        const fp = getEffectiveFootprint(def.footprintCols, def.footprintRows, it.rotation);
        return (
          col < it.position.col + fp.cols &&
          col + cols > it.position.col &&
          row < it.position.row + fp.rows &&
          row + rows > it.position.row
        );
      });
      if (!overlaps) return { col, row };
    }
  }
  return { col: 0, row: 0 };
}

export default function App() {
  const [items, setItems] = useState<PlacedFurniture[]>(() => loadRoomState()?.items ?? createInitialItems());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveModeInstanceId, setMoveModeInstanceId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterState>(
    () => loadRoomState()?.character ?? { position: { col: 2, row: 3 }, isWalking: false, direction: 'front' }
  );
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<GridPosition | null>(null);
  const [previewValid, setPreviewValid] = useState(false);
  const walkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    saveRoomState({ items, character });
  }, [items, character]);

  const inventoryItems = items.filter((i) => !i.placed);
  const selectedItem = items.find((i) => i.instanceId === selectedId) ?? null;
  const pendingItem = items.find((i) => i.instanceId === pendingInstanceId) ?? null;

  const inventoryGroups = FURNITURE_CATALOG.map((def) => ({
    def,
    instances: inventoryItems.filter((i) => i.furnitureId === def.id),
  })).filter((g) => g.instances.length > 0);

  const walkCharacterTo = (target: GridPosition, footprintCells?: GridPosition[], onArrive?: () => void) => {
    const occupied = computeOccupiedCells(items);
    const isBlocked = (col: number, row: number) => occupied.has(`${col},${row}`);

    let goal = target;
    if (footprintCells && footprintCells.length > 0) {
      // Andar até um móvel = ir pro tile livre mais próximo colado nele, não em cima dele.
      const candidates = footprintCells
        .flatMap((c) => [
          { col: c.col + 1, row: c.row },
          { col: c.col - 1, row: c.row },
          { col: c.col, row: c.row + 1 },
          { col: c.col, row: c.row - 1 },
        ])
        .filter((c) => isWithinGrid(c.col, c.row) && !isBlocked(c.col, c.row));

      if (candidates.length === 0) return; // cercado, não dá pra chegar perto
      candidates.sort((a, b) => {
        const da = Math.abs(a.col - character.position.col) + Math.abs(a.row - character.position.row);
        const db = Math.abs(b.col - character.position.col) + Math.abs(b.row - character.position.row);
        return da - db;
      });
      goal = candidates[0];
    } else if (isBlocked(goal.col, goal.row)) {
      return;
    }

    const path = pathfind(character.position, goal, isBlocked);
    if (walkTimeoutRef.current) window.clearTimeout(walkTimeoutRef.current);

    let i = 1; // path[0] é a posição atual
    const step = () => {
      if (i >= path.length) {
        setCharacter((c) => ({ ...c, isWalking: false }));
        onArrive?.();
        return;
      }
      const prev = path[i - 1];
      const next = path[i];
      const direction: Direction =
        next.col > prev.col ? 'right' : next.col < prev.col ? 'left' : next.row > prev.row ? 'front' : 'back';
      setCharacter({ position: next, isWalking: true, direction });
      i++;
      walkTimeoutRef.current = window.setTimeout(step, STEP_MS);
    };
    if (path.length <= 1) {
      onArrive?.();
    } else {
      step();
    }
  };

  const handleMoveItem = (instanceId: string, newPosition: GridPosition) => {
    setItems((prev) => prev.map((it) => (it.instanceId === instanceId ? { ...it, position: newPosition } : it)));
  };

  const openInventory = () => setIsInventoryOpen(true);
  const closeInventory = () => setIsInventoryOpen(false);

  const startPlacement = (instanceId: string, furnitureId: string) => {
    const def = getFurnitureDef(furnitureId);
    if (!def) return;
    setPendingInstanceId(instanceId);
    setPreviewPosition(findFreeSpot(items, def.footprintCols, def.footprintRows));
    setPreviewValid(true);
    setSelectedId(null);
    setMoveModeInstanceId(null);
    setIsInventoryOpen(false);
  };

  const handlePreviewTile = (tile: GridPosition, valid: boolean) => {
    setPreviewPosition(tile);
    setPreviewValid(valid);
  };

  const confirmPlacement = () => {
    if (!pendingInstanceId || !previewPosition || !previewValid) return;
    const targetId = pendingInstanceId;
    const targetPos = previewPosition;
    setItems((prev) =>
      prev.map((it) => (it.instanceId === targetId ? { ...it, placed: true, position: targetPos, rotation: 0 } : it))
    );
    walkCharacterTo(targetPos);
    setPendingInstanceId(null);
    setPreviewPosition(null);
  };

  const cancelPlacement = () => {
    setPendingInstanceId(null);
    setPreviewPosition(null);
  };

  const handleRemoveSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.map((it) => (it.instanceId === selectedId ? { ...it, placed: false } : it)));
    setSelectedId(null);
    setMoveModeInstanceId(null);
  };

  const handleRotateSelected = () => {
    if (!selectedId || !selectedItem) return;
    const def = getFurnitureDef(selectedItem.furnitureId);
    if (!def) return;
    const newRotation = getNextRotation(def, selectedItem.rotation);
    const fp = getEffectiveFootprint(def.footprintCols, def.footprintRows, newRotation);
    if (!isWithinGrid(selectedItem.position.col, selectedItem.position.row, fp.cols, fp.rows)) return;
    setItems((prev) => prev.map((it) => (it.instanceId === selectedId ? { ...it, rotation: newRotation } : it)));
  };

  const handleStartMoveMode = () => {
    if (!selectedId) return;
    setMoveModeInstanceId(selectedId);
  };

  const totalInInventory = inventoryItems.length;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-violet to-grape">
      <div className="flex h-full items-center justify-center overflow-auto p-4">
        <RoomCanvas
          items={items}
          character={character}
          onMoveItem={handleMoveItem}
          onWalkTo={(pos, footprintCells) => walkCharacterTo(pos, footprintCells)}
          selectedInstanceId={selectedId}
          onSelectItem={setSelectedId}
          moveModeInstanceId={moveModeInstanceId}
          onCancelMoveMode={() => setMoveModeInstanceId(null)}
          pendingFurnitureId={pendingItem?.furnitureId ?? null}
          onPreviewTile={handlePreviewTile}
          previewPosition={previewPosition}
          environment={ROOM_ENVIRONMENTS[0]}
        />
      </div>

      {/* Barra superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <h1 className="font-display text-sm font-extrabold text-white/90 drop-shadow">Meu Quarto</h1>
        <button
          onClick={openInventory}
          className="pointer-events-auto relative flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 font-display text-sm font-bold text-ink shadow-md active:scale-95"
        >
          🎒 Inventário
          {totalInInventory > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-extrabold text-white">
              {totalInInventory}
            </span>
          )}
        </button>
      </div>

      {/* Barra contextual (aparece só quando relevante — nada fixo permanentemente) */}
      {pendingInstanceId ? (
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2.5 shadow-lg">
            <span className="px-2 text-xs font-bold text-ink/60">
              {previewValid ? 'Colocar aqui?' : 'Local ocupado — toque em outro tile'}
            </span>
            <button
              onClick={confirmPlacement}
              disabled={!previewValid}
              className="rounded-xl bg-mint px-4 py-2 font-display text-sm font-bold text-white active:scale-95 disabled:opacity-40"
            >
              ✅ Confirmar
            </button>
            <button
              onClick={cancelPlacement}
              className="rounded-xl bg-ink/10 px-4 py-2 font-display text-sm font-bold text-ink/60 active:scale-95"
            >
              ✖ Cancelar
            </button>
          </div>
        </div>
      ) : moveModeInstanceId ? (
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2.5 shadow-lg">
            <span className="px-2 text-xs font-bold text-violet">Toque num tile pra posicionar</span>
            <button
              onClick={() => setMoveModeInstanceId(null)}
              className="rounded-xl bg-ink/10 px-4 py-2 font-display text-sm font-bold text-ink/60 active:scale-95"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        selectedId && (
          <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
            <div className="flex items-center gap-2 rounded-2xl bg-white/95 p-2.5 shadow-lg">
              <button
                onClick={handleStartMoveMode}
                className="rounded-xl bg-mint px-4 py-2 font-display text-sm font-bold text-white active:scale-95"
              >
                ✋ Mover
              </button>
              <button
                onClick={handleRotateSelected}
                className="rounded-xl bg-violet px-4 py-2 font-display text-sm font-bold text-white active:scale-95"
              >
                🔄 Girar
              </button>
              <button
                onClick={handleRemoveSelected}
                className="rounded-xl bg-coral px-4 py-2 font-display text-sm font-bold text-white active:scale-95"
              >
                🗑️ Remover
              </button>
            </div>
          </div>
        )
      )}

      {/* Modal de inventário */}
      {isInventoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={closeInventory}
        >
          <div
            className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-cloud p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-ink">Inventário</h2>
              <button
                onClick={closeInventory}
                className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/60 active:scale-95"
              >
                Fechar
              </button>
            </div>

            {inventoryGroups.length === 0 ? (
              <p className="rounded-2xl bg-white/70 p-4 text-center text-sm font-bold text-ink/40">
                Tudo que você tem já está no quarto! Remova um item da cena pra poder reposicioná-lo.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {inventoryGroups.map(({ def, instances }) => (
                  <button
                    key={def.id}
                    onClick={() => startPlacement(instances[0].instanceId, def.id)}
                    className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center shadow-sm active:scale-95"
                  >
                    <span className="text-2xl">{def.emoji}</span>
                    <span className="text-[11px] font-bold text-ink/70 leading-tight">{def.name}</span>
                    <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-bold text-violet">
                      {instances.length}× disponível
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-4 text-center text-[11px] text-ink/40">
              Toque num item, depois toque no tile onde quer colocar, e confirme.
            </p>
            <button
              onClick={() => {
                if (confirm('Isso apaga o quarto salvo e recomeça do zero. Continuar?')) {
                  resetRoomState();
                  setItems(createInitialItems());
                  setCharacter({ position: { col: 2, row: 3 }, isWalking: false, direction: 'front' });
                  closeInventory();
                }
              }}
              className="mt-4 w-full rounded-xl border-2 border-coral/30 py-2 font-display text-xs font-bold text-coral active:scale-95"
            >
              Resetar quarto (apagar progresso salvo)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
