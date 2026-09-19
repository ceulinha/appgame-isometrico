import type { WallSet, FloorDef, RoomEnvironment } from '../types';
import wallA from '../assets/sprites/environment/walls/wall_bedroom_a.png';
import wallB from '../assets/sprites/environment/walls/wall_bedroom_b.png';

/**
 * Cada WallSet junta as duas paredes de fundo (aresta 'direita' e 'esquerda'
 * da grade) que devem combinar visualmente entre si. Pra trocar o papel de
 * parede do quarto, basta adicionar um novo WallSet aqui — nenhum componente
 * precisa mudar.
 */
export const WALL_SETS: WallSet[] = [
  {
    id: 'quarto-lilas',
    name: 'Quarto lilás',
    images: { direita: wallA, esquerda: wallB },
  },
];

/**
 * Piso ainda sem sprite de textura — usa a cor sólida como fallback.
 * Quando houver um tile de piso (ex: floor_wood_01.png), preencher `sprite`.
 */
export const FLOOR_DEFS: FloorDef[] = [{ id: 'padrao', name: 'Padrão', color: 'rgba(255,255,255,0.5)' }];

export const ROOM_ENVIRONMENTS: RoomEnvironment[] = [
  { id: 'quarto', name: 'Meu Quarto', wallSetId: 'quarto-lilas', floorId: 'padrao' },
];

export function getWallSet(id: string): WallSet | undefined {
  return WALL_SETS.find((w) => w.id === id);
}

export function getFloorDef(id: string): FloorDef | undefined {
  return FLOOR_DEFS.find((f) => f.id === id);
}
