# Projeto: Preservação da Estética AutoCAD (Cores ACI) com Foco em Performance

## 1. Objetivo
Modificar o fluxo de importação e renderização do Editor CAD para exibir as cores originais do arquivo DXF (paleta AutoCAD / ACI), mantendo a arquitetura de camadas funcionais do GeoLimites e **sem adicionar overhead de processamento** ao tempo de abertura de arquivos complexos (que atualmente já representa um gargalo de performance).

## 2. Diagnóstico e Diretrizes de Performance
Atualmente, a normalização de camadas no GeoLimites altera a camada da entidade e descarta a identidade visual original. Tentar inferir ou manipular as cores no pós-processamento agravaria o tempo de carregamento (atualmente em ~10 minutos para arquivos pesados).

**Diretrizes de Execução:**
1. **Leitura Passiva (Zero Overhead):** A captura de cores deve ocorrer no exato mesmo loop de leitura (`while`) já existente no `dxfParser.ts`. Não haverá iterações extras no array de entidades.
2. **Separação de Preocupações:** O `normalizeDxfToFunctionalLayers.ts` não deve recalcular cores. Ele apenas preservará o metadado original.
3. **Resolução Lazy (No Renderizador):** A decisão final de qual cor pintar (BYLAYER vs BYENTITY) ocorrerá apenas na hora do desenho (`ctx.stroke()`), aproveitando a alta performance do Canvas API.

## 3. Fases de Execução

### Fase 1: Mapeamento de Cores ACI
- **O que fazer:** Criar um arquivo utilitário (`aciColors.ts`) exportando um Array estático ou Map contendo os 255 códigos Hexadecimais padrão do AutoCAD.
- **Por que:** É a conversão mais rápida (O(1)) para traduzir o código `62` do DXF para uma string Hexagonal pronta para o Canvas.

### Fase 2: Captura no Parser (`dxfParser.ts`)
- **O que fazer:**
  1. Na função `parseLayer()`, interceptar o grupo `62` para salvar a cor base da Layer.
  2. Na função genérica de `parseEntity()`, interceptar o grupo `62` para salvar a cor forçada da entidade (se houver).
- **Como guardar:** Adicionar as propriedades `aciColor?: number` (na entidade) e `color?: number` (na DXFLayer). Isso adiciona apenas bytes de memória, sem custo de processamento.

### Fase 3: Ajuste da Normalização Leve (`normalizeDxfToFunctionalLayers.ts`)
- **O que fazer:** Ao clonar a entidade para jogar na camada `GEOMETRIA`, `AUXILIAR`, etc., garantir que as propriedades visuais (`aciColor` e a referência à camada original) sejam mantidas.
- **Cuidado de Performance:** Garantir que o `cloneEntityWithLayer` não use métodos pesados (como `JSON.parse/stringify` profundo) para clonagem, apenas um espalhamento (`...`) raso e eficiente.

### Fase 4: Atualização do Renderizador (`useViewerCanvasRenderer.ts`)
- **O que fazer:** Modificar a função que define o estilo do `ctx`.
- **Lógica de Resolução (Lazy):**
  ```typescript
  // 1. Se tem cor própria (ACI na entidade), usa ela.
  // 2. Se não, usa a cor da camada original (originalLayer ACI).
  // 3. Se falhar, cai para a cor padrão do GeoLimites.
  ```

## 4. Métricas de Aceite e Validação
- **Fidelidade Visual:** O DXF deve abrir com as linhas vermelhas, blocos coloridos e textos amarelos correspondendo ao AutoCAD (Imagem de referência: Fundo branco, mas com as cores ACI corretas).
- **Manutenção Funcional:** O painel direito de camadas ainda deve exibir e controlar a visibilidade pelas abas `GEOMETRIA`, `LOTES`, `LIMITES`, etc.
- **Performance (Gargalo):** O tempo de parse/abertura não pode aumentar. A adição do tracking de grupo `62` é uma operação bit a bit/inteira que deve ter impacto zero no V8 engine.

## 5. Próximos Passos (Ação do Assistente)
Ao aprovar este projeto, iniciaremos a execução linear da **Fase 1 e Fase 2**, criando o mapa ACI e injetando as leituras de código `62` no parser.
