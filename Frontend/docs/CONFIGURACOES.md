# Sistema de Configuracoes do GeoLimites

## Visão Geral

O sistema de configurações permite salvar preferências do usuário de forma persistente, evitando a necessidade de reconfigurar a interface a cada uso.

## Arquitetura

### ConfigService (`src/services/configService.ts`)

Serviço centralizado que gerencia todas as configurações da aplicação:

- **Persistência**: Salva configurações no localStorage (pode ser expandido para API/arquivo)
- **Tipagem**: Interfaces TypeScript para garantir consistência
- **Singleton**: Uma única instância compartilhada
- **Extensível**: Fácil adição de novas configurações

### Configurações do Viewer

```typescript
interface ViewerConfig {
  textScale: number;      // Escala do texto (0.1x a 10x)
  flipY: boolean;         // Inversão do eixo Y
  defaultZoom: number;    // Zoom padrão (padrão: 20x)
  showValidation: boolean; // Mostrar painel de validação
  showLayerPanel: boolean; // Mostrar painel de camadas
}
```

## Funcionalidades Implementadas

### 1. **Escala de Texto Persistente**
- Botões T+ e T- ajustam e salvam automaticamente
- Configuração mantida entre sessões
- Limites: 0.1x a 10x

### 2. **Orientação Y Persistente**
- Botão de inversão Y salva preferência
- Padrão: não invertido (flipY: false)

### 3. **Reset de Configurações**
- Botão "⚙️ Reset" restaura valores padrão
- Limpa todas as configurações salvas

### 4. **Escala Automática Agressiva**
- Detecta dimensões do desenho DXF
- Ajusta escala inicial baseada no tamanho (valores altos para garantir visibilidade):
  - Desenhos < 1 unidade: escala x200
  - Desenhos < 10 unidades: escala x100
  - Desenhos < 50 unidades: escala x40
  - Desenhos < 100 unidades: escala x20
  - Desenhos < 500 unidades: escala x8
  - Desenhos < 1000 unidades: escala x4
  - Desenhos > 10000 unidades: escala x0.8

### 5. **Zoom Padrão Alto**
- Escala inicial padrão: 20x (para desenhos aparecerem em tamanho adequado)
- Limite máximo de zoom: 500x (para desenhos muito pequenos)
- Botões de zoom salvam a preferência automaticamente
- Reset restaura para escala padrão de 20x

## Como Usar

### No Código

```typescript
import { configService } from '@/services/configService';

// Obter configuração
const textScale = configService.getViewerSetting('textScale');

// Salvar configuração
configService.setViewerSetting('textScale', 1.5);

// Atualizar múltiplas configurações
configService.updateViewerConfig({
  textScale: 1.2,
  flipY: true
});
```

### Na Interface

1. **Ajustar Texto**: Use T+ e T- para aumentar/diminuir
2. **Inverter Y**: Clique no botão "🔄 Y"
3. **Reset**: Clique em "⚙️ Reset" para restaurar padrões

## Expansão Futura

O sistema está preparado para:

- Configurações de propriedades
- Configurações de API
- Temas e cores
- Atalhos de teclado
- Preferências de exportação

## Estrutura de Arquivos

```
src/
├── services/
│   └── configService.ts     # Serviço principal
├── components/
│   └── ViewerDXF.tsx        # Integração com viewer
└── docs/
    └── CONFIGURACOES.md     # Esta documentação
```

## Benefícios

1. **Experiência Consistente**: Configurações mantidas entre sessões
2. **Menos Retrabalho**: Não precisa reajustar a cada uso
3. **Flexibilidade**: Fácil adição de novas configurações
4. **Robustez**: Fallbacks para valores padrão
5. **Manutenibilidade**: Código centralizado e tipado
