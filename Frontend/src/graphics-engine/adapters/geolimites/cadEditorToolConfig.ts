import type {
  CadDockDefinition,
  CadToolDefinition
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export const GEO_LIMITES_CAD_DOCKS: CadDockDefinition[] = [
  { id: 'ferramentas', label: 'Ferramentas', icon: 'dockFerramentas' },
  { id: 'criar-molde', label: 'Desenhar', icon: 'dockCriarMolde' },
  { id: 'ajustes', label: 'Modificar', icon: 'dockAjustes' },
  { id: 'costura-medidas', label: 'Operacoes', icon: 'dockCosturaMedidas' },
  { id: 'utilitarios', label: 'Utilitarios', icon: 'dockUtilitarios' }
];

export const GEO_LIMITES_CAD_TOOLS: CadToolDefinition[] = [
  { id: 'select', label: 'Selecionar', section: 'ferramentas' },
  { id: 'pan', label: 'Mover (Pan)', section: 'ferramentas' },
  { id: 'zoom', label: 'Zoom', section: 'ferramentas' },
  { id: 'rectangle', label: 'Retangulo', section: 'criar-molde' },
  { id: 'circle', label: 'Circulo', section: 'criar-molde' },
  { id: 'bezier', label: 'Curva Bezier', section: 'criar-molde' },
  { id: 'point', label: 'Ponto', section: 'criar-molde' },
  { id: 'distance', label: 'Distancia', section: 'criar-molde' },
  { id: 'line', label: 'Linha', section: 'criar-molde' },
  { id: 'point-to-point', label: 'Ponto a Ponto', section: 'criar-molde' },
  { id: 'text', label: 'Texto', section: 'criar-molde' },
  { id: 'move', label: 'Mover', section: 'ajustes' },
  { id: 'copy', label: 'Copiar', section: 'ajustes' },
  { id: 'rotate', label: 'Rotacionar', section: 'ajustes' },
  { id: 'scale', label: 'Escalar', section: 'ajustes' },
  { id: 'offset', label: 'Offset', section: 'ajustes' },
  { id: 'extend', label: 'Estender', section: 'ajustes' },
  { id: 'trim', label: 'Aparar', section: 'ajustes' },
  { id: 'edit-nodes', label: 'Editar Nos', section: 'ajustes' },
  { id: 'edit-curve', label: 'Editar Curva', section: 'ajustes' },
  { id: 'knife', label: 'Cortar (Faca)', section: 'ajustes' },
  { id: 'mirror', label: 'Espelhar', section: 'ajustes' },
  { id: 'join', label: 'Unir (Weld)', section: 'ajustes' },
  { id: 'extract-start', label: 'Pintar', section: 'ajustes' },
  { id: 'finish-extract', label: 'Finalizar Extracao', section: 'ajustes' },
  { id: 'save-primary-boundary', label: 'Salvar Primarias', section: 'costura-medidas' },
  { id: 'technical-summary', label: 'Resumo Tecnico', section: 'costura-medidas' },
  { id: 'open-standards-templates', label: 'Configurar Memorial', section: 'costura-medidas' },
  { id: 'scan-errors', label: 'Buscar Erros', section: 'utilitarios' },
  { id: 'scan-errors-next', label: 'Proximo Erro', section: 'utilitarios' },
  { id: 'scan-errors-clear', label: 'Limpar Marcacoes', section: 'utilitarios' }
];
