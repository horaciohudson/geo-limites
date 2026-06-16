# Integração Backend - Dados da Propriedade no Memorial

## Problema Atual
O memorial está sendo gerado com campos genéricos `[RUA]`, `[BAIRRO]`, `[CIDADE]` em vez dos dados reais da propriedade.

## Dados Enviados pelo Frontend
O frontend está enviando no `requestData.propertyData`:

```json
{
  "entities": [...],
  "fileName": "arquivo.dxf",
  "projectName": "Memorial Descritivo",
  "projectDescription": "Memorial descritivo da propriedade TEST-001",
  "standardId": "12fb339a-89ce-457c-8292-b0109de2a1f1",
  "propertyData": {
    "registrationNumber": "TEST-001",
    "name": "Propriedade Teste",
    "street": "Rua Maria Ivani da Silva",
    "number": "123",
    "neighborhood": "Gameleira",
    "city": "Horizonte",
    "state": "CE",
    "ownerName": "João da Silva",
    "ownerDocument": "123.456.789-00",
    "propertyType": "URBAN"
  }
}
```

## Como o Backend Deve Usar

### 1. No Controller (MemorialGptController.java)
```java
@PostMapping("/generate-gpt")
public ResponseEntity<?> generateMemorial(@RequestBody MemorialRequest request) {
    // Extrair dados da propriedade
    PropertyData propertyData = request.getPropertyData();
    
    if (propertyData != null) {
        log.info("🏠 Dados da propriedade recebidos: {}", propertyData.getName());
        log.info("📍 Endereço: {}, {}, {}", 
            propertyData.getStreet(), 
            propertyData.getNeighborhood(), 
            propertyData.getCity());
        log.info("👤 Proprietário: {} ({})", 
            propertyData.getOwnerName(), 
            propertyData.getOwnerDocument());
    }
    
    // Passar para o service
    return memorialService.generateWithProperty(request, propertyData);
}
```

### 2. No Service (MemorialGptService.java)
```java
public String generateWithProperty(MemorialRequest request, PropertyData propertyData) {
    
    // Construir prompt com dados reais da propriedade
    String prompt = buildPromptWithPropertyData(request, propertyData);
    
    // Enviar para IA
    return callOpenAI(prompt);
}

private String buildPromptWithPropertyData(MemorialRequest request, PropertyData propertyData) {
    StringBuilder prompt = new StringBuilder();
    
    // Adicionar dados da propriedade ao prompt
    if (propertyData != null) {
        prompt.append("DADOS DA PROPRIEDADE:\n");
        prompt.append("- Registro: ").append(propertyData.getRegistrationNumber()).append("\n");
        prompt.append("- Endereço: ").append(propertyData.getStreet());
        if (propertyData.getNumber() != null) {
            prompt.append(", ").append(propertyData.getNumber());
        }
        prompt.append("\n");
        prompt.append("- Bairro: ").append(propertyData.getNeighborhood()).append("\n");
        prompt.append("- Cidade: ").append(propertyData.getCity()).append("/").append(propertyData.getState()).append("\n");
        prompt.append("- Proprietário: ").append(propertyData.getOwnerName()).append("\n");
        prompt.append("- Documento: ").append(propertyData.getOwnerDocument()).append("\n");
        prompt.append("- Tipo: ").append(propertyData.getPropertyType()).append("\n\n");
        
        prompt.append("INSTRUÇÕES IMPORTANTES:\n");
        prompt.append("- SUBSTITUA [RUA] por: ").append(propertyData.getStreet()).append("\n");
        prompt.append("- SUBSTITUA [BAIRRO] por: ").append(propertyData.getNeighborhood()).append("\n");
        prompt.append("- SUBSTITUA [CIDADE]/[UF] por: ").append(propertyData.getCity()).append("/").append(propertyData.getState()).append("\n");
        prompt.append("- SUBSTITUA 'A definir' por: ").append(propertyData.getOwnerName()).append("\n");
        prompt.append("- SUBSTITUA [RESPONSÁVEL] por: ").append(propertyData.getOwnerName()).append("\n");
        prompt.append("- SUBSTITUA [REGISTRO] por: ").append(propertyData.getOwnerDocument()).append("\n\n");
    }
    
    // Adicionar dados DXF
    prompt.append("DADOS DXF:\n");
    // ... resto do prompt com entidades DXF
    
    return prompt.toString();
}
```

### 3. Classe PropertyData
```java
public class PropertyData {
    private String registrationNumber;
    private String name;
    private String street;
    private String number;
    private String neighborhood;
    private String city;
    private String state;
    private String ownerName;
    private String ownerDocument;
    private String propertyType;
    
    // getters e setters
}
```

## Resultado Esperado
Com essa implementação, o memorial deve sair assim:

**Antes:**
```
Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF]
- Proprietário: A definir
```

**Depois:**
```
Um imóvel urbano, localizado na Rua Maria Ivani da Silva, bairro Gameleira, Horizonte/CE
- Proprietário: João da Silva
```

## Verificação
Para verificar se está funcionando, adicione logs no backend:
```java
log.info("🏠 DADOS PROPRIEDADE RECEBIDOS: {}", propertyData);
log.info("📝 PROMPT GERADO: {}", prompt.substring(0, 500));
```