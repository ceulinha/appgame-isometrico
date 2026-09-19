import type { FurnitureDef, GridPosition, Rotation } from '../types';
import { getFootprintBox, getEffectiveFootprint, getDepthIndex } from '../utils/iso';

interface IsoFurnitureItemProps {
  def: FurnitureDef;
  position: GridPosition;
  rotation: Rotation;
  isDragging: boolean;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  ghost?: boolean;
  ghostValid?: boolean;
}

export default function IsoFurnitureItem({
  def,
  position,
  rotation,
  isDragging,
  isSelected,
  onPointerDown,
  ghost = false,
  ghostValid = true,
}: IsoFurnitureItemProps) {
  const { cols, rows } = getEffectiveFootprint(def.footprintCols, def.footprintRows, rotation);
  const box = getFootprintBox(position.col, position.row, cols, rows);
  const isFlat = cols >= 2 && rows >= 2; // ex: tapete — sem "altura"
  const lift = isFlat ? 0 : 14;

  // Só usa arte real quando existe EXATAMENTE para essa rotação — nada de
  // "derivar" via CSS, porque uma imagem 2D girada 180° também inverte o
  // objeto de cima para baixo, o que não é o que acontece de verdade quando
  // um móvel gira no mundo. Sem arte pra essa rotação, cai no placeholder.
  const imageSrc = def.images?.[rotation];

  return (
    <div
      onPointerDown={ghost ? undefined : onPointerDown}
      className={`absolute ${ghost ? 'pointer-events-none' : 'touch-none'}`}
      style={{
        left: box.left,
        top: box.top - lift,
        width: box.width,
        height: box.height + lift,
        zIndex: getDepthIndex(position.col, position.row, def.heightUnits ?? 1) + (isDragging ? 1000 : 0),
        opacity: ghost ? (ghostValid ? 0.55 : 0.35) : isDragging ? 0.85 : 1,
        cursor: ghost ? 'default' : 'grab',
        filter: ghost
          ? ghostValid
            ? 'drop-shadow(0 0 0 rgba(0,0,0,0))'
            : 'saturate(0.4)'
          : isDragging
          ? 'drop-shadow(0 10px 12px rgba(0,0,0,0.25))'
          : 'drop-shadow(0 4px 4px rgba(0,0,0,0.15))',
      }}
    >
      {imageSrc ? (
        <div
          className="absolute bottom-0 flex items-end justify-center"
          style={{ left: 0, width: box.width, height: box.height }}
        >
          <img src={imageSrc} alt={def.name} className="h-full w-full object-contain" draggable={false} />
          {isSelected && (
            <div
              className="pointer-events-none absolute inset-0 rounded-md"
              style={{ boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.85)' }}
            />
          )}
        </div>
      ) : (
        <>
          {!isFlat && (
            <div
              className="absolute bottom-0"
              style={{
                left: 0,
                width: box.width,
                height: box.height / 2 + lift,
                clipPath: box.polygon,
                background: def.color,
                filter: 'brightness(0.75)',
                transform: `translateY(${lift}px)`,
              }}
            />
          )}
          <div
            className="absolute top-0 flex items-center justify-center"
            style={{
              left: 0,
              width: box.width,
              height: box.height,
              clipPath: box.polygon,
              background: def.color,
              outline: isSelected ? '3px solid white' : 'none',
              outlineOffset: -2,
            }}
          >
            <span style={{ fontSize: Math.min(box.width, box.height) * 0.4 }}>{def.emoji}</span>
          </div>
        </>
      )}

      {isSelected && (
        <span
          className="absolute rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink shadow"
          style={{ left: box.width / 2 - 12, top: -18 }}
        >
          {rotation}°
        </span>
      )}
    </div>
  );
}
