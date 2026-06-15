# Ajuda Contextual e Atalho de Teclado

## Objetivo

O GeoLimites ja usa o manual publicado em `https://ajuda.geolimites.com.br/` como base para ajuda contextual por rota e para o atalho `Shift+F1`.

## Como funciona hoje

Ao pressionar `Shift+F1`, o frontend identifica a rota atual e tenta abrir a pagina mais adequada do manual em uma nova aba.

Se nao existir uma pagina especifica para a rota atual, o sistema abre a pagina inicial do manual.

## Mapeamento atual de referencia

As rotas principais estao associadas hoje a estas secoes do manual:

- `/properties` e `/files` -> fluxo de imoveis e arquivos tecnicos
- `/standards`, `/viewer` e `/memorial` -> visualizador, normas e geracao
- `/manage-standards` -> normas e modelos base
- `/my-account` e `/financial` -> conta, creditos e seguranca
- `/admin` -> empresa, SMTP e usuarios

## Rotas legadas ou de compatibilidade

Algumas rotas ainda podem permanecer no mapeamento tecnico por compatibilidade, mesmo sem destaque no menu atual. O principal exemplo e:

- `/configure-templates` -> redirecionada conceitualmente para a documentacao de **Normas e Modelos Base**

Isso significa que a ajuda contextual deve tratar essas rotas como legado funcional, e nao como uma tela principal ainda recomendada ao usuario.

## Politica funcional recomendada

- se existir pagina especifica para a rota atual, abrir essa pagina
- se nao existir, abrir a home do manual
- manter o manual sempre acessivel sem interromper o trabalho em andamento

## Cuidados de usabilidade

- manter a abertura em nova aba sempre que possivel
- oferecer fallback caso o navegador bloqueie a nova aba
- evitar depender de atalhos reservados pelo proprio navegador
- manter URLs do manual estaveis e amigaveis

## Beneficio direto

Com esse modelo, o manual deixa de ser apenas um documento estatico e passa a funcionar como apoio operacional integrado ao produto real.
