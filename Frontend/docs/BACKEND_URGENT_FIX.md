# 🚨 CORREÇÃO URGENTE - Backend não está usando dados da propriedade

## Situação Atual
- ✅ Frontend está enviando dados da propriedade corretamente
- ❌ Backend está ignorando esses dados
- ❌ Memorial sai com `[RUA]`, `[BAIRRO]`, `A definir` em vez dos dados reais

## Dados que o Backend está Recebendo

```json
{
  "entities": [...],
  "fileName": "arquivo.dxf",
  "projectName": "Propriedade Teste",
  "projectDescription": "Memorial descritivo da propriedade TEST-001",
  "standardId": "12fb339a-89ce-457c-8292-b0109de2a1f1",
  "propertyData": {
    "registrationNumber": "TEST-001",
    "name": "Propriedade Teste",
    "street": "Rua Maria Ivani da Silva",
    "neighborhood": "Gameleira",
    "city": "Horizonte",
    "state": "CE",
    "ownerName": "João da Silva",
    "ownerDocument": "123.456.789-00",
    "propertyType": "URBAN"
  }
}
```

## O que o Backend DEVE fazer

### 1. Modificar o MemorialGptService.java

Adicionar no método que constrói o prompt para a IA:

```java
private String buildPromptWithPropertyData(MemorialRequest request) {
    StringBuilder prompt = new StringBuilder();
    
    // DADOS DA PROPRIEDADE - ADICIONAR ISTO!
    PropertyData propertyData = request.getPropertyData();
    if (propertyData != null) {
        prompt.append("=== DADOS REAIS DA PROPRIEDADE ===\n");
        prompt.append("ENDEREÇO REAL: ").append(propertyData.getStreet()).append("\n");
        prompt.append("BAIRRO REAL: ").append(propertyData.getNeighborhood()).append("\n");
        prompt.append("CIDADE REAL: ").append(propertyData.getCity()).append("/").append(propertyData.getState()).append("\n");
        prompt.append("PROPRIETÁRIO REAL: ").append(propertyData.getOwnerName()).append("\n");
        prompt.append("DOCUMENTO REAL: ").append(propertyData.getOwnerDocument()).append("\n");
        prompt.append("\n");
        
        prompt.append("INSTRUÇÕES OBRIGATÓRIAS PARA A IA:\n");
        prompt.append("- SUBSTITUA TODOS os [RUA] por: ").append(propertyData.getStreet()).append("\n");
        prompt.append("- SUBSTITUA TODOS os [BAIRRO] por: ").append(propertyData.getNeighborhood()).append("\n");
        prompt.append("- SUBSTITUA TODOS os [CIDADE]/[UF] por: ").append(propertyData.getCity()).append("/").append(propertyData.getState()).append("\n");
        prompt.append("- SUBSTITUA TODOS os 'A definir' por: ").append(propertyData.getOwnerName()).append("\n");
        prompt.append("- SUBSTITUA TODOS os [RESPONSÁVEL] por: ").append(propertyData.getOwnerName()).append("\n");
        prompt.append("- SUBSTITUA TODOS os [REGISTRO] por: ").append(propertyData.getOwnerDocument()).append("\n");
        prompt.append("- NUNCA deixe campos como [RUA], [BAIRRO], [CIDADE], etc. em branco\n");
        prompt.append("- SEMPRE use os dados reais fornecidos acima\n\n");
    }
    
    // Resto do prompt com dados DXF...
    prompt.append("DADOS DXF:\n");
    // ... código existente
    
    return prompt.toString();
}
```

### 2. Adicionar logs para debug

```java
@PostMapping("/generate-gpt")
public ResponseEntity<?> generateMemorial(@RequestBody MemorialRequest request) {
    
    PropertyData propertyData = request.getPropertyData();
    
    if (propertyData != null) {
        log.info("🏠 DADOS DA PROPRIEDADE RECEBIDOS:");
        log.info("- Rua: {}", propertyData.getStreet());
        log.info("- Bairro: {}", propertyData.getNeighborhood());
        log.info("- Cidade: {}/{}", propertyData.getCity(), propertyData.getState());
        log.info("- Proprietário: {} ({})", propertyData.getOwnerName(), propertyData.getOwnerDocument());
    } else {
        log.warn("⚠️ NENHUM DADO DE PROPRIEDADE RECEBIDO!");
    }
    
    // ... resto do código
}
```

## Resultado Esperado

**Antes (atual):**
```
Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF]
- Proprietário: A definir
```

**Depois (corrigido):**
```
Um imóvel urbano, localizado na Rua Maria Ivani da Silva, bairro Gameleira, Horizonte/CE
- Proprietário: João da Silva
```

## Teste Rápido

1. Adicione um log simples no backend:
```java
log.info("🔍 REQUEST COMPLETO: {}", request);
```

2. Gere um memorial e verifique se aparece `propertyData` nos logs

3. Se aparecer, implemente a substituição no prompt

4. Se não aparecer, verifique se a classe `PropertyData` existe e tem os getters corretos

## Classes Necessárias

```java
public class PropertyData {
    private String registrationNumber;
    private String name;
    private String street;
    private String neighborhood;
    private String city;
    private String state;
    private String ownerName;
    private String ownerDocument;
    private String propertyType;
    
    // getters e setters obrigatórios
}

public class MemorialRequest {
    // campos existentes...
    private PropertyData propertyData;
    
    public PropertyData getPropertyData() {
        return propertyData;
    }
    
    public void setPropertyData(PropertyData propertyData) {
        this.propertyData = propertyData;
    }
}
```

## URGENTE
O frontend está funcionando perfeitamente. O problema é 100% no backend que não está processando os dados da propriedade que estão sendo enviados.