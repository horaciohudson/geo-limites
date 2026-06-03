// Parser DXF simples para extrair entidades e layers
export interface DXFVertex {
  x: number;
  y: number;
}

type DXFPropertyValue = string | number | boolean | DXFVertex[] | Array<string | number>;

export interface DXFEntityProperties {
  x?: number;
  y?: number;
  z?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  centerX?: number;
  centerY?: number;
  alignmentX?: number;
  alignmentY?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  height?: number;
  textHeight?: number;
  rotation?: number;
  text?: string;
  width?: number;
  mtextWidth?: number;
  lineSpacing?: number;
  textStyle?: string;
  widthFactor?: number;
  textFlags?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  closed?: boolean;
  polylineFlag?: number;
  attachmentPoint?: number;
  horizontalAlign?: number;
  verticalAlign?: number;
  halign?: number;
  valign?: number;
  vertexCount?: number;
  vertices?: DXFVertex[];
  code_10?: string | number | Array<string | number>;
  code_20?: string | number | Array<string | number>;
  [key: string]: DXFPropertyValue | undefined;
}

export interface DXFEntity {
  type: string;
  layer: string;
  properties: DXFEntityProperties;
}

export interface DXFLayer {
  name: string;
  color?: number;
  lineType?: string;
}

export interface DXFData {
  entities: DXFEntity[];
  layers: DXFLayer[];
  entityCounts: Record<string, number>;
  layerCounts: Record<string, number>;
}

/**
 * Parser básico para arquivos DXF
 * Extrai entidades e layers do conteúdo DXF
 */
export class DXFParser {
  private lines: string[];
  private currentIndex: number = 0;

  constructor(content: string) {
    this.lines = content.split('\n').map(line => line.trim());
  }

  private parseNumber(value: DXFPropertyValue | undefined): number | null {
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private parseNumberList(value: DXFPropertyValue | undefined): number[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? this.parseNumber(item) : null))
        .filter((item): item is number => item !== null);
    }

    const parsed = this.parseNumber(value);
    return parsed === null ? [] : [parsed];
  }

  /**
   * Faz o parsing completo do arquivo DXF
   */
  parse(): DXFData {
    this.currentIndex = 0;
    const entities: DXFEntity[] = [];
    const layers: DXFLayer[] = [];

    // Procura pela seção ENTITIES
    const entitiesStart = this.findSection('ENTITIES');
    if (entitiesStart !== -1) {
      this.currentIndex = entitiesStart;
      this.parseEntities(entities);
    }

    // Procura pela seção TABLES (onde ficam as layers)
    const tablesStart = this.findSection('TABLES');
    if (tablesStart !== -1) {
      this.currentIndex = tablesStart;
      this.parseLayers(layers);
    }

    // Calcula contadores
    const entityCounts = this.countEntities(entities);
    const layerCounts = this.countLayers(entities);

    return {
      entities,
      layers,
      entityCounts,
      layerCounts
    };
  }

  /**
   * Encontra uma seção específica no DXF
   */
  private findSection(sectionName: string): number {
    for (let i = 0; i < this.lines.length - 1; i++) {
      if (this.lines[i] === '0' && this.lines[i + 1] === 'SECTION') {
        // Procura o nome da seção
        for (let j = i + 2; j < this.lines.length - 1; j++) {
          if (this.lines[j] === '2' && this.lines[j + 1] === sectionName) {
            return j + 2;
          }
          if (this.lines[j] === '0') break;
        }
      }
    }
    return -1;
  }

  /**
   * Faz o parsing das entidades
   */
  private parseEntities(entities: DXFEntity[]): void {
    while (this.currentIndex < this.lines.length - 1) {
      const line = this.lines[this.currentIndex];
      
      if (line === '0') {
        const nextLine = this.lines[this.currentIndex + 1];
        
        if (nextLine === 'ENDSEC') {
          break;
        }

        // Tipos de entidades comuns
        if (['LINE', 'CIRCLE', 'ARC', 'TEXT', 'POLYLINE', 'LWPOLYLINE', 'INSERT'].includes(nextLine)) {
          const entity = this.parseEntity(nextLine);
          if (entity) {
            entities.push(entity);
          }
        }
      }
      
      this.currentIndex++;
    }
  }

  /**
   * Faz o parsing de uma entidade específica
   */
  private parseEntity(entityType: string): DXFEntity | null {
    const entity: DXFEntity = {
      type: entityType,
      layer: '0', // layer padrão
      properties: {}
    };

    this.currentIndex += 2; // pula o '0' e o tipo da entidade

    // Lê as propriedades da entidade
    while (this.currentIndex < this.lines.length - 1) {
      const code = this.lines[this.currentIndex];
      const value = this.lines[this.currentIndex + 1];

      if (code === '0') {
        // Próxima entidade, volta um passo
        this.currentIndex--;
        break;
      }

      // Códigos importantes para diferentes tipos de entidades
      switch (code) {
        case '8': // Layer
          entity.layer = value;
          break;
        
        // Coordenadas principais
        case '10': // X coordinate (start point for lines, center for circles)
          const xValue = parseFloat(value);
          if (!isNaN(xValue)) {
            if (entityType === 'LINE') {
              entity.properties.x1 = xValue;
              entity.properties.x = xValue; // Também armazenar como x genérico
            } else if (entityType === 'CIRCLE' || entityType === 'ARC') {
              entity.properties.centerX = xValue;
              entity.properties.x = xValue; // Também armazenar como x genérico
            } else if (entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') {
              // Para polylines, captura múltiplas coordenadas X
              if (entity.properties.code_10 !== undefined) {
                if (!Array.isArray(entity.properties.code_10)) {
                  entity.properties.code_10 = [entity.properties.code_10];
                }
                entity.properties.code_10.push(xValue);
              } else {
                entity.properties.code_10 = xValue;
              }
              // Também armazenar a primeira coordenada como x genérico
              if (entity.properties.x === undefined) {
                entity.properties.x = xValue;
              }
            } else {
              entity.properties.x = xValue;
            }
          }
          break;
        case '20': // Y coordinate
          const yValue = parseFloat(value);
          if (!isNaN(yValue)) {
            if (entityType === 'LINE') {
              entity.properties.y1 = yValue;
              entity.properties.y = yValue; // Também armazenar como y genérico
            } else if (entityType === 'CIRCLE' || entityType === 'ARC') {
              entity.properties.centerY = yValue;
              entity.properties.y = yValue; // Também armazenar como y genérico
            } else if (entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') {
              // Para polylines, captura múltiplas coordenadas Y
              if (entity.properties.code_20 !== undefined) {
                if (!Array.isArray(entity.properties.code_20)) {
                  entity.properties.code_20 = [entity.properties.code_20];
                }
                entity.properties.code_20.push(yValue);
              } else {
                entity.properties.code_20 = yValue;
              }
              // Também armazenar a primeira coordenada como y genérico
              if (entity.properties.y === undefined) {
                entity.properties.y = yValue;
              }
            } else {
              entity.properties.y = yValue;
            }
          }
          break;
        case '30': // Z coordinate
          entity.properties.z = parseFloat(value);
          break;
        
        // Coordenadas finais (para linhas) ou pontos de alinhamento (para texto)
        case '11': // X2 coordinate (end point for lines) or alignment point X (for text)
          const x2Value = parseFloat(value);
          if (!isNaN(x2Value)) {
            if (entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.properties.alignmentX = x2Value;
            } else {
              entity.properties.x2 = x2Value;
            }
          }
          break;
        case '21': // Y2 coordinate (end point for lines) or alignment point Y (for text)
          const y2Value = parseFloat(value);
          if (!isNaN(y2Value)) {
            if (entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.properties.alignmentY = y2Value;
            } else {
              entity.properties.y2 = y2Value;
            }
          }
          break;
        
        // Propriedades específicas
        case '40': // Radius (for circles and arcs) or Text height
          const val40 = parseFloat(value);
          if (!isNaN(val40)) {
            if (entityType === 'CIRCLE' || entityType === 'ARC') {
              entity.properties.radius = val40;
            } else if (entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.properties.height = val40;
              entity.properties.textHeight = val40; // Alias para compatibilidade
            } else {
              entity.properties.radius = val40; // Fallback
            }
          }
          break;
        case '50': // Start angle (for arcs) or Rotation angle (for text)
          const val50 = parseFloat(value);
          if (!isNaN(val50)) {
            if (entityType === 'ARC') {
              entity.properties.startAngle = val50;
            } else if (entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.properties.rotation = val50;
            }
          }
          break;
        case '51': // End angle (for arcs)
          const endAngle = parseFloat(value);
          if (!isNaN(endAngle)) {
            entity.properties.endAngle = endAngle;
          }
          break;
        case '1': // Text value
          entity.properties.text = value;
          break;
        case '3': // Additional text (for MTEXT continuation)
          if (entityType === 'MTEXT') {
            // MTEXT pode ter múltiplas linhas de código 3
            entity.properties.text = (entity.properties.text || '') + value;
          }
          break;
        case '43': // Width of MTEXT
          if (entityType === 'MTEXT') {
            const mtextWidth = parseFloat(value);
            if (!isNaN(mtextWidth)) {
              entity.properties.width = mtextWidth;
              entity.properties.mtextWidth = mtextWidth;
            }
          }
          break;
        case '44': // Line spacing factor for MTEXT
          if (entityType === 'MTEXT') {
            const lineSpacing = parseFloat(value);
            if (!isNaN(lineSpacing)) {
              entity.properties.lineSpacing = lineSpacing;
            }
          }
          break;
        case '7': // Text style
          entity.properties.textStyle = value;
          break;
        case '41': // Text width factor or other height
          const val41 = parseFloat(value);
          if (!isNaN(val41)) {
            if (entityType === 'TEXT' || entityType === 'MTEXT') {
              entity.properties.widthFactor = val41;
            }
          }
          break;
        case '71': // Text generation flags
          if (entityType === 'TEXT' || entityType === 'MTEXT') {
            const textFlags = parseInt(value);
            if (!isNaN(textFlags)) {
              entity.properties.textFlags = textFlags;
              entity.properties.mirrorX = (textFlags & 2) !== 0;
              entity.properties.mirrorY = (textFlags & 4) !== 0;
            }
          }
          break;
        
        // Para polylines e MTEXT
        case '70': // Polyline flag (closed/open) or MTEXT attachment point
          const val70 = parseInt(value);
          if (!isNaN(val70)) {
            if (entityType === 'POLYLINE' || entityType === 'LWPOLYLINE') {
              entity.properties.closed = (val70 & 1) === 1;
              entity.properties.polylineFlag = val70;
            } else if (entityType === 'MTEXT') {
              entity.properties.attachmentPoint = val70;
              // Converter attachment point para alinhamentos
              // 1=TopLeft, 2=TopCenter, 3=TopRight, 4=MiddleLeft, 5=MiddleCenter, 6=MiddleRight, 7=BottomLeft, 8=BottomCenter, 9=BottomRight
              const hAlign = ((val70 - 1) % 3); // 0=left, 1=center, 2=right
              const vAlign = Math.floor((val70 - 1) / 3); // 0=top, 1=middle, 2=bottom
              entity.properties.horizontalAlign = hAlign;
              entity.properties.verticalAlign = vAlign;
            }
          }
          break;
        case '90': // Number of vertices
          const vertexCount = parseInt(value);
          if (!isNaN(vertexCount)) {
            entity.properties.vertexCount = vertexCount;
          }
          break;
        
        // Propriedades adicionais importantes
        case '72': // Horizontal text justification
          if (entityType === 'TEXT' || entityType === 'MTEXT') {
            const hAlign = parseInt(value);
            if (!isNaN(hAlign)) {
              entity.properties.horizontalAlign = hAlign;
              entity.properties.halign = hAlign; // Alias
            }
          }
          break;
        case '73': // Vertical text justification
          if (entityType === 'TEXT' || entityType === 'MTEXT') {
            const vAlign = parseInt(value);
            if (!isNaN(vAlign)) {
              entity.properties.verticalAlign = vAlign;
              entity.properties.valign = vAlign; // Alias
            }
          }
          break;
        
        default:
          // Armazena outras propriedades com prefixo para debug
          entity.properties[`code_${code}`] = value;
          break;
      }

      this.currentIndex += 2;
    }

    // Pós-processamento para polylines
    if (entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') {
      entity.properties.vertices = this.extractPolylineVertices(entity.properties);
    }

    return entity;
  }

  /**
   * Faz o parsing das layers
   */
  private parseLayers(layers: DXFLayer[]): void {
    // Procura pela tabela LAYER
    while (this.currentIndex < this.lines.length - 1) {
      const line = this.lines[this.currentIndex];
      
      if (line === '0' && this.lines[this.currentIndex + 1] === 'TABLE') {
        // Verifica se é a tabela LAYER
        for (let i = this.currentIndex + 2; i < this.lines.length - 1; i++) {
          if (this.lines[i] === '2' && this.lines[i + 1] === 'LAYER') {
            this.currentIndex = i + 2;
            this.parseLayerTable(layers);
            return;
          }
          if (this.lines[i] === '0') break;
        }
      }
      
      this.currentIndex++;
    }
  }

  /**
   * Faz o parsing da tabela de layers
   */
  private parseLayerTable(layers: DXFLayer[]): void {
    while (this.currentIndex < this.lines.length - 1) {
      const line = this.lines[this.currentIndex];
      
      if (line === '0') {
        const nextLine = this.lines[this.currentIndex + 1];
        
        if (nextLine === 'ENDTAB') {
          break;
        }

        if (nextLine === 'LAYER') {
          const layer = this.parseLayer();
          if (layer) {
            layers.push(layer);
          }
        }
      }
      
      this.currentIndex++;
    }
  }

  /**
   * Faz o parsing de uma layer específica
   */
  private parseLayer(): DXFLayer | null {
    const layer: DXFLayer = {
      name: '0'
    };

    this.currentIndex += 2; // pula o '0' e 'LAYER'

    while (this.currentIndex < this.lines.length - 1) {
      const code = this.lines[this.currentIndex];
      const value = this.lines[this.currentIndex + 1];

      if (code === '0') {
        this.currentIndex--;
        break;
      }

      switch (code) {
        case '2': // Layer name
          layer.name = value;
          break;
        case '62': // Color
          layer.color = parseInt(value);
          break;
        case '6': // Line type
          layer.lineType = value;
          break;
      }

      this.currentIndex += 2;
    }

    return layer;
  }

  /**
   * Extrai vértices de polylines com melhor suporte para arquivos reais
   */
  private extractPolylineVertices(properties: DXFEntityProperties): DXFVertex[] {
    const vertices: DXFVertex[] = [];
    
    // Coleta todas as coordenadas X (código 10) e Y (código 20)
    const xCoords = this.parseNumberList(properties.code_10);
    const yCoords = this.parseNumberList(properties.code_20);
    
    // Combina as coordenadas X e Y
    const minLength = Math.min(xCoords.length, yCoords.length);
    for (let i = 0; i < minLength; i++) {
      vertices.push({
        x: xCoords[i],
        y: yCoords[i]
      });
    }
    
    // Se não encontrou vértices no formato acima, tenta outros formatos
    if (vertices.length === 0) {
      // Tenta formato x1,y1, x2,y2, etc.
      let vertexIndex = 1;
      while (properties[`x${vertexIndex}`] !== undefined && properties[`y${vertexIndex}`] !== undefined) {
        const x = this.parseNumber(properties[`x${vertexIndex}`]);
        const y = this.parseNumber(properties[`y${vertexIndex}`]);
        if (x !== null && y !== null) {
          vertices.push({ x, y });
        }
        vertexIndex++;
      }
      
      // Se ainda não encontrou, tenta o formato padrão x,y
      if (vertices.length === 0 && properties.x !== undefined && properties.y !== undefined) {
        const x = this.parseNumber(properties.x);
        const y = this.parseNumber(properties.y);
        if (x !== null && y !== null) {
          vertices.push({ x, y });
        }
      }
    }

    return vertices;
  }

  /**
   * Conta entidades por tipo
   */
  private countEntities(entities: DXFEntity[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    entities.forEach(entity => {
      counts[entity.type] = (counts[entity.type] || 0) + 1;
    });

    return counts;
  }

  /**
   * Conta entidades por layer
   */
  private countLayers(entities: DXFEntity[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    entities.forEach(entity => {
      counts[entity.layer] = (counts[entity.layer] || 0) + 1;
    });

    return counts;
  }
}

/**
 * Função utilitária para fazer o parsing de um arquivo DXF
 */
export function parseDXF(content: string): DXFData {
  const parser = new DXFParser(content);
  return parser.parse();
}
