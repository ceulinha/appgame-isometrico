export interface GridPosition {
  col: number;
  row: number;
}

export type Rotation = 0 | 90 | 180 | 270;

// ===== Objetos (móveis, decoração) =====
// Ver ASSETS.md para a convenção completa de sprite/origem/nomenclatura.

export interface FurnitureDef {
  id: string;
  name: string;
  category: string; // ex: 'bedroom' — bate com a subpasta em assets/sprites/furniture/
  emoji: string; // fallback visual enquanto não há sprite
  color: string; // fallback visual enquanto não há sprite
  footprintCols: number; // largura ocupada no chão (grid units)
  footprintRows: number; // profundidade ocupada no chão (grid units)
  heightUnits?: number; // altura relativa, só usada para desempate de profundidade (padrão 1)
  interaction?: string; // ex: 'sleep', 'sit', 'decor' — a lógica do jogo decide o que fazer com isso
  /**
   * Sprites reais, um por rotação (0/90/180/270°). Um item simétrico
   * (ex: tapete redondo, criado-mudo) só precisa preencher rot0 — as
   * outras rotações reaproveitam a mesma imagem automaticamente.
   * Sem entrada pra uma rotação = cai no fallback emoji/cor.
   */
  images?: Partial<Record<Rotation, string>>;
}

export interface PlacedFurniture {
  instanceId: string;
  furnitureId: string;
  position: GridPosition;
  rotation: Rotation;
  placed: boolean; // false = está no inventário, ainda não posicionado na cena
}

// ===== Ambiente (paredes/piso) — catálogo plugável =====

export interface WallSet {
  id: string;
  name: string;
  /** 'direita' = aresta do canto de trás até o canto direito; 'esquerda' = até o canto esquerdo. */
  images: { direita: string; esquerda: string };
}

export interface FloorDef {
  id: string;
  name: string;
  color: string; // fallback sólido
  sprite?: string; // textura de tile repetível (opcional, ainda não usada)
}

export interface RoomEnvironment {
  id: string;
  name: string;
  wallSetId: string;
  floorId: string;
}

// ===== Personagem modular (por camadas) =====
// Ver ASSETS.md — todas as camadas de todas as roupas devem usar o mesmo
// canvas/origem/tamanho pra encaixar sem ajuste manual.

export type Direction = 'front' | 'back' | 'left' | 'right';
export type CharacterAnimState = 'idle' | 'walk';
export type CharacterSlot = 'body' | 'hair' | 'shirt' | 'pants' | 'shoes' | 'accessory';

/** Frames de uma camada por estado de animação e direção. Sem entrada = camada não desenha nada nessa combinação. */
export type LayerFrameSet = Partial<Record<CharacterAnimState, Partial<Record<Direction, string[]>>>>;

export interface CharacterLayerOption {
  id: string;
  name: string;
  slot: CharacterSlot;
  frames: LayerFrameSet; // vazio = ainda sem sprite, cai no placeholder
}

export interface CharacterAppearance {
  body: string; // id de CharacterLayerOption do slot 'body'
  hair?: string;
  shirt?: string;
  pants?: string;
  shoes?: string;
  accessory?: string;
}

export interface CharacterState {
  position: GridPosition;
  isWalking: boolean;
  direction: Direction;
}
