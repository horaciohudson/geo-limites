# 🔄 Fluxos de Integracao - GeoLimites

## 🎯 Visão Geral dos Fluxos

O sistema GeoLimites possui 5 fluxos principais de integracao entre os cadastros:

1. **🏠 Fluxo Completo de Propriedade** - Do cadastro ao memorial
2. **📁 Fluxo de Importação DXF** - Automação via arquivo técnico  
3. **🔗 Fluxo de Divisas Integradas** - Validação geométrica
4. **🏛️ Fluxo de Marcos Topográficos** - Precisão técnica
5. **🧠 Fluxo de Memorial Assistido** - Geracao assistida + dados estruturados

---

## 🏠 1. FLUXO COMPLETO DE PROPRIEDADE

### **Objetivo**
Processo completo desde o cadastro inicial até a geração do memorial descritivo.

### **Etapas do Fluxo**

```mermaid
graph TD
    A[Cadastrar Propriedade Básica] --> B{Tem arquivo DXF?}
    B -->|Sim| C[Upload e Processamento DXF]
    B -->|Não| D[Cadastro Manual de Divisas]
    
    C --> E[Extração Automática de Coordenadas]
    E --> F[Validação das Divisas Extraídas]
    F --> G[Ajustes Manuais se Necessário]
    
    D --> H[Definir 4 Divisas Principais]
    H --> I[Calcular Perímetro e Área]
    
    G --> J[Cadastrar Marcos nos Vértices]
    I --> J
    
    J --> K[Upload de Documentos]
    K --> L[Gerar Memorial Descritivo]
    L --> M[Revisar e Aprovar]
    M --> N[Exportar Memorial Final]
```

### **Implementação Frontend**

#### **Página: PropertyWizard.tsx**
```typescript
interface PropertyWizardStep {
  id: number;
  title: string;
  component: React.ComponentType<any>;
  isComplete: boolean;
  isOptional: boolean;
}

const PropertyWizard = () => {
  const [currentStep, setCurren
