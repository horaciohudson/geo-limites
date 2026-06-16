import api from './api';
import { getStoredToken } from '@/auth/session';
import type { 
  Template, 
  TemplateCreate, 
  TemplateUpdate, 
  TemplateGenerationRequest, 
  TemplateGenerationResponse 
} from '../types/template';

interface ApiErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback;
  }

  return fallback;
};

export const templatesService = {
  // Listar templates disponíveis para o usuário
  getAll: async (): Promise<Template[]> => {
    const response = await api.get('/templates');
    return response.data;
  },

  // Listar templates ativos
  getActive: async (): Promise<Template[]> => {
    const response = await api.get('/templates?status=ACTIVE');
    return response.data;
  },

  // Obter template por ID
  getById: async (id: string): Promise<Template | null> => {
    try {
      const response = await api.get(`/templates/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  // Criar novo template
  create: async (data: TemplateCreate): Promise<Template> => {
    const response = await api.post('/templates', data);
    return response.data;
  },

  // Atualizar template existente
  update: async (id: string, data: TemplateUpdate): Promise<Template> => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  // Deletar template
  delete: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  // Ativar/Desativar template
  updateStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Template> => {
    const response = await api.patch(`/templates/${id}/status`, { status });
    return response.data;
  },

  // Upload de arquivo de exemplo para geração de template
  uploadExample: async (file: File): Promise<{ id: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/templates/upload-example', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Gerar template com base no fluxo documental da plataforma
  generateTemplate: async (file: File, request: Omit<TemplateGenerationRequest, 'exampleFileId' | 'targetFolderPath'>): Promise<TemplateGenerationResponse> => {
    try {
      const token = getStoredToken();
      
      const formData = new FormData();
      formData.append('exampleFile', file);
      formData.append('name', request.name);
      
      if (request.description) formData.append('description', request.description);
      if (request.municipality) formData.append('municipality', request.municipality);
      if (request.abntNorm) formData.append('abntNorm', request.abntNorm);
      if (request.memorialStandardId) formData.append('memorialStandardId', request.memorialStandardId);

      // Usar apenas o endpoint correto com proxy configurado
      const response = await api.post('/api/templates/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      return response.data;
    } catch (error: unknown) {
      console.error('Erro detalhado ao gerar template:', error);
      const apiError = error as ApiErrorLike;
      
      // Verificar se é erro de autenticação
      if (apiError.response?.status === 403) {
        console.error('❌ Erro de autenticação - usuário não autorizado');
        throw new Error('Você não tem permissão para gerar templates. Faça login novamente.');
      }
      
      // Verificar se é erro de recurso não encontrado
      if (apiError.response?.status === 500 && apiError.response?.data?.message?.includes('No static resource')) {
        console.error('❌ Endpoint não encontrado no backend');
        throw new Error('O endpoint de geração de templates não está disponível no servidor. Verifique se o backend está configurado corretamente.');
      }
      
      // Relançar o erro com mais informações
      throw new Error(getErrorMessage(error, 'Erro ao gerar template.'));
    }
  },

  // Buscar templates por município
  getByMunicipality: async (municipality: string): Promise<Template[]> => {
    const response = await api.get(`/templates?municipality=${encodeURIComponent(municipality)}`);
    return response.data;
  },

  // Buscar templates por norma ABNT
  getByAbntNorm: async (abntNorm: string): Promise<Template[]> => {
    const response = await api.get(`/templates?abntNorm=${encodeURIComponent(abntNorm)}`);
    return response.data;
  },

  // Buscar templates por norma memorial
  getByMemorialStandard: async (memorialStandardId: string): Promise<Template[]> => {
    const response = await api.get(`/templates?memorialStandardId=${memorialStandardId}`);
    return response.data;
  },

  // Download do arquivo do template
  downloadTemplate: async (id: string): Promise<Blob> => {
    const response = await api.get(`/templates/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Verificar se um template existe
  exists: async (name: string, municipality?: string): Promise<boolean> => {
    try {
      const params = new URLSearchParams({ name });
      if (municipality) {
        params.append('municipality', municipality);
      }
      
      const response = await api.get(`/templates/exists?${params.toString()}`);
      return response.data.exists;
    } catch (error) {
      return false;
    }
  }
};
