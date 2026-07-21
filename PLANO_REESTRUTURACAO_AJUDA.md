# Plano de Reestruturacao da Ajuda

Projeto: `geo-limites`

Objetivo deste arquivo:

- registrar a estrategia mais saudavel para evoluir a ajuda do sistema
- evitar a criacao de uma segunda ajuda paralela
- alinhar o manual atual com o menu e as rotas reais do produto

## 1. Decisao Principal

Decisao recomendada:

- modificar a ajuda atual
- nao criar uma ajuda nova separada

Motivo:

- ja existe infraestrutura pronta de publicacao
- ja existe integracao no frontend
- ja existe dominio proprio da ajuda
- criar outra ajuda duplicaria manutencao, links e fonte de verdade

## 2. Diagnostico Atual

### 2.1 O que ja existe

- manual em `manual/`
- publicacao em `https://ajuda.geolimites.com.br/`
- botao `Ajuda` no frontend
- mapeamento contextual por rota em `Frontend/src/utils/helpLinks.ts`
- estrutura MkDocs em `manual/mkdocs.yml`

### 2.2 O problema real

O problema atual nao e falta de ajuda.

O problema atual e desalinhamento entre:

- o menu real do sistema
- as rotas reais do frontend
- a estrutura atual do manual

### 2.3 Lacunas principais

- `Editor CAD` ainda nao tem pagina propria forte no manual
- `Cadastrar Imovel` esta subrepresentado
- `Configurar Memorial` ainda aparece de forma indireta
- o mapa contextual de ajuda nao cobre bem todas as rotas reais
- o editor em fullscreen perde parte da visibilidade da ajuda

## 3. Fonte de Verdade

A fonte unica de verdade da ajuda deve continuar sendo:

- `manual/docs/`

Arquivos centrais de controle:

- `manual/mkdocs.yml`
- `Frontend/src/utils/helpLinks.ts`
- `Frontend/src/components/Navbar.tsx`
- `Frontend/src/App.tsx`

## 4. Estrategia Recomendada

### Fase 1 - Alinhar nomes com o sistema real

Atualizar o manual para refletir os nomes reais do menu atual:

- `Editor CAD`
- `Imoveis`
- `Configurar Memorial`
- `Memorial`
- `Cadastrar Imovel`
- `Normas e Exemplos`
- `Conta`
- `Administracao`

### Fase 2 - Criar paginas faltantes

Criar, no minimo, estas novas paginas:

- uma pagina dedicada para `Editor CAD`
- uma pagina dedicada para `Cadastrar Imovel`
- uma pagina mais direta para `Configurar Memorial`

Opcional:

- pagina curta para `Viewer Document`, se essa rota continuar relevante para o usuario final

### Fase 3 - Ajustar ajuda contextual

Atualizar `Frontend/src/utils/helpLinks.ts` para cobrir melhor:

- `/cad-editor`
- `/properties/cadastro`
- `/standards`
- `/memorial`
- `/manage-standards`
- `/my-account`
- rotas administrativas ativas

### Fase 4 - Melhorar acesso no editor

Hoje a ajuda contextual perde forca dentro do editor.

Recomendacao:

- manter o botao geral na navbar
- avaliar um botao de ajuda proprio no `Editor CAD`
- manter separada a ajuda operacional do editor e a ajuda de atalhos

## 5. Estrutura Sugerida do Manual

Arvore sugerida:

```text
Inicio
Introducao
  Visao Geral
  Primeiro Acesso e Login

Operacao
  Imoveis
  Cadastrar Imovel
  Editor CAD
  Configurar Memorial
  Memorial

Configuracao
  Normas e Exemplos

Conta e Acesso
  Conta
  Administracao

Suporte
  Ajuda Contextual e F1
  FAQ e Proximos Passos
```

## 6. Reaproveitamento de Paginas Existentes

Paginas que podem ser mantidas e atualizadas:

- `manual/docs/index.md`
- `manual/docs/01-introducao/visao-geral.md`
- `manual/docs/02-primeiros-passos/primeiro-acesso-e-login.md`
- `manual/docs/03-fluxo-operacional/imoveis-e-arquivos-tecnicos.md`
- `manual/docs/04-memorial/visualizador-normas-e-geracao.md`
- `manual/docs/05-modelos-e-normas/modelos-documentais-e-normas.md`
- `manual/docs/06-conta/conta-creditos-e-seguranca.md`
- `manual/docs/07-administracao/empresa-smtp-e-usuarios.md`
- `manual/docs/08-suporte/ajuda-contextual-e-f1.md`
- `manual/docs/08-suporte/faq-e-proximos-passos.md`

## 7. Paginas Novas Recomendadas

Sugestao de arquivos novos:

- `manual/docs/03-fluxo-operacional/editor-cad.md`
- `manual/docs/03-fluxo-operacional/cadastrar-imovel.md`
- `manual/docs/04-memorial/configurar-memorial.md`

## 8. Mapeamento Contextual Recomendado

Sugestao de mapeamento por rota:

- `/login` -> `02-primeiros-passos/primeiro-acesso-e-login/`
- `/register` -> `02-primeiros-passos/primeiro-acesso-e-login/`
- `/properties` -> `03-fluxo-operacional/imoveis-e-arquivos-tecnicos/`
- `/properties/cadastro` -> `03-fluxo-operacional/cadastrar-imovel/`
- `/cad-editor` -> `03-fluxo-operacional/editor-cad/`
- `/standards` -> `04-memorial/configurar-memorial/`
- `/memorial` -> `04-memorial/visualizador-normas-e-geracao/`
- `/manage-standards` -> `05-modelos-e-normas/modelos-documentais-e-normas/`
- `/my-account` -> `06-conta/conta-creditos-e-seguranca/`
- `/admin` -> `07-administracao/empresa-smtp-e-usuarios/`

## 9. Ordem de Implementacao Mais Saudavel

### Etapa 1

- ajustar `manual/mkdocs.yml`
- alinhar o menu do manual com o menu real do sistema

### Etapa 2

- criar as paginas novas faltantes
- redistribuir o conteudo antigo sem perder o que ja esta bom

### Etapa 3

- atualizar `Frontend/src/utils/helpLinks.ts`
- validar cada rota principal do sistema com o botao `Ajuda`

### Etapa 4

- revisar acesso a ajuda dentro do `Editor CAD`

### Etapa 5

- publicar a ajuda atualizada na VPS

## 10. Riscos de Criar Outra Ajuda

Criar outra ajuda agora traria risco de:

- duplicidade de conteudo
- links conflitantes
- usuarios caindo em documentacao antiga
- custo extra de manutencao
- duas fontes de verdade no mesmo produto

## 11. Beneficios de Evoluir a Ajuda Atual

- preserva o dominio ja configurado
- preserva a integracao atual do frontend
- reduz retrabalho
- facilita manutencao futura
- mantem o sistema mais coerente

## 12. Criterios de Sucesso

Considerar a reestruturacao bem sucedida quando:

- o menu do manual refletir o menu real do sistema
- `Editor CAD` tiver pagina propria
- `Cadastrar Imovel` tiver pagina propria
- `Configurar Memorial` tiver pagina propria
- o botao `Ajuda` abrir a pagina certa nas rotas principais
- o usuario nao precise adivinhar onde encontrar a ajuda correta

## 13. Recomendacao Final

O caminho mais saudavel para o sistema e:

1. manter a ajuda atual como produto oficial
2. reestruturar a arvore existente
3. criar apenas as paginas faltantes
4. ajustar o mapeamento contextual do frontend
5. publicar a evolucao no mesmo dominio de ajuda

Esse caminho reduz risco, evita duplicidade e preserva a coerencia do projeto.
