#!/usr/bin/env python3
"""
Script para remover o seletor de IA do PropertyRegister.tsx
Fase 5 - Simplificação do Frontend
"""

import re

# Ler o arquivo
with open('src/pages/PropertyRegister.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remover import do aiService (linha 13)
content = content.replace(
    "import aiService, { type AIProvider } from '../services/aiService';",
    ""
)

# 2. Remover state do selectedAI (linhas 52-55)
pattern1 = r"  const \[selectedAI, setSelectedAI\] = useState<AIProvider>\(\(\) => \{\s*// Recuperar IA selecionada do localStorage ou usar Motor Básico como padrão\s*return aiService\.getSelectedAI\(\);\s*\}\);\s*"
content = re.sub(pattern1, "", content, flags=re.MULTILINE)

# 3. Remover useEffect do AI (linhas 71-74)
pattern2 = r"  // Salvar IA selecionada no localStorage\s*useEffect\(\(\) => \{\s*aiService\.setSelectedAI\(selectedAI\);\s*\}, \[selectedAI\]\);\s*"
content = re.sub(pattern2, "", content, flags=re.MULTILINE)

# 4. Substituir UI do seletor de IA pelo banner do Claude
old_ui = """            {/* Combobox para seleção de IA */}
            <div className="ai-selector">
              <label htmlFor="aiSelect">Gerar Memorial IA:</label>
              <div className="selector-row">
                <select
                  id="aiSelect"
                  onChange={(e) => {
                    const newAI = e.target.value as AIProvider;
                    setSelectedAI(newAI);
                    // Feedback visual da mudança
                    console.log('🔄 Alterando IA para:', aiService.AI_PROVIDERS[newAI].name);
                  }}
                  value={selectedAI}
                  className="ai-select"
                >
                  <option value="motor_basico">Motor Básico</option>
                  <option value="motor_avancado">Motor Avançado</option>
                </select>
                <div className="ai-info">
                  <span className="ai-status">
                    🟢 {aiService.AI_PROVIDERS[selectedAI].name} Ativo
                  </span>
                </div>
              </div>
              <div className="ai-description">
                <p>
                  {aiService.AI_PROVIDERS[selectedAI].icon} <strong>{aiService.AI_PROVIDERS[selectedAI].name}:</strong> {aiService.AI_PROVIDERS[selectedAI].description}
                </p>
                <div className="ai-features">
                  <span className="feature-tag">✅ Fallback Automático</span>
                  <span className="feature-tag">🔄 Retry Inteligente</span>
                  <span className="feature-tag">📊 Validação de Qualidade</span>
                  <span className="feature-tag">⚡ Otimizado para Completude</span>
                </div>
              </div>
            </div>"""

new_ui = """            {/* Info sobre Claude AI (sempre ativo) */}
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
            </div>"""

content = content.replace(old_ui, new_ui)

# Salvar o arquivo modificado
with open('src/pages/PropertyRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ PropertyRegister.tsx atualizado com sucesso!")
print("   - Removido import do aiService")
print("   - Removido state selectedAI")
print("   - Removido useEffect do AI")
print("   - Substituído seletor de IA por banner do Claude AI")
