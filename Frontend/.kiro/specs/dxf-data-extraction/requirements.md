# Extração Automática de Dados Técnicos do DXF

## Introdução

O sistema deve extrair automaticamente os dados técnicos (vértices, confrontações, área, perímetro) dos arquivos DXF carregados no cadastro de propriedades, eliminando a necessidade de digitação manual e reduzindo erros.

## Glossário

- **DXF_Parser**: Sistema responsável por analisar e extrair dados de arquivos DXF
- **Property_Vertex**: Ponto geográfico com coordenadas X, Y e identificação (P1, P2, etc.)
- **Property_Boundary**: Linha ou segmento que define os limites da propriedade
- **Text_Entity**: Elemento de texto no DXF que contém informações como nomes de ruas
- **Coordinate_System**: Sistema de coordenadas utilizado no desenho (SIRGAS 2000, etc.)

## Requirements

### Requirement 1

**User Story:** Como um usuário cadastrando uma propriedade, eu quero que o sistema extraia automaticamente os vértices do arquivo DXF, para que eu não precise digitá-los manualmente.

#### Acceptance Criteria

1. WHEN um arquivo DXF é carregado na aba "Arquivos", THE DXF_Parser SHALL extrair todos os pontos identificados como vértices (P1, P2, P3, etc.)
2. WHEN vértices são extraídos, THE Property_System SHALL popular automaticamente a lista de vértices na aba "Dados Técnicos"
3. WHEN um vértice é identificado, THE DXF_Parser SHALL extrair as coordenadas X, Y e Z (se disponível)
4. WHERE um ponto possui texto identificador (P1, P2, etc.), THE Property_System SHALL usar esse identificador como nome do vértice
5. IF múltiplos arquivos DXF são carregados, THEN THE Property_System SHALL consolidar todos os vértices em uma única lista

### Requirement 2

**User Story:** Como um usuário cadastrando uma propriedade, eu quero que o sistema extraia automaticamente as confrontações do arquivo DXF, para que eu não precise digitá-las manualmente.

#### Acceptance Criteria

1. WHEN um arquivo DXF contém elementos de texto com nomes de ruas, THE DXF_Parser SHALL identificar essas informações como confrontações
2. WHEN uma linha conecta dois vértices, THE Property_System SHALL calcular automaticamente a distância e direção
3. WHEN texto próximo a uma linha indica confrontação (ex: "RUA DAS FLORES"), THE DXF_Parser SHALL associar essa informação à confrontação correspondente
4. WHERE uma confrontação é identificada, THE Property_System SHALL determinar a direção cardeal baseada nas coordenadas dos vértices
5. IF uma confrontação possui azimute no desenho, THEN THE DXF_Parser SHALL extrair esse valor

### Requirement 3

**User Story:** Como um usuário cadastrando uma propriedade, eu quero que o sistema calcule automaticamente área e perímetro do arquivo DXF, para que eu tenha dados precisos sem cálculos manuais.

#### Acceptance Criteria

1. WHEN vértices são extraídos do DXF, THE Property_System SHALL calcular automaticamente a área total da propriedade
2. WHEN o perímetro da propriedade é definido pelos vértices, THE Property_System SHALL calcular automaticamente o perímetro total
3. WHERE existe uma polyline fechada no DXF, THE DXF_Parser SHALL usar essa geometria para cálculos de área
4. IF múltiplas áreas são encontradas, THEN THE Property_System SHALL permitir ao usuário selecionar qual representa a propriedade principal
5. WHEN cálculos são realizados, THE Property_System SHALL exibir os valores com precisão de 2 casas decimais

### Requirement 4

**User Story:** Como um usuário cadastrando uma propriedade, eu quero que o sistema identifique automaticamente o sistema de coordenadas do DXF, para que os dados sejam interpretados corretamente.

#### Acceptance Criteria

1. WHEN um arquivo DXF é carregado, THE DXF_Parser SHALL identificar o sistema de coordenadas utilizado
2. WHERE o sistema de coordenadas não é explícito, THE Property_System SHALL permitir ao usuário selecionar o sistema correto
3. WHEN coordenadas são extraídas, THE Property_System SHALL validar se estão dentro de faixas esperadas para o Brasil
4. IF coordenadas parecem estar em sistema diferente do selecionado, THEN THE Property_System SHALL alertar o usuário
5. WHEN sistema de coordenadas é confirmado, THE Property_System SHALL aplicar esse sistema a todos os dados extraídos

### Requirement 5

**User Story:** Como um usuário cadastrando uma propriedade, eu quero visualizar uma prévia dos dados extraídos antes de confirmar, para que eu possa validar a precisão da extração.

#### Acceptance Criteria

1. WHEN dados são extraídos do DXF, THE Property_System SHALL exibir uma prévia dos vértices, confrontações e cálculos
2. WHEN prévia é exibida, THE Property_System SHALL permitir edição manual dos dados extraídos
3. WHERE dados extraídos parecem incorretos, THE Property_System SHALL permitir ao usuário corrigir ou descartar a extração
4. IF usuário confirma os dados extraídos, THEN THE Property_System SHALL popular automaticamente os campos da aba "Dados Técnicos"
5. WHEN extração é confirmada, THE Property_System SHALL manter referência ao arquivo DXF original

### Requirement 6

**User Story:** Como um usuário cadastrando uma propriedade, eu quero que o sistema trate erros de extração de forma elegante, para que eu possa continuar o cadastro mesmo se a extração automática falhar.

#### Acceptance Criteria

1. IF extração automática falhar, THEN THE Property_System SHALL permitir cadastro manual dos dados técnicos
2. WHEN erro de extração ocorre, THE Property_System SHALL exibir mensagem clara sobre o problema
3. WHERE arquivo DXF não contém dados esperados, THE Property_System SHALL informar quais elementos estão faltando
4. IF múltiplos arquivos são carregados e alguns falham, THEN THE Property_System SHALL processar os arquivos válidos
5. WHEN extração parcial é bem-sucedida, THE Property_System SHALL informar quais dados foram extraídos e quais precisam ser inseridos manualmente