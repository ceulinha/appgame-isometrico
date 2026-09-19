import type { CharacterLayerOption, CharacterAppearance } from '../types';

/**
 * Catálogo de camadas do personagem. Cada slot (body/hair/shirt/pants/shoes/
 * accessory) tem suas próprias opções. Por enquanto todas as opções têm
 * `frames: {}` (vazio) porque ainda não há sprites — o componente
 * CharacterSprite cai automaticamente no placeholder emoji nesse caso.
 *
 * Pra ligar um sprite de verdade: preencha `frames.idle.front = ['/caminho/para/body_idle_front.png']`
 * (e o mesmo pras outras direções/estado 'walk' com vários frames).
 */
export const CHARACTER_LAYER_CATALOG: CharacterLayerOption[] = [
  { id: 'body-default', name: 'Corpo padrão', slot: 'body', frames: {} },
  { id: 'hair-curto', name: 'Cabelo curto', slot: 'hair', frames: {} },
  { id: 'shirt-azul', name: 'Camiseta azul', slot: 'shirt', frames: {} },
  { id: 'pants-padrao', name: 'Calça padrão', slot: 'pants', frames: {} },
  { id: 'shoes-padrao', name: 'Tênis', slot: 'shoes', frames: {} },
];

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  body: 'body-default',
  hair: 'hair-curto',
  shirt: 'shirt-azul',
  pants: 'pants-padrao',
  shoes: 'shoes-padrao',
};

export function getLayerOption(id: string | undefined): CharacterLayerOption | undefined {
  return id ? CHARACTER_LAYER_CATALOG.find((l) => l.id === id) : undefined;
}

/** Ordem de empilhamento visual, de trás pra frente. */
export const LAYER_STACK_ORDER: CharacterLayerOption['slot'][] = [
  'body',
  'pants',
  'shirt',
  'shoes',
  'hair',
  'accessory',
];
