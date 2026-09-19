import type { FurnitureDef } from '../types';
import bed01_0 from '../assets/sprites/furniture/bedroom/bed_01_0.png';
import bed01_90 from '../assets/sprites/furniture/bedroom/bed_01_90.png';

export const FURNITURE_CATALOG: FurnitureDef[] = [
  {
    id: 'cama',
    name: 'Cama',
    category: 'bedroom',
    emoji: '🛏️',
    color: '#6C5CE7',
    footprintCols: 2,
    footprintRows: 1,
    heightUnits: 1,
    interaction: 'sleep',
    images: { 0: bed01_0, 90: bed01_90 },
  },
  { id: 'guarda-roupa', name: 'Guarda-roupa', category: 'bedroom', emoji: '🚪', color: '#8A5535', footprintCols: 1, footprintRows: 1, heightUnits: 2, interaction: 'storage' },
  { id: 'escrivaninha', name: 'Escrivaninha', category: 'bedroom', emoji: '🖥️', color: '#4F8FE8', footprintCols: 1, footprintRows: 1, heightUnits: 1, interaction: 'study' },
  { id: 'tapete', name: 'Tapete', category: 'bedroom', emoji: '🟪', color: '#F06BB0', footprintCols: 2, footprintRows: 2, heightUnits: 0, interaction: 'decor' },
  { id: 'luminaria', name: 'Luminária', category: 'bedroom', emoji: '💡', color: '#FFB800', footprintCols: 1, footprintRows: 1, heightUnits: 1, interaction: 'toggle' },
  { id: 'caixa-brinquedos', name: 'Caixa de brinquedos', category: 'bedroom', emoji: '🧸', color: '#2AD9B8', footprintCols: 1, footprintRows: 1, heightUnits: 1, interaction: 'decor' },
];

export function getFurnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}

/**
 * Quantidade que a criança possui de cada móvel (kit inicial, sem loja
 * infinita) — cama e guarda-roupa já começam colocados no quarto; o resto
 * começa no inventário, pronto pra ser posicionado.
 */
export const STARTING_QUANTITIES: Record<string, number> = {
  cama: 1,
  'guarda-roupa': 1,
  escrivaninha: 1,
  tapete: 1,
  luminaria: 2,
  'caixa-brinquedos': 1,
};
