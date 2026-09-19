// Projeção isométrica clássica (proporção 2:1).
export const TILE_WIDTH = 96; // px, largura total do losango
export const TILE_HEIGHT = 48; // px, altura total do losango

export const GRID_COLS = 6;
export const GRID_ROWS = 6;

// Altura reservada acima do chão para as paredes de fundo aparecerem inteiras.
export const ROOM_WALL_HEIGHT = 170;

// Deslocamento para que a grade inteira fique com coordenadas positivas
// dentro do container (já que gridToScreen pode gerar x negativo).
export const ORIGIN_OFFSET_X = ((GRID_ROWS - 1) * TILE_WIDTH) / 2;
export const CANVAS_WIDTH = ((GRID_COLS - 1) + (GRID_ROWS - 1)) * (TILE_WIDTH / 2) + TILE_WIDTH;
export const CANVAS_HEIGHT = ((GRID_COLS - 1) + (GRID_ROWS - 1)) * (TILE_HEIGHT / 2) + TILE_HEIGHT;

export function gridToScreen(col: number, row: number): { x: number; y: number } {
  const x = (col - row) * (TILE_WIDTH / 2);
  const y = (col + row) * (TILE_HEIGHT / 2);
  return { x, y };
}

export function screenToGrid(x: number, y: number): { col: number; row: number } {
  const col = (x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2;
  const row = (y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2;
  return { col: Math.round(col), row: Math.round(row) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isWithinGrid(col: number, row: number, footprintCols = 1, footprintRows = 1): boolean {
  return col >= 0 && row >= 0 && col + footprintCols <= GRID_COLS && row + footprintRows <= GRID_ROWS;
}

export function getFootprintCells(position: { col: number; row: number }, cols: number, rows: number) {
  const cells: { col: number; row: number }[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      cells.push({ col: position.col + c, row: position.row + r });
    }
  }
  return cells;
}

/** Busca em largura simples (4 direções) evitando tiles ocupados. */
export function pathfind(
  start: { col: number; row: number },
  goal: { col: number; row: number },
  isBlocked: (col: number, row: number) => boolean
): { col: number; row: number }[] {
  const key = (p: { col: number; row: number }) => `${p.col},${p.row}`;
  const queue: { col: number; row: number }[] = [start];
  const visited = new Set([key(start)]);
  const cameFrom = new Map<string, { col: number; row: number }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.col === goal.col && current.row === goal.row) break;

    const neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];
    for (const n of neighbors) {
      if (!isWithinGrid(n.col, n.row)) continue;
      if (isBlocked(n.col, n.row) && !(n.col === goal.col && n.row === goal.row)) continue;
      if (visited.has(key(n))) continue;
      visited.add(key(n));
      cameFrom.set(key(n), current);
      queue.push(n);
    }
  }

  if (!visited.has(key(goal))) return [start]; // sem caminho — não anda
  const path = [goal];
  let cur = goal;
  while (key(cur) !== key(start)) {
    const prev = cameFrom.get(key(cur));
    if (!prev) break;
    path.unshift(prev);
    cur = prev;
  }
  return path;
}

/** Girar 90° ou 270° troca largura por altura do footprint. */
export function getEffectiveFootprint(
  footprintCols: number,
  footprintRows: number,
  rotation: number
): { cols: number; rows: number } {
  return rotation === 90 || rotation === 270
    ? { cols: footprintRows, rows: footprintCols }
    : { cols: footprintCols, rows: footprintRows };
}

/**
 * Calcula a caixa de tela (posição + tamanho) e o polígono do losango
 * para um item que ocupa um retângulo de `footprintCols x footprintRows` tiles,
 * ancorado em (col, row) — o tile mais "de cima" do item.
 */
export function getFootprintBox(col: number, row: number, footprintCols: number, footprintRows: number) {
  const top = gridToScreen(col, row);
  const right = gridToScreen(col + footprintCols, row);
  const bottom = gridToScreen(col + footprintCols, row + footprintRows);
  const left = gridToScreen(col, row + footprintRows);

  const minX = Math.min(top.x, right.x, bottom.x, left.x);
  const maxX = Math.max(top.x, right.x, bottom.x, left.x);
  const width = maxX - minX;
  const height = bottom.y - top.y;

  const toPercent = (point: { x: number; y: number }) => ({
    xPct: ((point.x - minX) / width) * 100,
    yPct: ((point.y - top.y) / height) * 100,
  });

  const p = [top, right, bottom, left].map(toPercent);
  const polygon = `polygon(${p[0].xPct}% ${p[0].yPct}%, ${p[1].xPct}% ${p[1].yPct}%, ${p[2].xPct}% ${p[2].yPct}%, ${p[3].xPct}% ${p[3].yPct}%)`;

  return { left: minX + ORIGIN_OFFSET_X, top: top.y, width, height, polygon };
}

/** Converte uma posição do ponteiro (relativa ao canto do canvas) na coordenada de grade correspondente. */
export function canvasPointToGrid(canvasX: number, canvasY: number): { col: number; row: number } {
  return screenToGrid(canvasX - ORIGIN_OFFSET_X, canvasY);
}

/**
 * Caixa de posicionamento para uma parede de fundo, ancorada numa das duas
 * arestas "de trás" da grade (que se encontram no canto mais distante da câmera).
 * 'direita' = aresta do canto de trás até o canto direito (desce para a direita).
 * 'esquerda' = aresta do canto de trás até o canto esquerdo (desce para a esquerda).
 */
/**
 * Caixa de posicionamento + polígono de recorte exato para uma parede de fundo,
 * ancorada numa das duas arestas "de trás" da grade (que se encontram no canto
 * mais distante da câmera). O recorte garante alinhamento perfeito com o chão,
 * independente do ângulo exato desenhado na imagem de origem.
 * 'direita' = aresta do canto de trás até o canto direito (desce para a direita).
 * 'esquerda' = aresta do canto de trás até o canto esquerdo (desce para a esquerda).
 */
export function getWallBox(edge: 'direita' | 'esquerda', wallHeightPx: number = ROOM_WALL_HEIGHT) {
  const back = gridToScreen(0, 0);
  const end = edge === 'direita' ? gridToScreen(GRID_COLS, 0) : gridToScreen(0, GRID_ROWS);

  const backTop = { x: back.x, y: back.y - wallHeightPx };
  const endTop = { x: end.x, y: end.y - wallHeightPx };
  const endBottom = { x: end.x, y: end.y };
  const backBottom = { x: back.x, y: back.y };

  const xs = [backTop.x, endTop.x, endBottom.x, backBottom.x];
  const ys = [backTop.y, endTop.y, endBottom.y, backBottom.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  const toPercent = (p: { x: number; y: number }) => ({
    xPct: ((p.x - minX) / width) * 100,
    yPct: ((p.y - minY) / height) * 100,
  });
  const pts = [backTop, endTop, endBottom, backBottom].map(toPercent);
  const polygon = `polygon(${pts.map((p) => `${p.xPct}% ${p.yPct}%`).join(', ')})`;

  return { left: minX + ORIGIN_OFFSET_X, top: minY, width, height, polygon };
}

/**
 * Índice de profundidade pra ordenar o que desenha na frente/atrás.
 * Quanto maior (col+row), mais perto da câmera (mais "na frente").
 * heightUnits desempata objetos no mesmo tile (mais alto = na frente do mais baixo),
 * sem interferir na ordem entre tiles diferentes.
 */
export function getDepthIndex(col: number, row: number, heightUnits = 1): number {
  return (col + row) * 10 + heightUnits;
}
