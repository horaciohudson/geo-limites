# Manual do Usuario do GeoLimites

## Objetivo deste manual

Este manual explica como operar o GeoLimites no fluxo atual da plataforma, desde o acesso inicial ate a preparacao dos dados, a configuracao das normas e a geracao do memorial descritivo.

## Para quem este material foi feito

### Operador tecnico
Usa o sistema para selecionar imoveis, definir normas, escolher arquivos DXF, visualizar os desenhos e gerar memoriais.

### Gestor ou responsavel pela operacao
Acompanha a padronizacao do trabalho, organiza normas e modelos base e orienta a equipe sobre o uso correto da plataforma.

### Administrador do sistema
Configura empresa, SMTP e a gestao global de usuarios do sistema, incluindo operacoes administrativas de acesso.

## Fluxo recomendado de leitura

1. [Visao Geral](01-introducao/visao-geral.md)
2. [Primeiro Acesso e Login](02-primeiros-passos/primeiro-acesso-e-login.md)
3. [Imoveis](03-fluxo-operacional/imoveis-e-arquivos-tecnicos.md)
4. [Cadastrar Imovel](03-fluxo-operacional/cadastrar-imovel.md)
5. [Editor CAD](03-fluxo-operacional/editor-cad.md)
6. [Configurar Memorial](04-memorial/configurar-memorial.md)
7. [Memorial](04-memorial/visualizador-normas-e-geracao.md)
8. [Normas e Exemplos](05-modelos-e-normas/modelos-documentais-e-normas.md)
9. [Conta, Perfil e Operacoes](06-conta/conta-creditos-e-seguranca.md)
10. [Empresa, SMTP e Usuarios](07-administracao/empresa-smtp-e-usuarios.md)
11. [FAQ e Proximos Passos](08-suporte/faq-e-proximos-passos.md)

## Mapa rapido do sistema

O menu lateral do GeoLimites esta organizado em quatro grupos principais:

- **Operacao**: acesso ao fluxo diario do trabalho tecnico.
- **Preparacao**: entrada para cadastro adicional de imoveis.
- **Configuracao**: manutencao de normas e exemplos usados pela plataforma.
- **Conta e Acesso**: perfil do usuario e administracao.

Dentro deles, as entradas visiveis sao:

### Operacao
- **Editor CAD**: revisao tecnica e visual do desenho.
- **Imoveis**: lista e selecao dos imoveis de trabalho.
- **Configurar Memorial**: definicao da norma e do modelo usados na geracao.
- **Memorial**: geracao, revisao e exportacao do documento final.

### Preparacao
- **Cadastrar Imovel**: cadastro complementar de novos imoveis.

### Configuracao
- **Normas e Exemplos**: area administrativa para carregar normas em PDF e gerar ou importar modelos base em JSON, PDF ou TXT.

### Conta e Acesso
- **Conta**: informacoes do usuario organizadas em `Conta`, `Perfil` e `Operacoes`.
- **Administracao**: configuracao de SMTP, dados do tenant e gestao global de usuarios, quando o perfil tem permissao.
- **Sair**: encerra a sessao atual com seguranca.

## Observacao importante

No comportamento atual do produto, a **Pasta de Templates** ainda participa do fluxo de configuracao dos modelos base. A tela administrativa usa esse caminho para tentar salvar o resultado no banco e em disco, deixando navegador e `localStorage` como apoio ou fallback.

Para leitura consistente do manual:

- `Configurar Memorial` sempre se refere a selecao operacional da sessao atual
- `Normas e Exemplos` sempre se refere a manutencao administrativa da base documental
