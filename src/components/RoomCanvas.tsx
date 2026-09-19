import { useRef, useState } from 'react';
import type { PlacedFurniture, GridPosition, CharacterState, Rotation, RoomEnvironment } from '../types';
import { getFurnitureDef } from '../data/furniture';
import IsoTile from './IsoTile';
import IsoFurnitureItem from './IsoFurnitureItem';
import RoomWalls from './RoomWalls';
import CharacterSprite from './CharacterSprite';
import { getWallSet, getFloorDef } from '../data/environment';
import {
  GRID_COLS,
  GRID_ROWS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ROOM_WALL_HEIGHT,
  canvasPointToGrid,
  isWithinGrid,
  clamp,
  getEffectiveFootprint,
  getFootprintCells,
} from '../utils/iso';

interface RoomCanvasProps {
  items: PlacedFurniture[];
  character: CharacterState;
  onMoveItem: (instanceId: string, newPosition: GridPosition) => void;
  onWalkTo: (position: GridPosition, footprintCells?: GridPosition[]) => void;
  selectedInstanceId: string | null;
  onSelectItem: (instanceId: string | null) => void;
  moveModeInstanceId: string | null;
  onCancelMoveMode: () => void;
  pendingFurnitureId: string | null;
  onPreviewTile: (tile: GridPosition, valid: boolean) => void;
  previewPosition: GridPosition | null;
  environment: RoomEnvironment;
}

function footprintsOverlap(a: GridPosition, aCols: number, aRows: number, b: GridPosition, bCols: number, bRows: number): boolean {
  return a.col < b.col + bCols && a.col + aCols > b.col && a.row < b.row + bRows && a.row + aRows > b.row;
}

export default function RoomCanvas({
  items,
  character,
  onMoveItem,
  onWalkTo,
  selectedInstanceId,
  onSelectItem,
  moveModeInstanceId,
  onCancelMoveMode,
  pendingFurnitureId,
  onPreviewTile,
  previewPosition,
  environment,
}: RoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<GridPosition | null>(null);
  const [ghostValid, setGhostValid] = useState(true);

  const wallSet = getWallSet(environment.wallSetId);
  const floorDef = getFloorDef(environment.floorId);

  const placedItems = items.filter((i) => i.placed);
  const pendingDef = pendingFurnitureId ? getFurnitureDef(pendingFurnitureId) : undefined;

  const tiles: GridPosition[] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      tiles.push({ col, row });
    }
  }

  const computeGridFromPointer = (clientX: number, clientY: number): GridPosition | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return canvasPointToGrid(clientX - rect.left, clientY - rect.top - ROOM_WALL_HEIGHT);
  };

  const isPositionValid = (candidate: GridPosition, cols: number, rows: number, ignoreInstanceId: string | null) =>
    isWithinGrid(candidate.col, candidate.row, cols, rows) &&
    !placedItems.some((other) => {
      if (ignoreInstanceId && other.instanceId === ignoreInstanceId) return false;
      const otherDef = getFurnitureDef(other.furnitureId);
      if (!otherDef) return false;
      const otherFootprint = getEffectiveFootprint(otherDef.footprintCols, otherDef.footprintRows, other.rotation);
      return footprintsOverlap(candidate, cols, rows, other.position, otherFootprint.cols, otherFootprint.rows);
    });

  const handleItemPointerDown = (instanceId: string, def: ReturnType<typeof getFurnitureDef>, position: GridPosition, rotation: Rotation) => (e: React.PointerEvent) => {
    if (pendingFurnitureId) return; // durante uma prévia de posicionamento, a cena só responde a toques no chão
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(instanceId);
    onSelectItem(instanceId);
    if (def) {
      const fp = getEffectiveFootprint(def.footprintCols, def.footprintRows, rotation);
      onWalkTo(position, getFootprintCells(position, fp.cols, fp.rows));
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const item = items.find((i) => i.instanceId === draggingId);
    const def = item ? getFurnitureDef(item.furnitureId) : undefined;
    if (!item || !def) return;

    const { cols, rows } = getEffectiveFootprint(def.footprintCols, def.footprintRows, item.rotation);
    const grid = computeGridFromPointer(e.clientX, e.clientY);
    if (!grid) return;

    const col = clamp(grid.col, 0, GRID_COLS - cols);
    const row = clamp(grid.row, 0, GRID_ROWS - rows);
    const candidate = { col, row };

    setGhostPosition(candidate);
    setGhostValid(isPositionValid(candidate, cols, rows, draggingId));
  };

  const handlePointerUp = () => {
    if (draggingId && ghostPosition && ghostValid) {
      onMoveItem(draggingId, ghostPosition);
    }
    setDraggingId(null);
    setGhostPosition(null);
  };

  const handleTileTap = (tile: GridPosition) => {
    if (pendingDef) {
      const { cols, rows } = getEffectiveFootprint(pendingDef.footprintCols, pendingDef.footprintRows, 0);
      const col = clamp(tile.col, 0, GRID_COLS - cols);
      const row = clamp(tile.row, 0, GRID_ROWS - rows);
      const candidate = { col, row };
      onPreviewTile(candidate, isPositionValid(candidate, cols, rows, null));
      return;
    }

    if (moveModeInstanceId) {
      const item = items.find((i) => i.instanceId === moveModeInstanceId);
      const def = item ? getFurnitureDef(item.furnitureId) : undefined;
      if (item && def) {
        const { cols, rows } = getEffectiveFootprint(def.footprintCols, def.footprintRows, item.rotation);
        if (isPositionValid(tile, cols, rows, moveModeInstanceId)) {
          onMoveItem(moveModeInstanceId, tile);
          onWalkTo(tile);
        }
      }
      onCancelMoveMode();
      return;
    }

    onWalkTo(tile);
    onSelectItem(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative touch-none select-none"
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT + ROOM_WALL_HEIGHT }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute left-0" style={{ top: ROOM_WALL_HEIGHT, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        {wallSet && <RoomWalls wallSet={wallSet} />}

        {tiles.map((t) => (
          <div key={`${t.col}-${t.row}`} onClick={() => handleTileTap(t)}>
            <IsoTile
              col={t.col}
              row={t.row}
              floorColor={floorDef?.color}
              highlighted={moveModeInstanceId !== null && ghostPosition?.col === t.col && ghostPosition?.row === t.row}
            />
          </div>
        ))}

        {draggingId && ghostPosition && (
          <IsoTile col={ghostPosition.col} row={ghostPosition.row} highlighted={ghostValid} invalid={!ghostValid} />
        )}

        <CharacterSprite position={character.position} isWalking={character.isWalking} direction={character.direction} />

        {placedItems.map((item) => {
          const def = getFurnitureDef(item.furnitureId);
          if (!def) return null;
          const isDragging = draggingId === item.instanceId;
          const position = isDragging && ghostPosition ? ghostPosition : item.position;

          return (
            <IsoFurnitureItem
              key={item.instanceId}
              def={def}
              position={position}
              rotation={item.rotation}
              isDragging={isDragging}
              isSelected={selectedInstanceId === item.instanceId}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleItemPointerDown(item.instanceId, def, item.position, item.rotation)(e);
              }}
            />
          );
        })}

        {pendingDef && previewPosition && (
          <>
            <IsoTile
              col={previewPosition.col}
              row={previewPosition.row}
              highlighted
              invalid={
                !isPositionValid(
                  previewPosition,
                  getEffectiveFootprint(pendingDef.footprintCols, pendingDef.footprintRows, 0).cols,
                  getEffectiveFootprint(pendingDef.footprintCols, pendingDef.footprintRows, 0).rows,
                  null
                )
              }
            />
            <IsoFurnitureItem
              def={pendingDef}
              position={previewPosition}
              rotation={0}
              isDragging={false}
              isSelected={false}
              onPointerDown={() => {}}
              ghost
              ghostValid={isPositionValid(
                previewPosition,
                getEffectiveFootprint(pendingDef.footprintCols, pendingDef.footprintRows, 0).cols,
                getEffectiveFootprint(pendingDef.footprintCols, pendingDef.footprintRows, 0).rows,
                null
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
