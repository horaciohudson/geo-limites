# Ajuda Contextual e Atalho de Teclado

## Objetivo

Preparar o GeoLimites para abrir o manual do usuario de forma rapida, consistente e profissional, usando o subdominio `ajuda.geolimites.com.br`.

## Modelo recomendado

O sistema pode ter dois pontos principais de acesso ao manual:

- um botao `Ajuda` visivel na interface
- o atalho de teclado `Shift+F1`

## Comportamento inicial sugerido

Na primeira versao, tanto o botao quanto o `Shift+F1` podem abrir a pagina inicial do manual:

- `https://ajuda.geolimites.com.br/`

Isso ja entrega valor imediato sem exigir mapeamento complexo por tela.

## Evolucao recomendada

Depois da primeira entrega, o ideal e evoluir para ajuda contextual por rota.

### Exemplos de mapeamento

- `/properties` -> pagina sobre cadastro e organizacao de imoveis
- `/files` -> pagina sobre arquivos tecnicos
- `/standards` -> pagina sobre normas aplicadas
- `/viewer` -> pagina sobre visualizacao tecnica
- `/memorial` -> pagina sobre geracao e revisao do memorial
- `/configure-templates` -> pagina sobre modelos documentais
- `/my-account` -> pagina sobre conta, creditos e seguranca
- `/admin` -> pagina sobre empresa, SMTP e usuarios

## Estrategia tecnica sugerida

Uma implementacao simples no frontend pode seguir esta ideia:

1. detectar a rota atual
2. mapear a rota para uma URL do manual
3. abrir essa URL em nova aba

## Exemplo de politica funcional

- se existir pagina especifica para a rota atual, abrir essa pagina
- se nao existir, abrir a home do manual
- manter sempre um botao de ajuda visivel em areas-chave do sistema

## Onde integrar no GeoLimites

Os pontos mais naturais para essa integracao sao:

- barra superior
- menu lateral
- telas operacionais mais importantes

## Cuidados de usabilidade

- nao bloquear atalhos nativos importantes sem necessidade
- manter a abertura do manual em nova aba
- evitar depender de atalhos reservados do navegador
- usar URLs estaveis e amigaveis no manual

## Ordem recomendada de entrega

1. publicar o manual em `ajuda.geolimites.com.br`
2. adicionar um botao `Ajuda` global
3. adicionar suporte basico ao `Shift+F1`
4. evoluir para ajuda contextual por rota

## Beneficio direto

Essa abordagem transforma o manual em parte ativa do produto, e nao apenas em um documento isolado.
