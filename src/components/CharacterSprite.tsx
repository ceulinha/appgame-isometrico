import { useEffect, useRef, useState } from 'react';
import { gridToScreen, ORIGIN_OFFSET_X } from '../utils/iso';
import { LAYER_STACK_ORDER, getLayerOption } from '../data/characterLayers';
import type { GridPosition, Direction, CharacterAppearance } from '../types';

interface CharacterSpriteProps {
  position: GridPosition;
  isWalking: boolean;
  direction: Direction;
  appearance?: CharacterAppearance;
}

const SIZE = 46;
const ANIM_FPS = 6;

export default function CharacterSprite({ position, isWalking, direction, appearance }: CharacterSpriteProps) {
  const { x, y } = gridToScreen(position.col + 0.5, position.row + 0.5);
  const [frame, setFrame] = useState(0);
  const tickRef = useRef<number | null>(null);

  const state = isWalking ? 'walk' : 'idle';

  // Avança os frames de animação enquanto anda. Some sozinho quando não há
  // nenhum frame definido (ninguém chama setFrame em vão).
  useEffect(() => {
    if (!isWalking) {
      setFrame(0);
      return;
    }
    tickRef.current = window.setInterval(() => setFrame((f) => f + 1), 1000 / ANIM_FPS);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [isWalking]);

  const layers = LAYER_STACK_ORDER.map((slot) => {
    const layerId = appearance?.[slot as keyof CharacterAppearance];
    const option = getLayerOption(layerId);
    const framesForState = option?.frames[state]?.[direction as Direction];
    if (!framesForState || framesForState.length === 0) return null;
    const src = framesForState[frame % framesForState.length];
    return { slot: String(slot), src };
  }).filter((l) => l !== null) as { slot: string; src: string }[];

  const hasAnySprite = layers.length > 0;

  return (
    <div
      className="absolute flex items-center justify-center transition-[left,top] duration-200 ease-linear"
      style={{
        left: x + ORIGIN_OFFSET_X - SIZE / 2,
        top: y - SIZE + 8,
        width: SIZE,
        height: SIZE,
        zIndex: (position.col + position.row) * 10 + 5,
      }}
    >
      {hasAnySprite ? (
        <div className="relative h-full w-full">
          {layers.map((l) => (
            <img
              key={l.slot}
              src={l.src}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          ))}
        </div>
      ) : (
        // Placeholder enquanto não há sprites reais no catálogo (ver characterLayers.ts)
        <div className={`text-3xl drop-shadow-md ${isWalking ? 'animate-bounce' : ''}`}>🧒</div>
      )}
      <div className="absolute -bottom-1 h-2 w-6 rounded-full bg-black/20" style={{ filter: 'blur(1.5px)' }} />
    </div>
  );
}
