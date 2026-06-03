import api from './api';
import type { MemorialStandard, MemorialStandardCreate } from '../types/index';

// Dados mock para desenvolvimento quando backend indisponível
const mockStandards: MemorialStandard[] = [
  {
    id: 'mock-abnt-1',
    name: 'ABNT NBR 17047:2024',
    description: 'Norma para elaboração de memorial descritivo de projetos de engenharia',
    standardText: 'Esta norma estabelece os critérios e diretrizes para elaboração de memorial descritivo de projetos de engenharia, incluindo estrutura, conteúdo mínimo e formatação.',
    promptTemplate: `Gere memorial NBR-17047 formato cartorial:

MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA
Terreno: Urbano | Proprietário: [NOME] | Localização: [RUA] | Bairro: [BAIRRO] | Município: [CIDADE]/[UF]
Objetivo: Levantamento Topográfico Planimétrico georreferenciado Datum Sirgas 2000 para desmembramento.

SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA
TERRENO 1
Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF], formato poligonal irregular, pontos [COORDENADAS], perímetro [PERÍMETRO]m ([EXTENSO]), área [ÁREA]m² ([EXTENSO]), confrontações:
AO NORTE: [DESC] AO SUL: [DESC] AO LESTE: [DESC] AO OESTE: [DESC]

__________________________________________
SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA

Para cada lote use:
LOTE X:
Um imóvel urbano, localizado na [RUA], bairro [BAIRRO], [CIDADE]/[UF], formato poligonal, pontos P01 (coordenadas E XXX.XXm e N XXX.XXm), P02 (coordenadas E XXX.XXm e N XXX.XXm), perímetro XX,XXm ([extenso]), área XX,XXm² ([extenso]), confrontações:
AO NORTE: (fundos), sentido Oeste-Leste, distância X,XXm ([extenso]), ponto PX ao PX, limita [VIZINHO].
AO SUL: (frente), sentido Oeste-Leste, distância X,XXm ([extenso]), ponto PX ao PX, limita [RUA].
AO LESTE: (lateral esquerda), sentido Sul-Norte, distância X,XXm ([extenso]), ponto PX ao PX, limita [VIZINHO].
AO OESTE: (lateral direita), sentido Sul-Norte, distância X,XXm ([extenso]), ponto PX ao PX, limita [VIZINHO].
------------------------------------------------------------------------------------------------------------------------------

TERMINE COM:
__________________________________________
DECLARAÇÃO
Declaro que o levantamento respeitou divisas e alinhamento público, sujeitando-se ao § 14, art. 213, LRP. Se não verdadeiros os fatos, responderão requerente e profissional pelos prejuízos.
[CIDADE], [DATA].
_________________________________________________
[RESPONSÁVEL] | [REGISTRO]`,
    active: true,
    isDefault: true,
    ownerId: 'mock-user',
    ownerName: 'Sistema Mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock-abnt-2',
    name: 'ABNT NBR 6118:2014',
    description: 'Projeto de estruturas de concreto - Procedimento',
    standardText: 'Esta norma estabelece os requisitos básicos exigíveis para projeto de estruturas de concreto simples, armado e protendido.',
    promptTemplate: 'Elabore memorial descritivo para estruturas de concreto conforme NBR 6118:2014, incluindo: 1) Características dos materiais, 2) Dimensionamento, 3) Detalhamento, 4) Controle de qualidade.',
    active: true,
    isDefault: false,
    ownerId: 'mock-user',
    ownerName: 'Sistema Mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock-abnt-3',
    name: 'ABNT NBR 8800:2008',
    description: 'Projeto de estruturas de aço e de estruturas mistas de aço e concreto',
    standardText: 'Esta norma estabelece os requisitos para o projeto de estruturas de aço e estruturas mistas de aço e concreto de edifícios.',
    promptTemplate: 'Elabore memorial descritivo para estruturas de aço conforme NBR 8800:2008, incluindo: 1) Materiais e propriedades, 2) Análise estrutural, 3) Dimensionamento, 4) Ligações.',
    active: true,
    isDefault: false,
    ownerId: 'mock-user',
    ownerName: 'Sistema Mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const memorialStandardsService = {
  // Listar normas disponíveis para o usuário
  getAll: async (): Promise<MemorialStandard[]> => {
    try {
      const response = await api.get<MemorialStandard[]>('/memorial-standards');
      return response.data;
    } catch (error: unknown) {
      return mockStandards;
    }
  },

  // Listar normas disponíveis para o usuário (alias para compatibilidade)
  getAvailable: async (): Promise<MemorialStandard[]> => {
    try {
      const response = await api.get<MemorialStandard[]>('/memorial-standards');
      return response.data;
    } catch (error: unknown) {
      return mockStandards;
    }
  },

  // Obter norma padrão
  getDefault: async (): Promise<MemorialStandard | null> => {
    try {
      const response = await api.get<MemorialStandard>('/memorial-standards/default');
      return response.data;
    } catch {
      return mockStandards.find(std => std.isDefault) || mockStandards[0] || null;
    }
  },

  // Obter norma por ID
  getById: async (id: string): Promise<MemorialStandard | null> => {
    try {
      const response = await api.get<MemorialStandard>(`/memorial-standards/${id}`);
      return response.data;
    } catch {
      return mockStandards.find(std => std.id === id) || null;
    }
  },

  // Criar nova norma
  create: async (data: MemorialStandardCreate): Promise<MemorialStandard> => {
    try {
      const response = await api.post<MemorialStandard>('/memorial-standards', data);
      return response.data;
    } catch {
      const newStandard: MemorialStandard = {
        id: `mock-${Date.now()}`,
        name: data.name,
        description: data.description,
        standardText: data.standardText,
        promptTemplate: data.promptTemplate,
        active: true,
        isDefault: data.isDefault,
        ownerId: 'mock-user',
        ownerName: 'Sistema Mock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Adiciona à lista mock (apenas para esta sessão)
      mockStandards.push(newStandard);
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return newStandard;
    }
  },

  // Atualizar norma existente
  update: async (id: string, data: MemorialStandardCreate): Promise<MemorialStandard> => {
    try {
      const response = await api.put<MemorialStandard>(`/memorial-standards/${id}`, data);
      return response.data;
    } catch {
      const existingIndex = mockStandards.findIndex(std => std.id === id);
      
      if (existingIndex === -1) {
        throw new Error('Norma não encontrada');
      }
      
      const updatedStandard: MemorialStandard = {
        ...mockStandards[existingIndex],
        name: data.name,
        description: data.description,
        standardText: data.standardText,
        promptTemplate: data.promptTemplate,
        isDefault: data.isDefault,
        updatedAt: new Date().toISOString()
      };
      
      // Atualiza na lista mock (apenas para esta sessão)
      mockStandards[existingIndex] = updatedStandard;
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return updatedStandard;
    }
  },

  // Deletar norma
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/memorial-standards/${id}`);
    } catch {
      const existingIndex = mockStandards.findIndex(std => std.id === id);
      
      if (existingIndex === -1) {
        throw new Error('Norma não encontrada');
      }
      
      // Remove da lista mock (apenas para esta sessão)
      mockStandards.splice(existingIndex, 1);
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
};
