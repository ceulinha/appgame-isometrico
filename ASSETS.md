# Mundo do Léo — Especificação de Assets

Este documento é a referência pra gerar qualquer sprite (no ChatGPT ou outra ferramenta) e ele já "encaixar" no jogo sem ajuste manual de código. Sempre que possível, cole trechos deste arquivo direto no prompt de geração de imagem.

## 1. Projeção e grade

- Isométrica 2:1 (dimétrica), câmera fixa, luz vindo do canto **superior-esquerdo** em todos os sprites
- Tile lógico de referência: **96×48px** (proporção 2:1) — é a área que 1 unidade de chão ocupa na tela
- Um objeto pode ocupar mais de 1 tile (2×1, 1×2, 2×2, 3×2...) — a "pegada no chão" (`footprintCols`×`footprintRows`) é dado, não é lida da imagem
- O sprite pode (e geralmente deve) ser **maior** que a pegada no chão, pra dar conta da altura do objeto (ex: uma cama com cabeceira alta)

## 2. Regras gerais de toda imagem

- **Fundo transparente** (PNG), sem chão, sem sombra de cena incorporada, sem paredes no sprite do objeto
- **Um objeto por imagem** — nunca "vários móveis numa imagem só"
- Contorno limpo e discreto, cores planas com sombreado suave (cel-shading leve), sem textura fotorrealista
- Mesma direção de luz em **todos** os sprites do jogo — nunca varie isso de imagem pra imagem

## 3. Origem (ponto de ancoragem)

A origem de um sprite é o **ponto de contato com o chão**, não o centro da imagem. Na prática: ao posicionar o objeto, o código ancora o sprite pelo centro-inferior da caixa que ele ocupa no grid (ver `getFootprintBox` em `src/utils/iso.ts`). Isso significa:

- Ao desenhar o objeto, deixe a margem inferior da arte coincidindo com a base/pés do objeto (sem espaço vazio embaixo)
- Objetos altos (guarda-roupa, estante) "crescem pra cima" a partir da base — a base é o que se alinha ao tile, não o topo

## 4. Móveis e objetos

**Pasta:** `src/assets/sprites/furniture/<categoria>/`
**Nomenclatura:** `<nome>_<numero>_<rotação>.png` — ex: `bed_01_0.png`, `bed_01_90.png`, `chair_02_0.png`

- `<categoria>` = cômodo/tipo (`bedroom`, `kitchen`, `bathroom`...) — vira subpasta
- `<rotação>` = `0`, `90`, `180` ou `270`. **Um objeto assimétrico (que fica diferente visto de cada lado) precisa das 4.** Não existe atalho matemático confiável pra economizar isso (já tentamos e não funciona — ver histórico no README do protótipo)
- Objetos simétricos (luminária redonda, mesa quadrada) só precisam de `_0`

**Prompt-base sugerido** (adapte o objeto e a direção):
> "Isometric [objeto], 2:1 dimetric projection, viewed from a fixed isometric camera angle (matching a 96×48px floor tile grid), transparent background, no floor or shadow baked in — just the object, flat colors, soft cel-shaded lighting from the upper-left, cute cartoon children's game style, thin clean outlines. [orientação: headboard/front facing top-left corner / top-right corner / etc]."

**Cadastro no código** (`src/data/furniture.ts`):
```ts
{
  id: 'cama',
  name: 'Cama',
  category: 'bedroom',
  emoji: '🛏️',        // fallback enquanto não há sprite
  color: '#6C5CE7',    // fallback enquanto não há sprite
  footprintCols: 2,
  footprintRows: 1,
  heightUnits: 1,      // usado só pra desempate de profundidade
  interaction: 'sleep',// livre — a lógica do jogo decide o que fazer
  images: { 0: bed01_0, 90: bed01_90 },
}
```
Sem imagem pra uma rotação específica → o jogo cai automaticamente no emoji/cor de fallback (nunca quebra visualmente).

## 5. Paredes e piso (ambiente)

**Pasta:** `src/assets/sprites/environment/walls/` e `.../floors/`

Uma parede é a aresta "de trás" da grade (onde as duas paredes se encontram no canto mais distante da câmera, formando um "V"). O jogo recorta a imagem exatamente no formato da aresta (não depende do ângulo exato desenhado) — então a imagem só precisa ser uma textura de parede plausível, com porta/janela desenhada onde fizer sentido.

**Cadastro** (`src/data/environment.ts`) — um `WallSet` agrupa as duas paredes que devem combinar visualmente:
```ts
{ id: 'quarto-lilas', name: 'Quarto lilás', images: { direita: wallA, esquerda: wallB } }
```
Pra trocar o papel de parede, basta adicionar um novo `WallSet` — nenhum componente muda.

Piso: ainda não usa textura (cai numa cor sólida via `FloorDef.color`). Quando houver um tile de chão pronto, adicionar `sprite` ao `FloorDef` correspondente.

## 6. Personagem modular (por camadas)

**Pasta:** `src/assets/sprites/characters/<slot>/` onde `<slot>` é `body`, `hair`, `shirt`, `pants`, `shoes`, `accessories`

**Regra de ouro:** todas as camadas de todas as roupas devem ter **o mesmo canvas (tamanho de imagem), a mesma origem e a mesma pose de base** — senão uma camiseta não encaixa no corpo. Gere sempre a partir do mesmo template/corpo-base como referência de proporção.

**Direções:** `front`, `back`, `left`, `right` (4 direções por enquanto; 8 é possível depois, mas dobra o trabalho de arte — comece com 4)

**Estados de animação:** `idle` (1 frame costuma bastar) e `walk` (recomendado 4 frames por direção)

**Nomenclatura:** `<slot>_<estado>_<direção>_<frame>.png` — ex:
```
body_idle_front_01.png
body_walk_front_01.png
body_walk_front_02.png
body_walk_front_03.png
body_walk_front_04.png
body_walk_back_01.png
...
shirt_walk_front_01.png
...
```

**Ordem de empilhamento** (de trás pra frente, já fixada no código em `LAYER_STACK_ORDER`): body → pants → shirt → shoes → hair → accessory.

**Cadastro** (`src/data/characterLayers.ts`):
```ts
{
  id: 'shirt-azul',
  name: 'Camiseta azul',
  slot: 'shirt',
  frames: {
    idle: { front: ['/.../shirt_idle_front_01.png'], back: [...], left: [...], right: [...] },
    walk: { front: ['/.../shirt_walk_front_01.png', '.../02.png', '.../03.png', '.../04.png'], ... },
  },
}
```
Sem nenhuma camada com sprite → o jogo cai no personagem placeholder (emoji 🧒) — nunca quebra.

## 7. Profundidade (o que desenha na frente de quê)

Centralizada em `getDepthIndex(col, row, heightUnits)` (`src/utils/iso.ts`). Regra: quanto maior `col+row`, mais perto da câmera (na frente). `heightUnits` só desempata objetos que dividem o mesmo tile. Todo elemento da cena (móvel, personagem) usa essa mesma função — não há ordenação manual por "ordem de inserção".

## 8. Paleta de referência

| Uso | Cor |
|---|---|
| Roxo principal (violet) | `#6C5CE7` |
| Roxo escuro (grape) | `#2B1B4D` |
| Coral (ação/alerta) | `#FF6B5B` |
| Dourado (destaque) | `#FFB800` |
| Menta (positivo/confirmar) | `#2AD9B8` |
| Rosa (decoração) | `#F06BB0` |

Use como referência de tom pros móveis/roupas — não precisa ser exato, mas evite cores que destoem muito dessa paleta.

## 9. Checklist antes de me mandar um sprite novo

- [ ] Fundo transparente
- [ ] Luz vindo de cima-esquerda
- [ ] Margem inferior sem espaço vazio (origem correta)
- [ ] Nome do arquivo segue a convenção da seção 4 ou 6
- [ ] Se for móvel assimétrico: as 4 rotações; se for personagem: todas as direções necessárias com o mesmo canvas
