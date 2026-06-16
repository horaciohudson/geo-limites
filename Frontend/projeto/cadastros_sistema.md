# Projeto Piloto - Preparacao x Operacao

## Problema observado

O GeoLimites cresceu em torno do fluxo de geracao do memorial, mas hoje mistura duas naturezas de uso:

- preparacao do ambiente de trabalho
- operacao tecnica do memorial

Para um usuario iniciante, essa mistura dificulta entender quando ele esta cadastrando e configurando a base, e quando ele esta apenas executando o fluxo tecnico.

## Objetivo deste projeto piloto

Separar o sistema em dois blocos claros:

### Preparacao

Area onde o usuario organiza tudo o que precisa antes de operar:

- imoveis
- arquivos tecnicos

### Operacao

Area onde o usuario trabalha com escolhas validas para o memorial atual:

- normas do memorial
- visualizador
- revisar e exportar resultado
- memorial

### Configuracao

Area estrutural do sistema, pensada para crescer sem poluir o fluxo do dia a dia:

- cadastro de normas
- modelos de exemplo
- templates e pasta de armazenamento

## Regra principal

No fluxo operacional, o usuario nao deve ser obrigado a cadastrar ou configurar nada do zero.
Se algo estiver faltando, o sistema deve informar claramente o que precisa ser concluido na area de preparacao.

## Recorte inicial para critica

Este pequeno projeto fica limitado ao frontend e sera executado em 4 passos simples:

1. reorganizar o menu lateral em `Operacao`, `Preparacao` e `Configuracao`
2. manter em `Operacao` apenas o que vale para o memorial em andamento
3. mover para `Configuracao` o que e estrutural e reaproveitavel
4. ajustar textos de orientacao para refletir a nova leitura do sistema

## Estado atual do piloto

O piloto deixou de ser apenas uma ideia de menu e passou a aparecer no uso real da interface.

Hoje ja esta consolidado:

- `Operacao` como primeiro bloco do menu
- `Preparacao` com foco em deixar a base pronta
- `Configuracao` separada do fluxo operacional
- checklist de prontidao na entrada da operacao
- `Normas do Memorial` tratada como escolha do trabalho atual
- `Visualizador` e `Memorial` exibindo contexto do trabalho em andamento
- `Imoveis` e `Arquivos Tecnicos` com linguagem de preparacao
- `Resumo` do imovel tratado como checklist final de prontidao
- separacao explicita entre `rascunho em preparacao` e `imovel pronto na base`

## Estrutura proposta

### Menu lateral

`Operacao`

- Normas do Memorial
- Visualizador
- Memorial

`Preparacao`

- Imoveis
- Arquivos Tecnicos

Leitura aplicada:

- `Imoveis` prepara a base juridica e cadastral do trabalho
- `Arquivos Tecnicos` prepara DXF e DWG para a operacao atual
- o usuario entra em `Operacao` somente depois que essa base estiver organizada

`Configuracao`

- Normas e Templates Base
- Modelos de Exemplo
- Pasta de Templates

Leitura aplicada:

- `Normas e Templates Base` cuida do que e estrutural e reaproveitavel
- `Modelos de Exemplo` apoia a manutencao dos modelos documentais
- `Pasta de Templates` cuida apenas da infraestrutura de armazenamento local

`Conta e Acesso`

- Conta
- Administracao
- Sair

## Fluxo consolidado

### Preparacao

1. retomar um rascunho de imovel ou iniciar nova preparacao
2. preencher dados basicos e proprietarios
3. adicionar documentos e arquivos de apoio quando fizer sentido
4. revisar a aba de prontidao
5. salvar o imovel na base

### Operacao

1. escolher o imovel pronto
2. escolher os arquivos tecnicos do trabalho
3. definir `Normas do Memorial`
4. conferir o contexto no `Visualizador`
5. revisar, gerar e concluir no `Memorial`

### Configuracao

1. manter normas base
2. manter modelos base
3. manter exemplos de referencia
4. manter a pasta local de armazenamento

## Backlog imediato

### Fase 1 - concluida

- reorganizar a sidebar
- colocar `Operacao` como primeiro bloco do menu
- remover `Imoveis` do fluxo operacional
- separar escolhas do trabalho atual de configuracoes estruturais
- deixar a sequencia visual mais didatica

### Fase 2 - concluida

- criar checklist visual de prontidao antes da operacao
- mostrar faltas como: imovel, arquivo, norma do memorial, template selecionado
- orientar o usuario a voltar para `Preparacao` quando algo estiver incompleto

### Fase 3 - concluida

- tratar `Normas do Memorial` como escolha valida apenas para o trabalho atual
- tratar `Visualizador` como etapa operacional contextualizada
- tratar `Memorial` como revisao final do trabalho em andamento
- evitar desvios para cadastro dentro da operacao

### Fase 4 - concluida

- separar `Normas e Templates Base` de `Pasta de Templates`
- isolar configuracoes de infraestrutura
- limpar a sobreposicao entre criacao estrutural e armazenamento local

### Fase 5 - concluida

- revisar a linguagem da `Preparacao`
- diferenciar rascunho em andamento de imovel pronto na base
- transformar o resumo do imovel em checklist final de prontidao

### Fase 6 - proxima

- consolidar a leitura de `Memorial` como etapa final da operacao
- verificar se a pagina deve absorver ainda mais claramente a ideia de gerar, revisar e exportar
- avaliar se faltam atalhos mais diretos para usuario recorrente

## Critica que precisamos fazer juntos

Antes de expandir o projeto, vale validar estas decisoes:

1. `Memorial` comunica bem a etapa final da operacao ou ainda parece uma tela tecnica demais?
2. a aba `Imoveis Prontos` ja resolve bem a diferenca entre rascunho e base salva?
3. a pagina `Memorial` precisa de uma linguagem ainda mais forte de exportacao final?

## Criterios de aceite do piloto

- o usuario entende pelo menu o que e preparar e o que e operar
- o menu prioriza a area mais usada no dia a dia
- a selecao valida apenas para um memorial aparece em `Operacao`
- os cadastros estruturais deixam de aparecer como parte do fluxo operacional
- a entrada na operacao acontece somente com base previamente organizada
- a preparacao do imovel termina com uma leitura clara de prontidao
- a diferenca entre rascunho e base pronta fica explicita
- o projeto fica pequeno o suficiente para revisar e ajustar sem retrabalho grande

---

# 🏗️ Sistema de Cadastros - GeoLimites Frontend

## 📋 Visão Geral dos 4 Cadastros Principais

O sistema GeoLimites possui 4 modulos de cadastro integrados que trabalham em conjunto para gerenciar propriedades e gerar memoriais descritivos:

### 1. **📍 Cadastro de Propriedades (Properties)**
### 2. **🔗 Cadastro de Divisas (Property Boundaries)** 
### 3. **🏛️ Cadastro de Marcos (Property Landmarks)**
### 4. **📄 Cadastro de Documentos (Property Documents)**

---

## 🏠 1. CADASTRO DE PROPRIEDADES

### **Objetivo**
Gerenciar informações básicas das propriedades urbanas e rurais.

### **Campos Principais**
```typescript
interface Property {
  propertyId: string;
  registrationNumber: string;    // Número de registro/matrícula
  propertyType: 'URBAN' | 'RURAL';
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  totalArea: number;            // Área total em m²
  builtArea?: number;           // Área construída em m²
  ownerName: string;
  ownerDocument: string;        // CPF/CNPJ do proprietário
  description?: string;
  coordinates?: string;         // Coordenadas geográficas
  active: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

### **Funcionalidades Frontend**
- ✅ **Listagem** com filtros por tipo, cidade, proprietário
- ✅ **Cadastro** com validação de campos obrigatórios
- ✅ **Edição** de propriedades existentes
- ✅ **Exclusão** com confirmação
- ✅ **Busca** por número de registro ou endereço
- ✅ **Visualização** detalhada com divisas e marcos relacionados

### **Endpoints Backend**
```
GET    /api/properties              # Listar propriedades
POST   /api/properties              # Criar propriedade
GET    /api/properties/{id}         # Buscar por ID
PUT    /api/properties/{id}         # Atualizar propriedade
DELETE /api/properties/{id}         # Excluir propriedade
GET    /api/properties/search       # Buscar com filtros
```

---

## 🔗 2. CADASTRO DE DIVISAS (BOUNDARIES)

### **Objetivo**
Gerenciar as divisas/confrontações de cada propriedade com detalhes técnicos.

### **Campos Principais**
```typescript
interface PropertyBoundary {
  boundaryId: string;
  propertyId: string;           // FK para Property
  direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  description: string;          // Descrição da divisa
  length: number;               // Comprimento em metros
  startPoint: string;           // Ponto inicial (ex: P01)
  endPoint: string;             // Ponto final (ex: P02)
  neighborProperty?: string;    // Propriedade vizinha
  publicArea?: string;          // Via pública (se aplicável)
  coordinates?: string;         // Coordenadas dos pontos
  observations?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### **Funcionalidades Frontend**
- ✅ **Gestão por Propriedade** - Divisas organizadas por propriedade
- ✅ **Cadastro Sequencial** - Adicionar divisas Norte → Sul → Leste → Oeste
- ✅ **Validação Geométrica** - Verificar fechamento do polígono
- ✅ **Cálculo Automático** - Perímetro total da propriedade
- ✅ **Visualização Gráfica** - Representação das divisas no mapa
- ✅ **Importação DXF** - Extrair divisas automaticamente do arquivo

### **Endpoints Backend**
```
GET    /api/property-boundaries/property/{propertyId}  # Divisas da propriedade
POST   /api/property-boundaries                        # Criar divisa
PUT    /api/property-boundaries/{id}                   # Atualizar divisa
DELETE /api/property-boundaries/{id}                   # Excluir divisa
GET    /api/property-boundaries/{id}/validate          # Validar geometria
```

---

## 🏛️ 3. CADASTRO DE MARCOS (LANDMARKS)

### **Objetivo**
Gerenciar marcos físicos e pontos de referência das propriedades.

### **Campos Principais**
```typescript
interface PropertyLandmark {
  landmarkId: string;
  propertyId: string;           // FK para Property
  landmarkType: 'CONCRETE_PILLAR' | 'IRON_STAKE' | 'NATURAL_BOUNDARY' | 'BUILDING' | 'OTHER';
  name: string;                 // Nome/identificação do marco
  description: string;
  coordinates: string;          // Coordenadas precisas (E, N)
  elevation?: number;           // Altitude/cota
  material?: string;            // Material do marco
  condition: 'GOOD' | 'REGULAR' | 'BAD' | 'DESTROYED';
  installationDate?: string;
  lastInspection?: string;
  photos?: string[];            // URLs das fotos
  observations?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### **Funcionalidades Frontend**
- ✅ **Mapeamento Visual** - Marcos plotados no mapa da propriedade
- ✅ **Galeria de Fotos** - Upload e visualização de imagens dos marcos
- ✅ **Histórico de Inspeções** - Controle de manutenção dos marcos
- ✅ **Filtros por Condição** - Marcos que precisam de manutenção
- ✅ **Relatório de Marcos** - Exportação para memorial descritivo
- ✅ **Coordenadas Precisas** - Integração com GPS/topografia

### **Endpoints Backend**
```
GET    /api/property-landmarks/property/{propertyId}   # Marcos da propriedade
POST   /api/property-landmarks                         # Criar marco
PUT    /api/property-landmarks/{id}                    # Atualizar marco
DELETE /api/property-landmarks/{id}                    # Excluir marco
POST   /api/property-landmarks/{id}/photos             # Upload de fotos
GET    /api/property-landmarks/condition/{condition}   # Filtrar por condição
```

---

## 📄 4. CADASTRO DE DOCUMENTOS (DOCUMENTS)

### **Objetivo**
Gerenciar documentos relacionados às propriedades (escrituras, plantas, certidões).

### **Campos Principais**
```typescript
interface PropertyDocument {
  documentId: string;
  propertyId: string;           // FK para Property
  documentType: 'DEED' | 'SURVEY_PLAN' | 'CERTIFICATE' | 'MEMORIAL' | 'DXF_FILE' | 'OTHER';
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentNumber?: string;      // Número oficial do documento
  issueDate?: string;           // Data de emissão
  expiryDate?: string;          // Data de validade
  issuer?: string;              // Órgão emissor
  registrationNumber?: string;  // Número de registro
  version: number;              // Controle de versão
  tags?: string[];              // Tags para organização
  active: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

### **Funcionalidades Frontend**
- ✅ **Upload Múltiplo** - Arrastar e soltar arquivos
- ✅ **Visualizador Integrado** - PDF, imagens, DXF no browser
- ✅ **Controle de Versão** - Histórico de alterações dos documentos
- ✅ **Organização por Tags** - Sistema de etiquetas personalizadas
- ✅ **Busca Avançada** - Por tipo, data, número do documento
- ✅ **Download em Lote** - Exportar documentos selecionados
- ✅ **Integração Memorial** - Documentos usados na geração automática

### **Endpoints Backend**
```
GET    /api/property-documents/property/{propertyId}   # Documentos da propriedade
POST   /api/property-documents/upload                  # Upload de documento
GET    /api/property-documents/{id}/download           # Download do arquivo
PUT    /api/property-documents/{id}                    # Atualizar metadados
DELETE /api/property-documents/{id}                    # Excluir documento
GET    /api/property-documents/search                  # Busca avançada
```

---

## 🔄 INTEGRAÇÕES ENTRE OS CADASTROS

### **Fluxo Principal de Trabalho**

```mermaid
graph TD
    A[Cadastrar Propriedade] --> B[Definir Divisas]
    B --> C[Marcar Marcos Físicos]
    C --> D[Anexar Documentos]
    D --> E[Gerar Memorial Descritivo]
    
    B --> F[Importar DXF]
    F --> G[Extrair Coordenadas]
    G --> B
    
    E --> H[Memorial Assistido]
    H --> I[Documento Final]
```

### **1. Propriedade → Divisas**
- Ao criar uma propriedade, o sistema sugere criar as 4 divisas básicas
- Cálculo automático do perímetro e área baseado nas divisas
- Validação geométrica para garantir fechamento do polígono

### **2. Propriedade → Marcos**
- Marcos são plotados automaticamente nos vértices das divisas
- Sistema sugere marcos nos pontos de mudança de direção
- Coordenadas dos marcos alimentam o cálculo das divisas

### **3. Propriedade → Documentos**
- Documentos são organizados por propriedade
- DXF/DWG são processados para extrair coordenadas automaticamente
- Memoriais gerados são salvos automaticamente como documentos

### **4. Integracao com Memorial Assistido**
- Dados das divisas alimentam o prompt de geracao assistida
- Coordenadas dos marcos são usadas para precisão técnica
- Documentos anexos servem como referência adicional

---

## 🎨 INTERFACE FRONTEND - ESTRUTURA

### **Layout Principal**
```
┌─────────────────────────────────────────────────────┐
│ 🏠 GeoLimites - Navbar                             │
├─────────────┬───────────────────────────────────────┤
│ Sidebar     │ Área Principal                        │
│             │                                       │
│ 📍 Propriedades │ ┌─ Listagem/Formulário ─┐        │
│ 🔗 Divisas      │ │                        │        │
│ 🏛️ Marcos       │ │   Conteúdo Dinâmico   │        │
│ 📄 Documentos   │ │                        │        │
│ 🧠 Memorial     │ └────────────────────────┘        │
│                 │                                   │
└─────────────────┴───────────────────────────────────┘
```

### **Páginas Principais**

#### **1. /properties** - Gestão de Propriedades
- Lista com cards das propriedades
- Filtros: tipo, cidade, proprietário
- Botão "Nova Propriedade" → Modal/página de cadastro
- Ações: Visualizar, Editar, Excluir, Ver Divisas/Marcos

#### **2. /properties/{id}/boundaries** - Divisas da Propriedade
- Mapa visual das divisas
- Lista das 4 direções (N, S, L, O)
- Formulário para adicionar/editar cada divisa
- Cálculo automático do perímetro total

#### **3. /properties/{id}/landmarks** - Marcos da Propriedade
- Mapa com marcos plotados
- Lista de marcos com fotos
- Formulário para adicionar novos marcos
- Filtros por tipo e condição

#### **4. /properties/{id}/documents** - Documentos da Propriedade
- Grid de documentos com preview
- Upload por drag & drop
- Visualizador integrado (PDF, imagens, DXF)
- Sistema de tags e busca

#### **5. /memorial/generate** - Geração de Memorial
- Seleção da propriedade
- Configuração da norma ABNT
- Preview em tempo real
- Download do memorial final

---

## 🛠️ COMPONENTES REUTILIZÁVEIS

### **1. PropertyCard.tsx**
```typescript
interface PropertyCardProps {
  property: Property;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

### **2. BoundaryForm.tsx**
```typescript
interface BoundaryFormProps {
  propertyId: string;
  boundary?: PropertyBoundary;
  onSave: (boundary: PropertyBoundary) => void;
  onCancel: () => void;
}
```

### **3. LandmarkMap.tsx**
```typescript
interface LandmarkMapProps {
  landmarks: PropertyLandmark[];
  boundaries: PropertyBoundary[];
  onLandmarkClick: (landmark: PropertyLandmark) => void;
  onAddLandmark: (coordinates: string) => void;
}
```

### **4. DocumentViewer.tsx**
```typescript
interface DocumentViewerProps {
  document: PropertyDocument;
  onClose: () => void;
}
```

### **5. MemorialPreview.tsx**
```typescript
interface MemorialPreviewProps {
  propertyId: string;
  standardId: string;
  onGenerate: () => void;
}
```

---

## 📱 RESPONSIVIDADE E UX

### **Mobile First**
- Layout adaptável para tablets e smartphones
- Navegação por tabs em telas menores
- Upload de fotos via câmera do dispositivo
- Mapas otimizados para touch

### **Feedback Visual**
- Loading states durante operações
- Notificações toast para ações
- Validação em tempo real nos formulários
- Progress bars para uploads

### **Acessibilidade**
- Navegação por teclado
- Labels descritivos
- Contraste adequado
- Suporte a screen readers

---

## 🔧 TECNOLOGIAS E DEPENDÊNCIAS

### **Core**
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "react-router-dom": "^6.8.0",
  "axios": "^1.3.0"
}
```

### **UI/UX**
```json
{
  "react-hook-form": "^7.43.0",
  "react-query": "^3.39.0",
  "react-hot-toast": "^2.4.0",
  "framer-motion": "^10.0.0"
}
```

### **Mapas e Visualização**
```json
{
  "leaflet": "^1.9.0",
  "react-leaflet": "^4.2.0",
  "three": "^0.150.0",
  "dxf-parser": "^1.7.0"
}
```

### **Upload e Arquivos**
```json
{
  "react-dropzone": "^14.2.0",
  "file-saver": "^2.0.5",
  "react-pdf": "^6.2.0"
}
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Implementar estrutura base** dos 4 cadastros
2. **Criar componentes reutilizáveis** 
3. **Integrar com APIs** do backend existente
4. **Implementar mapas** e visualização DXF
5. **Testes e refinamentos** da UX
6. **Deploy e documentação** final

**O sistema está pronto para desenvolvimento com backend totalmente funcional!** 🎯
