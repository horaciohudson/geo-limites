# Fase 5 - Próximos Passos Manuais

## ✅ Já Criado
- `Frontend/src/types/ProgressTypes.ts`
- `Frontend/src/utils/progressParser.ts`

## 📝 Edições Manuais Necessárias

### 1. polling-memorial.ts (Linha 3)

**Adicionar import:**
```typescript
import { parseChunkProgress, calculateChunkProgress, formatChunkMessage } from '../utils/progressParser';
```

**Usar no código (linha ~113):**
```typescript
// Substituir a mensagem simples por parsing de chunks
const chunkProgress = parseChunkProgress(response.message);
if (chunkProgress) {
  const progressPercent = calculateChunkProgress(chunkProgress);
  const displayMessage = formatChunkMessage(chunkProgress);
  
  onProgress({
    sessionId,
    userId: 'current-user',
    status: 'PROGRESS_UPDATE',
    message: displayMessage,
    progressPercentage: progressPercent,
    timestamp: Date.now()
  });
}
```

---

### 2. PropertyRegister.tsx

**Remover linha 13:**
```typescript
// REMOVER:
import aiService, { type AIProvider } from '../services/aiService';
```

**Remover linhas 52-55:**
```typescript
// REMOVER:
const [selectedAI, setSelectedAI] = useState<AIProvider>(() => {
  return aiService.getSelectedAI();
});
```

**Remover linhas 71-74:**
```typescript
// REMOVER:
useEffect(() => {
  aiService.setSelectedAI(selectedAI);
}, [selectedAI]);
```

**Substituir linhas 565-600 (AI Selector UI):**
```tsx
{/* Info sobre Claude AI (sempre ativo) */}
<div className="ai-info-banner" style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '20px',
  color: 'white'
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
    <span style={{ fontSize: '24px' }}>🧠</span>
    <span style={{ fontWeight: 600, fontSize: '16px' }}>Claude AI</span>
    <span style={{ marginLeft: 'auto' }}>🟢</span>
  </div>
  <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
    Motor avançado para análise técnica e geração de memoriais descritivos profissionais
  </p>
</div>
```

---

### 3. Sidebar.tsx (Adicionar Progress Display)

**Adicionar import:**
```typescript
import type { MemorialProgress } from '../types/ProgressTypes';
```

**Adicionar state:**
```typescript
const [memorialProgress, setMemorialProgress] = useState<MemorialProgress | null>(null);
```

**Adicionar UI de progresso:**
```tsx
{memorialProgress && memorialProgress.status === 'processing' && (
  <div className="generation-progress" style={{
    marginTop: '16px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px'
  }}>
    <div style={{
      height: '8px',
      background: '#e9ecef',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px'
    }}>
      <div style={{
        height: '100%',
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        width: `${memorialProgress.progress}%`,
        transition: 'width 0.3s ease'
      }} />
    </div>
    {memorialProgress.chunkProgress && (
      <p style={{
        margin: 0,
        fontSize: '13px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        Gerando chunk {memorialProgress.chunkProgress.currentChunk} de {memorialProgress.chunkProgress.totalChunks}
      </p>
    )}
  </div>
)}
```

---

## 🧪 Teste

Após as edições:

```bash
cd Frontend
npm run build
```

Se compilar sem erros, está pronto!

## 📚 Referências

- [ProgressTypes.ts](file:///c:/Desenvolvimento/MemorialPro/memorial-pro/Frontend/src/types/ProgressTypes.ts)
- [progressParser.ts](file:///c:/Desenvolvimento/MemorialPro/memorial-pro/Frontend/src/utils/progressParser.ts)
- [Walkthrough Completo](file:///C:/Users/HHudson/.gemini/antigravity/brain/ccdfda62-54f6-4738-a327-b5d8622927ff/walkthrough.md)
