/**
 * TESTE DE INTERCEPTAÇÃO DE MEMORIAL E API
 * 
 * Este teste simula o processo completo de geração de memorial:
 * 1. Intercepta dados do DXF
 * 2. Testa API de memorial
 * 3. Valida resultado com 25 lotes
 */

const axios = require('axios');
const fs = require('fs');

// Configuração da API
const API_BASE = 'http://localhost:9010';
const TEST_USER = {
    username: 'admin@memorialpro.com',
    password: '123456'
};

// Dados de teste simulando DXF com 25 lotes
const MOCK_DXF_DATA = {
    entities: [
        // Simulando entidades de 25 lotes
        ...Array.from({length: 25}, (_, i) => ({
            type: "TEXT",
            layer: `LOTE_${String(i + 1).padStart(2, '0')}`,
            fingerprint: `lote_${i + 1}_${Date.now()}`,
            x: 2888.27 + (i % 5) * 22.17,
            y: 1468.78 + Math.floor(i / 5) * 20.09,
            z: null,
            x2: null,
            y2: null,
            z2: null,
            radius: null,
            startAngle: null,
            endAngle: null,
            text: `LOTE ${String(i + 1).padStart(2, '0')}`,
            textStyle: "STANDARD",
            textHeight: 2.5,
            textRotation: 0.0,
            vertices: []
        })),
        // Adiciona algumas linhas para simular divisões
        ...Array.from({length: 10}, (_, i) => ({
            type: "LINE",
            layer: "DIVISOES",
            fingerprint: `line_${i}_${Date.now()}`,
            x: 2888.27 + i * 11.085,
            y: 1468.78,
            z: null,
            x2: 2888.27 + i * 11.085,
            y2: 1569.23,
            z2: null,
            radius: null,
            startAngle: null,
            endAngle: null,
            text: null,
            textStyle: null,
            textHeight: null,
            textRotation: null,
            vertices: []
        }))
    ],
    fileName: "loteamento_25_lotes_teste.dxf",
    projectName: "Teste Interceptação Memorial - 25 Lotes",
    projectDescription: "Teste automatizado para validar detecção e geração de 25 lotes",
    standardId: null
};

class MemorialTestSuite {
    constructor() {
        this.token = null;
        this.testResults = {
            login: false,
            diagnostico: false,
            conectividade: false,
            memorial_tradicional: false,
            memorial_ia: false,
            validacao_25_lotes: false,
            coordenadas_reais: false
        };
        this.logs = [];
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type}: ${message}`;
        console.log(logEntry);
        this.logs.push(logEntry);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async login() {
        try {
            this.log('🔐 Iniciando login...');
            const response = await axios.post(`${API_BASE}/api/auth/login`, TEST_USER);
            
            if (response.data && response.data.token) {
                this.token = response.data.token;
                this.testResults.login = true;
                this.log('✅ Login realizado com sucesso');
                return true;
            } else {
                throw new Error('Token não recebido');
            }
        } catch (error) {
            this.log(`❌ Erro no login: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async testDiagnostico() {
        try {
            this.log('🔍 Testando diagnóstico OpenAI...');
            const response = await axios.get(`${API_BASE}/api/diagnostic/openai/config`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            if (response.data && !response.data.hasIssues) {
                this.testResults.diagnostico = true;
                this.log('✅ Diagnóstico OpenAI: Configuração OK');
                this.log(`   - Sucessos: ${response.data.successes.length}`);
                this.log(`   - Problemas: ${response.data.issues.length}`);
                return true;
            } else {
                this.log('⚠️ Diagnóstico encontrou problemas:', 'WARN');
                response.data.issues.forEach(issue => this.log(`   - ${issue}`, 'WARN'));
                return false;
            }
        } catch (error) {
            this.log(`❌ Erro no diagnóstico: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async testConectividade() {
        try {
            this.log('🌐 Testando conectividade OpenAI...');
            const response = await axios.get(`${API_BASE}/api/diagnostic/openai/test`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });

            if (response.data && response.data.status === 'SUCCESS') {
                this.testResults.conectividade = true;
                this.log('✅ Conectividade OpenAI: OK');
                this.log(`   - Status: ${response.data.status}`);
                this.log(`   - Mensagem: ${response.data.connectivityTest.message}`);
                return true;
            } else {
                this.log(`⚠️ Conectividade falhou: ${response.data.status}`, 'WARN');
                return false;
            }
        } catch (error) {
            this.log(`❌ Erro na conectividade: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async testMemorialTradicional() {
        try {
            this.log('📝 Testando memorial tradicional...');
            const response = await axios.post(`${API_BASE}/api/memorial/generate-traditional`, MOCK_DXF_DATA, {
                headers: { 
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.memorialText) {
                this.testResults.memorial_tradicional = true;
                this.log('✅ Memorial tradicional gerado');
                this.log(`   - Tamanho: ${response.data.memorialText.length} caracteres`);
                
                // Salva o memorial tradicional
                fs.writeFileSync('memorial_tradicional_teste.txt', response.data.memorialText, 'utf8');
                this.log('   - Salvo em: memorial_tradicional_teste.txt');
                return response.data;
            } else {
                throw new Error('Memorial não gerado');
            }
        } catch (error) {
            this.log(`❌ Erro no memorial tradicional: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async testMemorialIA() {
        try {
            this.log('🤖 Testando memorial com IA...');
            this.log('   - Enviando dados de 25 lotes para IA...');
            
            const startTime = Date.now();
            const response = await axios.post(`${API_BASE}/api/memorial/generate-gpt`, MOCK_DXF_DATA, {
                headers: { 
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 180000 // 3 minutos
            });

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;

            if (response.data && response.data.memorialText) {
                this.testResults.memorial_ia = true;
                this.log('✅ Memorial com IA gerado');
                this.log(`   - Tamanho: ${response.data.memorialText.length} caracteres`);
                this.log(`   - Tempo: ${duration.toFixed(2)} segundos`);
                
                // Salva o memorial da IA
                fs.writeFileSync('memorial_ia_teste.txt', response.data.memorialText, 'utf8');
                this.log('   - Salvo em: memorial_ia_teste.txt');
                
                return response.data;
            } else {
                throw new Error('Memorial IA não gerado');
            }
        } catch (error) {
            this.log(`❌ Erro no memorial IA: ${error.message}`, 'ERROR');
            if (error.code === 'ECONNABORTED') {
                this.log('   - Timeout na requisição (>3min)', 'ERROR');
            }
            return null;
        }
    }

    async validarMemorial25Lotes(memorial) {
        try {
            this.log('🔍 Validando memorial para 25 lotes...');
            
            if (!memorial || !memorial.memorialText) {
                throw new Error('Memorial não fornecido');
            }

            const texto = memorial.memorialText;
            
            // Conta quantos lotes foram gerados
            const lotesEncontrados = (texto.match(/LOTE \d+/g) || []).length;
            const secaoLotes = (texto.match(/### LOTE \d+:|LOTE \d+:/g) || []).length;
            
            this.log(`   - Lotes mencionados no texto: ${lotesEncontrados}`);
            this.log(`   - Seções de lotes encontradas: ${secaoLotes}`);
            
            // Verifica se tem pelo menos 20 lotes (tolerância)
            if (secaoLotes >= 20) {
                this.testResults.validacao_25_lotes = true;
                this.log('✅ Validação 25 lotes: PASSOU');
                this.log(`   - Encontrados ${secaoLotes} lotes (≥20 esperado)`);
            } else {
                this.log(`⚠️ Validação 25 lotes: FALHOU - apenas ${secaoLotes} lotes`, 'WARN');
            }

            // Verifica coordenadas reais
            const coordenadasReais = texto.match(/E \d{4}\.\d{2}m.*N \d{4}\.\d{2}m/g) || [];
            const coordenadasFicticias = texto.match(/123456|7654321/g) || [];
            
            this.log(`   - Coordenadas reais encontradas: ${coordenadasReais.length}`);
            this.log(`   - Coordenadas fictícias encontradas: ${coordenadasFicticias.length}`);
            
            if (coordenadasReais.length > 0 && coordenadasFicticias.length === 0) {
                this.testResults.coordenadas_reais = true;
                this.log('✅ Validação coordenadas: PASSOU');
            } else {
                this.log('⚠️ Validação coordenadas: FALHOU', 'WARN');
            }

            return {
                lotes: secaoLotes,
                coordenadasReais: coordenadasReais.length,
                coordenadasFicticias: coordenadasFicticias.length
            };

        } catch (error) {
            this.log(`❌ Erro na validação: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async executarTeste() {
        this.log('🚀 INICIANDO TESTE DE INTERCEPTAÇÃO DE MEMORIAL');
        this.log('=' * 60);

        // 1. Login
        if (!await this.login()) {
            this.log('❌ TESTE ABORTADO: Falha no login', 'ERROR');
            return this.gerarRelatorio();
        }

        await this.sleep(1000);

        // 2. Diagnóstico
        await this.testDiagnostico();
        await this.sleep(1000);

        // 3. Conectividade
        await this.testConectividade();
        await this.sleep(1000);

        // 4. Memorial Tradicional
        const memorialTradicional = await this.testMemorialTradicional();
        await this.sleep(2000);

        // 5. Memorial com IA
        const memorialIA = await this.testMemorialIA();
        await this.sleep(1000);

        // 6. Validação
        if (memorialIA) {
            await this.validarMemorial25Lotes(memorialIA);
        }

        return this.gerarRelatorio();
    }

    gerarRelatorio() {
        this.log('📊 GERANDO RELATÓRIO FINAL');
        this.log('=' * 60);

        const totalTestes = Object.keys(this.testResults).length;
        const testesPassaram = Object.values(this.testResults).filter(Boolean).length;
        const percentualSucesso = (testesPassaram / totalTestes * 100).toFixed(1);

        this.log(`📈 RESULTADO GERAL: ${testesPassaram}/${totalTestes} testes passaram (${percentualSucesso}%)`);
        this.log('');

        // Detalhes por teste
        Object.entries(this.testResults).forEach(([teste, passou]) => {
            const status = passou ? '✅ PASSOU' : '❌ FALHOU';
            this.log(`   ${teste.replace(/_/g, ' ').toUpperCase()}: ${status}`);
        });

        this.log('');
        this.log('📁 ARQUIVOS GERADOS:');
        this.log('   - memorial_tradicional_teste.txt');
        this.log('   - memorial_ia_teste.txt');
        this.log('   - relatorio_teste_memorial.txt');

        // Salva relatório completo
        const relatorio = this.logs.join('\n');
        fs.writeFileSync('relatorio_teste_memorial.txt', relatorio, 'utf8');

        const sucesso = percentualSucesso >= 80;
        this.log(`🎯 RESULTADO FINAL: ${sucesso ? 'SUCESSO' : 'FALHA'}`);
        
        return {
            sucesso,
            percentualSucesso,
            testResults: this.testResults,
            logs: this.logs
        };
    }
}

// Execução do teste
async function executarTesteCompleto() {
    const teste = new MemorialTestSuite();
    
    try {
        const resultado = await teste.executarTeste();
        
        if (resultado.sucesso) {
            console.log('\n🎉 TESTE DE INTERCEPTAÇÃO CONCLUÍDO COM SUCESSO!');
            process.exit(0);
        } else {
            console.log('\n❌ TESTE DE INTERCEPTAÇÃO FALHOU!');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 ERRO CRÍTICO NO TESTE:', error.message);
        process.exit(1);
    }
}

// Executa se chamado diretamente
if (require.main === module) {
    executarTesteCompleto();
}

module.exports = { MemorialTestSuite, MOCK_DXF_DATA };