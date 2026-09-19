# Mundo Léo — Protótipo do Quarto Isométrico

Protótipo isolado pra testar a mecânica de **decorar o quarto em estilo isométrico 2D**: arrastar móveis, posicionar livremente numa grade, sem sobrepor uns aos outros. Feito com React + TypeScript + Vite + Tailwind CSS.

A **cama e as duas paredes de fundo já usam arte de verdade** (enviada por você). Os outros móveis do catálogo ainda são placeholders (blocos coloridos com emoji) até você mandar as imagens deles também.

**📄 Veja `ASSETS.md`** — especificação completa pra gerar qualquer sprite novo (resolução, nomenclatura, origem, paletas, prompts prontos) e ele encaixar no jogo sem ajuste manual.

## Arquitetura gráfica (Fase de padronização)

- **Objetos**: dado + sprite separados (`src/types/index.ts` → `FurnitureDef`; catálogo em `src/data/furniture.ts`). Sem sprite pra uma rotação = cai em emoji/cor de fallback.
- **Ambiente (paredes/piso)**: catálogo plugável em `src/data/environment.ts` (`WallSet`, `FloorDef`, `RoomEnvironment`) — trocar o visual do quarto é adicionar dado, não código.
- **Personagem modular**: camadas (corpo/cabelo/roupa/calça/sapato/acessório) em `src/data/characterLayers.ts` + `src/components/CharacterSprite.tsx`. Sem sprites ainda = cai no emoji 🧒 placeholder. 4 direções (`front/back/left/right`) e 2 estados (`idle`/`walk`) já wireados.
- **Profundidade**: centralizada em `getDepthIndex()` (`src/utils/iso.ts`), usada por móveis e personagem.
- **Pasta de assets**: `src/assets/sprites/{furniture,environment,characters}/...` — ver `ASSETS.md` pra nomenclatura e specs completas antes de gerar qualquer sprite novo.


## Histórico de correções e novidades

**Paredes desalinhadas** (corrigido): uso recorte exato (clip-path) que casa com o chão, em vez de esticar a imagem numa caixa retangular simples.

**Cama de cabeça para baixo ao girar** (corrigido): o truque antigo de "economizar" imagens girando a arte 180° em CSS estava matematicamente errado — isso também inverte o objeto de cima para baixo. **Pra ter as 4 rotações reais de um móvel assimétrico, é preciso gerar as 4 imagens mesmo.** Por enquanto a cama cicla só entre 0°/90° (as que têm arte real).

**Personagem jogável**: um personagem (🧒, placeholder simples) anda pela cena. Toque em qualquer tile ou móvel e ele vai até lá, com uma animação de pulinho. Ao confirmar a colocação de um móvel, ele também anda até o local.

**Sem barra fixa / Inventário em modal**: a barra inferior permanente foi removida. Agora existe um botão flutuante "🎒 Inventário" no topo (com contador de itens disponíveis) que abre uma janela com os móveis que você possui.

**Quantidade respeitada**: não existe mais "loja infinita" — cada móvel tem uma quantidade inicial fixa (definida em `STARTING_QUANTITIES`, em `src/data/furniture.ts`). Se você só tem 1 cama, só pode posicionar essa 1; o inventário mostra quantas unidades de cada item ainda estão disponíveis pra colocar.

**Fluxo de confirmação ao posicionar**: escolher um item no inventário não o coloca na hora — ele aparece como uma prévia semitransparente ("fantasma") no tile mais indicado, e você pode tocar em outros tiles pra mover essa prévia. Só quando você toca em "✅ Confirmar" o móvel é colocado de verdade (e o personagem anda até lá). Dá pra tocar em "✖ Cancelar" a qualquer momento pra voltar sem colocar nada.

**Remover devolve ao inventário**: tocar em "🗑️ Remover" num móvel da cena não apaga ele — devolve pro inventário, de onde pode ser colocado de novo depois.

**Botão "✋ Mover"**: alternativa ao arrastar — seleciona, toca em Mover, toca no tile de destino.

## Como rodar

```bash
npm install
npm run dev
```

Pelo celular na mesma rede Wi-Fi: `npm run dev -- --host`.

## O que testar

- O quarto começa só com **cama** e **guarda-roupa** já colocados; o resto do kit inicial (escrivaninha, tapete, 2 luminárias, caixa de brinquedos) começa no inventário
- Toque em **"🎒 Inventário"** (canto superior direito) — veja a quantidade disponível de cada item
- Toque num item do inventário — ele fecha o modal e mostra uma **prévia semitransparente** no quarto; toque em outros tiles pra mover essa prévia, depois toque em **"✅ Confirmar"** (o personagem anda até lá) ou **"✖ Cancelar"**
- Coloque todas as unidades de um item (ex: as 2 luminárias) e note que ele some do inventário — não tem mais "loja infinita"
- Toque num móvel já colocado pra selecionar e use **"✋ Mover"**, **"🔄 Girar"** ou **"🗑️ Remover"** (volta pro inventário, não some pra sempre)
- Toque em qualquer tile vazio ou em qualquer móvel e veja o personagem andar até lá
- O tapete (2×2) e a cama (2×1) ocupam mais de um tile — repare como o sistema já lida com tamanhos diferentes

## Como foi construído

- `src/utils/iso.ts` — toda a matemática da projeção isométrica: conversão de coordenada de grade (linha/coluna) para posição de tela, o caminho inverso (usado durante o arrastar), e o cálculo de posição/recorte das paredes
- `src/data/furniture.ts` — catálogo de móveis. Cada um tem um `id`, emoji/cor placeholder, o tamanho que ocupa na grade (`footprintCols` x `footprintRows`), e opcionalmente `images` por rotação
- `src/components/IsoTile.tsx` — um losango do chão
- `src/components/IsoFurnitureItem.tsx` — um móvel posicionado (imagem real quando existe pra rotação atual, senão um bloco colorido com emoji)
- `src/components/RoomWalls.tsx` — as duas paredes de fundo, recortadas exatamente no formato da aresta da grade
- `src/components/CharacterToken.tsx` — o personagem jogável, com animação simples enquanto anda
- `src/components/RoomCanvas.tsx` — a cena inteira: desenha a grade, as paredes, o personagem e os móveis; cuida do arrastar, do modo "Mover" por toque, e das checagens de posição válida
- `src/App.tsx` — o estado geral: quais móveis existem (posicionados ou no inventário), seleção, e a movimentação do personagem

## Sobre as paredes

As duas paredes de fundo (`src/assets/room/`) são posicionadas e recortadas (clip-path) automaticamente ao longo das duas arestas "de trás" da grade — as que se encontram no canto mais distante da câmera, formando o "V" do canto do quarto. A matemática está em `getWallBox()`, dentro de `src/utils/iso.ts`. Como o recorte é calculado a partir da própria grade (não depende do ângulo exato desenhado na imagem), o alinhamento fica preciso mesmo que a arte original não seja perfeitamente 2:1 — a imagem é usada como "textura" preenchendo a forma certa.

## Como trocar os placeholders pela arte de verdade

Cada item do catálogo (`src/data/furniture.ts`) tem um campo `images` opcional — um objeto com uma imagem por rotação. **Para um móvel assimétrico (que fica diferente visto de cada lado, como uma cama ou sofá), é preciso gerar as 4 imagens** (0°, 90°, 180°, 270°) — não existe atalho matematicamente válido pra economizar essa etapa (veja a explicação em "Correções de bugs" no topo). Itens totalmente simétricos (ex: luminária redonda, mesa quadrada) só precisam da posição `0`.

Exemplo real, olhando como a cama já está configurada (por enquanto só com 0° e 90°):
```ts
import cama0 from '../assets/furniture/cama-0.png';
import cama90 from '../assets/furniture/cama-90.png';

{
  id: 'cama',
  name: 'Cama',
  emoji: '🛏️',
  color: '#6C5CE7',
  footprintCols: 2,
  footprintRows: 1,
  images: { 0: cama0, 90: cama90 },
}
```

Passos pra adicionar um novo móvel com arte real:
1. Gere as imagens (prompt no formato que já combinamos: isométrico 2:1, fundo transparente, mesma escala/luz) — as 4 rotações, se o móvel for assimétrico
2. Coloque os arquivos em `src/assets/furniture/`
3. Importe e adicione no catálogo, do mesmo jeito que a cama acima
4. O componente já está preparado — quando existe imagem pra rotação atual, ele usa ela em vez do bloco colorido com emoji; sem imagem pra aquela rotação específica, cai no placeholder (em vez de mostrar algo errado)

## Próximos passos, se você aprovar essa direção

1. Gerar as imagens de 180°/270° da cama (e dos próximos móveis) pra ter as 4 rotações reais
2. Arte de verdade para o personagem (com sprite de andar em vez do emoji atual)
3. Trazer esse sistema pra dentro do app principal, substituindo a tela "Casa" atual
4. Adicionar mais cômodos (cozinha, banheiro, sala...) reaproveitando esse mesmo sistema de grade
5. Depois, a "cidade" como um mapa separado com locais clicáveis
