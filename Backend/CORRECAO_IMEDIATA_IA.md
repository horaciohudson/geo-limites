# ⚡ CORREÇÃO IMEDIATA - IA Não Funcionando

## 🎯 PROBLEMA
Modelo Claude configurado está **INVÁLIDO**: `claude-3-5-sonnet-20241022`

## ✅ SOLUÇÃO RÁPIDA

Abra o **PowerShell como Administrador** e execute:

```powershell
setx CLAUDE_MODEL "claude-3-5-sonnet-20240620"
```

**OU** execute o script pronto:

```powershell
cd Backend
.\fix-claude-model.bat
```

## 🔄 Depois disso:

1. **Feche** este terminal
2. **Abra** um novo terminal
3. **Reinicie** o backend:
   ```bash
   cd Backend
   mvnw clean spring-boot:run
   ```

## ✨ Pronto!

A IA agora vai funcionar corretamente. ✅

---

## 📊 Verificar se está OK

Execute para verificar:
```powershell
.\verificar-config-ia.bat
```

Deve mostrar:
```
✓ CLAUDE_MODEL: claude-3-5-sonnet-20240620
✓ Modelo VÁLIDO
```

---

**Mais detalhes**: Veja `SOLUCAO_PROBLEMA_IA.md`

