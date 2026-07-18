Eu consigo demarcar o terreno, não pe difícil, mas como guardar as coordenadas em uma cache para ser aporveitado depois que demarcar os lotes?

Agora estamos entrando em um problema de arquitetura, e eu não usaria um cache "genérico". Eu criaria um contexto de processamento.

Por exemplo, imagine uma classe:

ProcessingContext

Ela existe apenas durante a geração do memorial.

ProcessingContext

TerrenoOriginal
Lotes
ÁreaRemanescente
Servidões
Confrontações

O fluxo seria:

DXF

↓

Processa Terreno

↓

context.setTerreno(...)

↓

Processa Lotes

↓

context.addLote(...)

↓

Processa Área Remanescente

↓

context.setAreaRemanescente(...)

↓

Gera Resumo Técnico

Ou seja, você não precisa "guardar para depois". O contexto permanece vivo durante todo o processamento.

Eu faria orientado a objetos

Algo como:

class ProcessingContext {

    private PropertyBoundary originalProperty;

    private List<PropertyBoundary> lots;

    private PropertyBoundary remainingArea;

}

Onde PropertyBoundary possui:

class PropertyBoundary {

    private String name;

    private List<Coordinate> coordinates;

    private double area;

    private double perimeter;

    private List<Boundary> confrontations;

}
O mais interessante

O Resumo Técnico deixa de procurar informações.

Ele apenas pergunta ao contexto:

context.getOriginalProperty();

context.getLots();

context.getRemainingArea();
E fica preparado para crescer

Daqui a pouco você pode precisar armazenar:

ruas;
servidões;
APP;
reserva legal;
edificações.

É só adicionar ao contexto.

Eu evitaria usar um cache

Porque cache normalmente significa:

"guardar algo para reutilizar depois."

No seu caso, isso não é um cache.

É o estado do processamento.

Ele nasce quando começa a análise do DXF e morre quando o memorial é concluído.

Então eu daria um nome que reflita essa responsabilidade, como:

ProcessingContext
MemorialContext
TechnicalContext

Acho que MemorialContext combina muito bem com o seu projeto.

Aliás, isso conversa muito com a arquitetura que você está montando no Sigeve Graphics Engine. Em vez de passar dezenas de parâmetros entre métodos, você passa um único objeto de contexto, que vai sendo enriquecido conforme cada etapa do processamento termina. É uma solução limpa, fácil de testar e que facilita bastante a manutenção quando surgirem novos tipos de projeto, como desmembramentos, remembramentos ou parcelamentos mais complexos.