// Serviço de configurações do sistema
export interface ViewerConfig {
  textScale: number;
  flipY: boolean;
  defaultZoom: number;
  showValidation: boolean;
  showLayerPanel: boolean;
}

export interface AppConfig {
  viewer: ViewerConfig;
  // Futuras configurações podem ser adicionadas aqui
  // property: PropertyConfig;
  // api: ApiConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  viewer: {
    textScale: 1,
    flipY: false,
    defaultZoom: 20, // Zoom padrão 20x para desenhos aparecerem em tamanho adequado
    showValidation: false,
    showLayerPanel: false
  }
};

class ConfigService {
  private config: AppConfig = DEFAULT_CONFIG;
  private configKey = 'memorialPro_config';

  constructor() {
    this.loadConfig();
  }

  /**
   * Carrega configurações do localStorage como fallback
   * Em produção, isso poderia vir de um arquivo ou API
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem(this.configKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      } else {
        this.saveConfig(); // Salvar configurações padrão
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      this.config = DEFAULT_CONFIG;
    }
  }

  /**
   * Salva configurações
   * Em produção, isso poderia salvar em um arquivo ou API
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
    }
  }

  /**
   * Obtém todas as configurações
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Obtém configurações do viewer
   */
  getViewerConfig(): ViewerConfig {
    return { ...this.config.viewer };
  }

  /**
   * Atualiza configurações do viewer
   */
  updateViewerConfig(updates: Partial<ViewerConfig>): void {
    this.config.viewer = { ...this.config.viewer, ...updates };
    this.saveConfig();
  }

  /**
   * Atualiza uma configuração específica do viewer
   */
  setViewerSetting<K extends keyof ViewerConfig>(key: K, value: ViewerConfig[K]): void {
    this.config.viewer[key] = value;
    this.saveConfig();
  }

  /**
   * Obtém uma configuração específica do viewer
   */
  getViewerSetting<K extends keyof ViewerConfig>(key: K): ViewerConfig[K] {
    return this.config.viewer[key];
  }

  /**
   * Reseta configurações para o padrão
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  /**
   * Exporta configurações para backup
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importa configurações de backup
   */
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      // Validar estrutura básica
      if (imported && typeof imported === 'object' && imported.viewer) {
        this.config = { ...DEFAULT_CONFIG, ...imported };
        this.saveConfig();
        return true;
      } else {
        console.error('❌ Formato de configuração inválido');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao importar configurações:', error);
      return false;
    }
  }
}

// Instância singleton do serviço de configurações
export const configService = new ConfigService();

// Hook para usar configurações em componentes React
export const useViewerConfig = () => {
  const getConfig = () => configService.getViewerConfig();
  const updateConfig = (updates: Partial<ViewerConfig>) => configService.updateViewerConfig(updates);
  const setSetting = <K extends keyof ViewerConfig>(key: K, value: ViewerConfig[K]) => 
    configService.setViewerSetting(key, value);
  const getSetting = <K extends keyof ViewerConfig>(key: K) => 
    configService.getViewerSetting(key);

  return {
    config: getConfig(),
    updateConfig,
    setSetting,
    getSetting
  };
};
