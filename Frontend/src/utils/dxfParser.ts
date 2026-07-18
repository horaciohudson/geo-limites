// Parser DXF simples para extrair entidades e layers
export interface DXFVertex {
  x: number;
  y: number;
  bulge?: number;
}

interface DXFHatchLoop {
  vertices: DXFVertex[];
  closed: boolean;
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
  lineColor?: string;
  fillColor?: string;
  aciColor?: number;
  isPaperSpace?: boolean;
  layoutName?: string;
  editorEntityId?: string;
  editorGroupId?: string;
  vertexCount?: number;
  vertices?: DXFVertex[];
  code_10?: string | number | Array<string | number>;
  code_20?: string | number | Array<string | number>;
  code_42?: string | number | Array<string | number>;
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
  isFrozen?: boolean;
  isLocked?: boolean;
  hiddenByDefault?: boolean;
  editorCreated?: boolean;
}

export interface DXFData {
  entities: DXFEntity[];
  layers: DXFLayer[];
  entityCounts: Record<string, number>;
  layerCounts: Record<string, number>;
  originalLayerColors?: Record<string, number>;
}

interface DXFBlockDefinition {
  name: string;
  layer: string;
  baseX: number;
  baseY: number;
  isPaperSpace?: boolean;
  layoutName?: string;
  entities: DXFEntity[];
}

interface DXFInsertTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  layer: string;
}

const SUPPORTED_DXF_ENTITY_TYPES = new Set([
  'LINE',
  'CIRCLE',
  'ARC',
  'TEXT',
  'MTEXT',
  'ATTRIB',
  'ATTDEF',
  'POINT',
  'LWPOLYLINE',
  'POLYLINE',
  'INSERT',
  'DIMENSION',
  'ARC_DIMENSION',
  'HATCH',
  'LEADER'
]);

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

  private isTextEntity(entityType: string): boolean {
    return entityType === 'TEXT' || entityType === 'MTEXT' || entityType === 'ATTRIB' || entityType === 'ATTDEF';
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

  private isRenderable2DPolylineFlag(flag: number | null): boolean {
    if (flag === null) {
      return true;
    }

    // Exclui estruturas POLYLINE nao-2D que geram conexoes espurias no renderer:
    // 8 = 3D polyline, 16 = polygon mesh, 64 = polyface mesh.
    return (flag & 8) === 0 && (flag & 16) === 0 && (flag & 64) === 0;
  }

  private shouldRenderBySpace(_metadata: { isPaperSpace?: boolean; layoutName?: string }): boolean {
    // A pedido do usuário: não filtramos mais o Paper Space ou Layouts de forma
    // programática. A filosofia agora é abrir tudo integralmente para garantir
    // que nada se perca, e o usuário fará a limpeza (deleção) manualmente no editor.
    return true;
  }

  private shouldRenderEntity(entity: DXFEntity): boolean {
    return this.shouldRenderBySpace(entity.properties);
  }

  private shouldRenderBlock(block: DXFBlockDefinition): boolean {
    return this.shouldRenderBySpace(block);
  }

  /**
   * Faz o parsing completo do arquivo DXF
   */
  parse(): DXFData {
    this.currentIndex = 0;
    const entities: DXFEntity[] = [];
    const layers: DXFLayer[] = [];
    const blockDefinitions = new Map<string, DXFBlockDefinition>();
    const referencedBlockNames = this.collectReferencedBlockNames();

    // Procura pela secao BLOCKS antes da ENTITIES para permitir expandir INSERTs.
    const blocksStart = this.findSection('BLOCKS');
    if (blocksStart !== -1) {
      this.currentIndex = blocksStart;
      this.parseBlocks(blockDefinitions, referencedBlockNames);
    }

    // Procura pela seção ENTITIES
    const entitiesStart = this.findSection('ENTITIES');
    if (entitiesStart !== -1) {
      this.currentIndex = entitiesStart;
      this.parseEntities(entities, blockDefinitions);
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

    const originalLayerColors: Record<string, number> = {};
    for (const layer of layers) {
      if (layer.color !== undefined) {
        originalLayerColors[layer.name] = layer.color;
      }
    }

    return {
      entities,
      layers,
      entityCounts,
      layerCounts,
      originalLayerColors
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

  private collectReferencedBlockNames(): Set<string> {
    const blockNames = new Set<string>();

    for (let i = 0; i < this.lines.length - 1; i++) {
      if (this.lines[i] !== '0') {
        continue;
      }

      const entityType = this.lines[i + 1];
      if (entityType !== 'INSERT' && entityType !== 'DIMENSION' && entityType !== 'ARC_DIMENSION') {
        continue;
      }

      for (let j = i + 2; j < this.lines.length - 1; j += 2) {
        const code = this.lines[j];
        if (code === '0') {
          break;
        }

        if (code === '2') {
          const blockName = this.lines[j + 1]?.trim();
          if (blockName) {
            blockNames.add(blockName);
          }
          break;
        }
      }
    }

    return blockNames;
  }

  /**
   * Faz o parsing das entidades
   */
  private parseEntities(entities: DXFEntity[], blockDefinitions: Map<string, DXFBlockDefinition>): void {
    while (this.currentIndex < this.lines.length - 1) {
      const line = this.lines[this.currentIndex];

      if (line !== '0') {
        this.currentIndex++;
        continue;
      }

      const nextLine = this.lines[this.currentIndex + 1];
      if (nextLine === 'ENDSEC') {
        break;
      }

      if (nextLine === 'HATCH') {
        const hatchEntities = this.parseHatchEntitiesAtCurrentIndex();
        this.currentIndex++;
        if (hatchEntities.length > 0) {
          entities.push(...hatchEntities);
        }
        continue;
      }

      if (nextLine === 'POLYLINE' || SUPPORTED_DXF_ENTITY_TYPES.has(nextLine)) {
        const entity = this.parseSupportedEntityAtCurrentIndex(nextLine);
        if (entity && !this.shouldRenderEntity(entity)) {
          continue;
        }
        if (entity?.type === 'INSERT') {
          const expandedEntities = this.expandInsertEntity(entity, blockDefinitions);
          if (expandedEntities.length > 0) {
            entities.push(...expandedEntities);
          } else {
            entities.push(entity);
          }
        } else if (entity?.type === 'HATCH') {
          const expandedEntities = this.expandHatchEntity(entity);
          if (expandedEntities.length > 0) {
            entities.push(...expandedEntities);
          }
        } else if (entity?.type === 'DIMENSION' || entity?.type === 'ARC_DIMENSION') {
          const expandedEntities = this.expandDimensionEntity(entity, blockDefinitions);
          if (expandedEntities.length > 0) {
            entities.push(...expandedEntities);
          }
        } else if (entity) {
          entities.push(entity);
        }
        continue;
      }

      this.currentIndex++;
    }
  }

  private parseSupportedEntityAtCurrentIndex(entityType: string): DXFEntity | null {
    if (entityType !== 'POLYLINE') {
      const entity = this.parseEntity(entityType);
      this.currentIndex++;
      return entity;
    }

    const polyline = this.parseEntity('POLYLINE');
    if (!polyline) {
      this.currentIndex++;
      return null;
    }

    this.currentIndex++;
    const vertices: DXFVertex[] = [];

    while (this.currentIndex < this.lines.length - 1 && this.lines[this.currentIndex] === '0') {
      const childType = this.lines[this.currentIndex + 1];
      if (childType === 'VERTEX') {
        const vertex = this.parseEntity('VERTEX');
        this.currentIndex++;
        const x = this.parseNumber(vertex?.properties?.x);
        const y = this.parseNumber(vertex?.properties?.y);
        if (x !== null && y !== null) {
          const bulge = this.parseNumber(vertex?.properties?.bulge);
          vertices.push(bulge !== null ? { x, y, bulge } : { x, y });
        }
        continue;
      }

      if (childType === 'SEQEND') {
        this.currentIndex += 2;
        break;
      }

      break;
    }

    if (vertices.length > 0) {
      polyline.properties.vertices = vertices;
    }

    const polylineFlag = this.parseNumber(polyline.properties.polylineFlag);
    if (!this.isRenderable2DPolylineFlag(polylineFlag)) {
      return null;
    }

    return polyline;
  }

  private appendHatchLoopVertex(vertices: DXFVertex[], vertex: DXFVertex): void {
    const lastVertex = vertices[vertices.length - 1];
    if (lastVertex && Math.abs(lastVertex.x - vertex.x) <= 0.0000001 && Math.abs(lastVertex.y - vertex.y) <= 0.0000001) {
      if (typeof vertex.bulge === 'number') {
        lastVertex.bulge = vertex.bulge;
      }
      return;
    }

    vertices.push(vertex);
  }

  private buildHatchArcSampleVertices(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterClockwise: boolean
  ): DXFVertex[] {
    if (!Number.isFinite(radius) || radius <= 0) {
      return [];
    }

    const normalizeAngle = (angle: number) => {
      const normalized = angle % 360;
      return normalized < 0 ? normalized + 360 : normalized;
    };

    const normalizedStart = normalizeAngle(startAngle);
    const normalizedEnd = normalizeAngle(endAngle);
    const counterClockwiseSweep = ((normalizedEnd - normalizedStart + 360) % 360 || 360);
    const clockwiseSweep = ((normalizedStart - normalizedEnd + 360) % 360 || 360);
    const useCounterClockwise = counterClockwiseSweep < clockwiseSweep
      ? true
      : clockwiseSweep < counterClockwiseSweep
        ? false
        : counterClockwise;
    const sweep = useCounterClockwise ? counterClockwiseSweep : clockwiseSweep;
    const segmentCount = Math.max(2, Math.ceil(Math.max(sweep, 1) / 15));
    const vertices: DXFVertex[] = [];

    for (let index = 0; index <= segmentCount; index += 1) {
      const step = (sweep * index) / segmentCount;
      const angle = useCounterClockwise ? (normalizedStart + step) : (normalizedStart - step);
      const radians = (normalizeAngle(angle) * Math.PI) / 180;
      vertices.push({
        x: centerX + (Math.cos(radians) * radius),
        y: centerY + (Math.sin(radians) * radius)
      });
    }

    return vertices;
  }

  private buildHatchLoopEntities(layer: string, loops: DXFHatchLoop[]): DXFEntity[] {
    return loops
      .filter((loop) => loop.vertices.length > 1)
      .map((loop) => {
        const vertices = [...loop.vertices];
        if (loop.closed && vertices.length > 1) {
          const firstVertex = vertices[0];
          const lastVertex = vertices[vertices.length - 1];
          if (
            Math.abs(firstVertex.x - lastVertex.x) <= 0.0000001
            && Math.abs(firstVertex.y - lastVertex.y) <= 0.0000001
          ) {
            vertices.pop();
          }
        }

        return {
          type: 'LWPOLYLINE',
          layer,
          properties: {
            vertices,
            closed: loop.closed,
            polylineFlag: loop.closed ? 1 : 0,
            x: vertices[0]?.x,
            y: vertices[0]?.y
          }
        };
      });
  }

  private parseHatchEntitiesAtCurrentIndex(): DXFEntity[] {
    let layer = '0';
    let isPaperSpace = false;
    let layoutName = '';
    const loops: DXFHatchLoop[] = [];
    let activeLoop: DXFHatchLoop | null = null;
    let hatchPolylinePath = false;
    let activePolylineVertexIndex = -1;
    let hatchCurrentEdgeType: number | null = null;
    let hatchLineStartX: number | null = null;
    let hatchLineStartY: number | null = null;
    let hatchLineEndX: number | null = null;
    let hatchLineEndY: number | null = null;
    let hatchArcCenterX: number | null = null;
    let hatchArcCenterY: number | null = null;
    let hatchArcRadius: number | null = null;
    let hatchArcStartAngle: number | null = null;
    let hatchArcEndAngle: number | null = null;
    let hatchArcCounterClockwise = false;

    const finalizeLoop = () => {
      if (!activeLoop || activeLoop.vertices.length <= 1) {
        activeLoop = null;
        return;
      }

      loops.push({
        vertices: [...activeLoop.vertices],
        closed: activeLoop.closed
      });
      activeLoop = null;
    };

    const resetEdgeState = () => {
      hatchLineStartX = null;
      hatchLineStartY = null;
      hatchLineEndX = null;
      hatchLineEndY = null;
      hatchArcCenterX = null;
      hatchArcCenterY = null;
      hatchArcRadius = null;
      hatchArcStartAngle = null;
      hatchArcEndAngle = null;
      hatchArcCounterClockwise = false;
    };

    this.currentIndex += 2;

    while (this.currentIndex < this.lines.length - 1) {
      const code = this.lines[this.currentIndex];
      const value = this.lines[this.currentIndex + 1];

      if (code === '0') {
        this.currentIndex--;
        break;
      }

      switch (code) {
        case '8':
          layer = value;
          break;
        case '67': {
          const spaceFlag = parseInt(value);
          if (!Number.isNaN(spaceFlag)) {
            isPaperSpace = spaceFlag === 1;
          }
          break;
        }
        case '410':
          layoutName = value;
          break;
        case '92': {
          finalizeLoop();
          const flags = parseInt(value);
          activeLoop = { vertices: [], closed: true };
          hatchPolylinePath = !Number.isNaN(flags) && (flags & 2) === 2;
          activePolylineVertexIndex = -1;
          hatchCurrentEdgeType = null;
          resetEdgeState();
          break;
        }
        case '72': {
          if (!activeLoop) {
            break;
          }
          if (!hatchPolylinePath) {
            const edgeType = parseInt(value);
            if (!Number.isNaN(edgeType)) {
              hatchCurrentEdgeType = edgeType;
              resetEdgeState();
            }
          }
          break;
        }
        case '73': {
          const flag = parseInt(value);
          if (activeLoop && !Number.isNaN(flag)) {
            if (hatchPolylinePath) {
              activeLoop.closed = flag !== 0;
            } else {
              hatchArcCounterClockwise = flag !== 0;
            }
          }
          break;
        }
        case '10': {
          const parsed = parseFloat(value);
          if (Number.isNaN(parsed) || !activeLoop) {
            break;
          }
          if (hatchPolylinePath) {
            activeLoop.vertices.push({ x: parsed, y: 0 });
            activePolylineVertexIndex = activeLoop.vertices.length - 1;
          } else if (hatchCurrentEdgeType === 1) {
            hatchLineStartX = parsed;
          } else if (hatchCurrentEdgeType === 2) {
            hatchArcCenterX = parsed;
          }
          break;
        }
        case '20': {
          const parsed = parseFloat(value);
          if (Number.isNaN(parsed) || !activeLoop) {
            break;
          }
          if (hatchPolylinePath) {
            const activeVertex = activeLoop.vertices[activePolylineVertexIndex];
            if (activeVertex) {
              activeVertex.y = parsed;
            }
          } else if (hatchCurrentEdgeType === 1) {
            hatchLineStartY = parsed;
          } else if (hatchCurrentEdgeType === 2) {
            hatchArcCenterY = parsed;
          }
          break;
        }
        case '42': {
          if (!activeLoop || !hatchPolylinePath) {
            break;
          }
          const parsed = parseFloat(value);
          const activeVertex = activeLoop.vertices[activePolylineVertexIndex];
          if (activeVertex && !Number.isNaN(parsed) && Math.abs(parsed) > 0.0000001) {
            activeVertex.bulge = parsed;
          }
          break;
        }
        case '11': {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed) && hatchCurrentEdgeType === 1) {
            hatchLineEndX = parsed;
          }
          break;
        }
        case '21': {
          const parsed = parseFloat(value);
          if (Number.isNaN(parsed) || !activeLoop) {
            break;
          }
          if (hatchCurrentEdgeType === 1) {
            hatchLineEndY = parsed;
            if (
              hatchLineStartX !== null
              && hatchLineStartY !== null
              && hatchLineEndX !== null
              && hatchLineEndY !== null
            ) {
              this.appendHatchLoopVertex(activeLoop.vertices, { x: hatchLineStartX, y: hatchLineStartY });
              this.appendHatchLoopVertex(activeLoop.vertices, { x: hatchLineEndX, y: hatchLineEndY });
            }
          }
          break;
        }
        case '40': {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed) && hatchCurrentEdgeType === 2) {
            hatchArcRadius = parsed;
          }
          break;
        }
        case '50': {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed) && hatchCurrentEdgeType === 2) {
            hatchArcStartAngle = parsed;
          }
          break;
        }
        case '51': {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed) && activeLoop && hatchCurrentEdgeType === 2) {
            hatchArcEndAngle = parsed;
            if (
              hatchArcCenterX !== null
              && hatchArcCenterY !== null
              && hatchArcRadius !== null
              && hatchArcStartAngle !== null
            ) {
              const arcVertices = this.buildHatchArcSampleVertices(
                hatchArcCenterX,
                hatchArcCenterY,
                hatchArcRadius,
                hatchArcStartAngle,
                hatchArcEndAngle,
                hatchArcCounterClockwise
              );
              arcVertices.forEach((vertex) => this.appendHatchLoopVertex(activeLoop!.vertices, vertex));
            }
          }
          break;
        }
      }

      this.currentIndex += 2;
    }

    finalizeLoop();
    const hatchEntity: DXFEntity = {
      type: 'HATCH',
      layer,
      properties: {
        isPaperSpace,
        layoutName
      }
    };

    if (!this.shouldRenderEntity(hatchEntity)) {
      return [];
    }

    return this.buildHatchLoopEntities(layer, loops);
  }

  private expandHatchEntity(entity: DXFEntity): DXFEntity[] {
    if (entity.type !== 'HATCH') {
      return [entity];
    }

    if (entity.properties.vertices && entity.properties.vertices.length > 1) {
      return [{
        ...entity,
        type: 'LWPOLYLINE',
        properties: {
          ...entity.properties,
          closed: entity.properties.closed ?? true,
          polylineFlag: entity.properties.closed === false ? 0 : 1
        }
      }];
    }

    return [];
  }

  private parseBlocks(
    blockDefinitions: Map<string, DXFBlockDefinition>,
    referencedBlockNames: Set<string>
  ): void {
    while (this.currentIndex < this.lines.length - 1) {
      const line = this.lines[this.currentIndex];

      if (line !== '0') {
        this.currentIndex++;
        continue;
      }

      const nextLine = this.lines[this.currentIndex + 1];
      if (nextLine === 'ENDSEC') {
        break;
      }

      if (nextLine === 'BLOCK') {
        const block = this.parseBlockDefinition(referencedBlockNames);
        if (block?.name) {
          blockDefinitions.set(block.name, block);
        }
      }

      this.currentIndex++;
    }
  }

  private skipCurrentBlockDefinition(): void {
    while (this.currentIndex < this.lines.length - 1) {
      if (this.lines[this.currentIndex] === '0' && this.lines[this.currentIndex + 1] === 'ENDBLK') {
        this.currentIndex += 1; // deixa o cursor na linha ENDBLK para o incremento externo concluir o salto
        return;
      }

      this.currentIndex++;
    }
  }

  private parseBlockDefinition(referencedBlockNames: Set<string>): DXFBlockDefinition | null {
    const block: DXFBlockDefinition = {
      name: '',
      layer: '0',
      baseX: 0,
      baseY: 0,
      isPaperSpace: false,
      layoutName: '',
      entities: []
    };

    this.currentIndex += 2; // pula o '0' e o 'BLOCK'

    while (this.currentIndex < this.lines.length - 1) {
      const code = this.lines[this.currentIndex];
      const value = this.lines[this.currentIndex + 1];

      if (code === '0') {
        if (value === 'ENDBLK') {
          this.currentIndex += 1; // deixa o cursor na linha ENDBLK para o incremento externo concluir o salto
          break;
        }

        if (value === 'HATCH') {
          const hatchEntities = this.parseHatchEntitiesAtCurrentIndex();
          if (hatchEntities.length > 0) {
            block.entities.push(...hatchEntities);
          }
          continue;
        }

        if (value === 'POLYLINE' || SUPPORTED_DXF_ENTITY_TYPES.has(value)) {
          const entity = this.parseSupportedEntityAtCurrentIndex(value);
          if (entity && this.shouldRenderEntity(entity)) {
            block.entities.push(entity);
          }
          continue;
        }

        this.currentIndex++;
        continue;
      }

      switch (code) {
        case '2':
          if (!block.name) {
            block.name = value;
            if (!referencedBlockNames.has(block.name)) {
              this.skipCurrentBlockDefinition();
              return null;
            }
          }
          break;
        case '8':
          block.layer = value;
          break;
        case '10': {
          const baseX = parseFloat(value);
          if (!Number.isNaN(baseX)) {
            block.baseX = baseX;
          }
          break;
        }
        case '20': {
          const baseY = parseFloat(value);
          if (!Number.isNaN(baseY)) {
            block.baseY = baseY;
          }
          break;
        }
        case '67': {
          const spaceFlag = parseInt(value);
          if (!isNaN(spaceFlag)) {
            block.isPaperSpace = spaceFlag === 1;
          }
          break;
        }
        case '410':
          block.layoutName = value;
          break;
      }

      this.currentIndex += 2;
    }

    return block.name ? block : null;
  }

  /**
   * Faz o parsing de uma entidade específica
   */
  private parseEntity(entityType: string): DXFEntity | null {
    const entity: DXFEntity = {
      type: entityType === 'ATTDEF' ? 'ATTRIB' : entityType,
      layer: '0', // layer padrão
      properties: {}
    };
    const lwPolylineVertices: Array<Partial<DXFVertex>> = [];
    let activeLwPolylineVertexIndex = -1;
    const leaderVertices: Array<Partial<DXFVertex>> = [];
    let activeLeaderVertexIndex = -1;
    const hatchBoundaryVertices: DXFVertex[] = [];
    let hatchCurrentEdgeType: number | null = null;
    let hatchLineStartX: number | null = null;
    let hatchLineStartY: number | null = null;
    let hatchLineEndX: number | null = null;
    let hatchLineEndY: number | null = null;

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
        case '67': {
          const spaceFlag = parseInt(value);
          if (!isNaN(spaceFlag)) {
            entity.properties.isPaperSpace = spaceFlag === 1;
          }
          break;
        }
        case '62': {
          const colorNumber = parseInt(value, 10);
          if (!isNaN(colorNumber)) {
            entity.properties.aciColor = Math.abs(colorNumber);
          }
          break;
        }
        case '410':
          entity.properties.layoutName = value;
          break;
        case '2': // Nome do bloco para INSERT/DIMENSION
          if (entityType === 'INSERT' || entityType === 'DIMENSION' || entityType === 'ARC_DIMENSION') {
            entity.properties.blockName = value;
            entity.properties.code_2 = value;
          } else {
            entity.properties[`code_${code}`] = value;
          }
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
            } else if (entityType === 'LWPOLYLINE') {
              lwPolylineVertices.push({ x: xValue });
              activeLwPolylineVertexIndex = lwPolylineVertices.length - 1;
              if (entity.properties.x === undefined) {
                entity.properties.x = xValue;
              }
            } else if (entityType === 'LEADER') {
              leaderVertices.push({ x: xValue });
              activeLeaderVertexIndex = leaderVertices.length - 1;
              if (entity.properties.x === undefined) {
                entity.properties.x = xValue;
              }
            } else if (entityType === 'POLYLINE') {
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
            } else if (entityType === 'HATCH' && hatchCurrentEdgeType === 1) {
              hatchLineStartX = xValue;
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
            } else if (entityType === 'LWPOLYLINE') {
              if (activeLwPolylineVertexIndex >= 0) {
                const activeVertex = lwPolylineVertices[activeLwPolylineVertexIndex] || {};
                activeVertex.y = yValue;
                lwPolylineVertices[activeLwPolylineVertexIndex] = activeVertex;
              }
              if (entity.properties.y === undefined) {
                entity.properties.y = yValue;
              }
            } else if (entityType === 'LEADER') {
              if (activeLeaderVertexIndex >= 0) {
                const activeVertex = leaderVertices[activeLeaderVertexIndex] || {};
                activeVertex.y = yValue;
                leaderVertices[activeLeaderVertexIndex] = activeVertex;
              }
              if (entity.properties.y === undefined) {
                entity.properties.y = yValue;
              }
            } else if (entityType === 'POLYLINE') {
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
            } else if (entityType === 'HATCH' && hatchCurrentEdgeType === 1) {
              hatchLineStartY = yValue;
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
            if (entityType === 'HATCH' && hatchCurrentEdgeType === 1) {
              hatchLineEndX = x2Value;
            } else if (entityType === 'MTEXT') {
              entity.properties.directionX = x2Value;
            } else if (this.isTextEntity(entityType)) {
              entity.properties.alignmentX = x2Value;
            } else {
              entity.properties.x2 = x2Value;
            }
          }
          break;
        case '21': // Y2 coordinate (end point for lines) or alignment point Y (for text)
          const y2Value = parseFloat(value);
          if (!isNaN(y2Value)) {
            if (entityType === 'HATCH' && hatchCurrentEdgeType === 1) {
              hatchLineEndY = y2Value;
              if (
                hatchLineStartX !== null
                && hatchLineStartY !== null
                && hatchLineEndX !== null
                && hatchLineEndY !== null
              ) {
                const lastVertex = hatchBoundaryVertices[hatchBoundaryVertices.length - 1];
                if (!lastVertex || lastVertex.x !== hatchLineStartX || lastVertex.y !== hatchLineStartY) {
                  hatchBoundaryVertices.push({ x: hatchLineStartX, y: hatchLineStartY });
                }
                hatchBoundaryVertices.push({ x: hatchLineEndX, y: hatchLineEndY });
              }
            } else if (entityType === 'MTEXT') {
              entity.properties.directionY = y2Value;
            } else if (this.isTextEntity(entityType)) {
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
            } else if (this.isTextEntity(entityType)) {
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
            } else if (entityType === 'INSERT') {
              entity.properties.rotation = val50;
            } else if (this.isTextEntity(entityType)) {
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
          if (entityType === 'INSERT') {
            const scaleZ = parseFloat(value);
            if (!isNaN(scaleZ)) {
              entity.properties.scaleZ = scaleZ;
            }
          } else if (entityType === 'MTEXT') {
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
            if (entityType === 'INSERT') {
              entity.properties.scaleX = val41;
            } else if (entityType === 'MTEXT') {
              entity.properties.width = val41;
              entity.properties.mtextWidth = val41;
            } else if (this.isTextEntity(entityType)) {
              entity.properties.widthFactor = val41;
            }
          }
          break;
        case '42': // Bulge for polyline vertices
          if (entityType === 'INSERT') {
            const scaleY = parseFloat(value);
            if (!isNaN(scaleY)) {
              entity.properties.scaleY = scaleY;
            }
          } else if (entityType === 'VERTEX') {
            const bulgeValue = parseFloat(value);
            if (!isNaN(bulgeValue)) {
              entity.properties.bulge = bulgeValue;
            }
          } else if (entityType === 'LWPOLYLINE') {
            const bulgeValue = parseFloat(value);
            if (!isNaN(bulgeValue) && activeLwPolylineVertexIndex >= 0) {
              const activeVertex = lwPolylineVertices[activeLwPolylineVertexIndex] || {};
              activeVertex.bulge = bulgeValue;
              lwPolylineVertices[activeLwPolylineVertexIndex] = activeVertex;
            }
          } else if (entityType === 'POLYLINE') {
            const bulgeValue = parseFloat(value);
            if (!isNaN(bulgeValue)) {
              if (entity.properties.code_42 !== undefined) {
                if (!Array.isArray(entity.properties.code_42)) {
                  entity.properties.code_42 = [entity.properties.code_42];
                }
                entity.properties.code_42.push(bulgeValue);
              } else {
                entity.properties.code_42 = bulgeValue;
              }
            }
          }
          break;
        case '72': // Horizontal text justification, MTEXT drawing direction or hatch edge type
          if (entityType === 'HATCH') {
            const edgeType = parseInt(value);
            if (!isNaN(edgeType)) {
              hatchCurrentEdgeType = edgeType;
              hatchLineStartX = null;
              hatchLineStartY = null;
              hatchLineEndX = null;
              hatchLineEndY = null;
            }
          }
          if (entityType === 'MTEXT') {
            const drawingDirection = parseInt(value);
            if (!isNaN(drawingDirection)) {
              entity.properties.drawingDirection = drawingDirection;
            }
          } else if (this.isTextEntity(entityType)) {
            const hAlign = parseInt(value);
            if (!isNaN(hAlign)) {
              entity.properties.horizontalAlign = hAlign;
              entity.properties.halign = hAlign; // Alias
            }
          }
          break;
        case '71': // Text generation flags or MTEXT attachment point      
          if (entityType === 'MTEXT') {
            const attachmentPoint = parseInt(value);
            if (!isNaN(attachmentPoint)) {
              entity.properties.attachmentPoint = attachmentPoint;
              const hAlign = (attachmentPoint - 1) % 3;
              const mtextVAlign = Math.floor((attachmentPoint - 1) / 3);
              
              // Mapeia o alinhamento vertical do MTEXT para o padrão TEXT usado no CanvasRenderer
              // MTEXT: 0=Top, 1=Middle, 2=Bottom
              // TEXT (CanvasRenderer): 3=Top, 2=Middle, 1=Bottom, 0=Baseline
              let vAlign = 0; // fallback
              if (mtextVAlign === 0) vAlign = 3; // Top
              else if (mtextVAlign === 1) vAlign = 2; // Middle
              else if (mtextVAlign === 2) vAlign = 1; // Bottom

              entity.properties.horizontalAlign = hAlign;
              entity.properties.verticalAlign = vAlign;
            }
          } else if (this.isTextEntity(entityType)) {
            const textFlags = parseInt(value);
            if (!isNaN(textFlags)) {
              entity.properties.textFlags = textFlags;
              entity.properties.mirrorX = (textFlags & 2) !== 0;
              entity.properties.mirrorY = (textFlags & 4) !== 0;
            }
          }
          break;
        
        // Para polylines e MTEXT
        case '70': // Polyline flag (closed/open)
          const val70 = parseInt(value);
          if (!isNaN(val70)) {
            if (entityType === 'POLYLINE' || entityType === 'LWPOLYLINE') {
              entity.properties.closed = (val70 & 1) === 1;
              entity.properties.polylineFlag = val70;
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
        case '73': // Vertical text justification
          if (entityType !== 'MTEXT' && this.isTextEntity(entityType)) {
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
    if (entityType === 'LWPOLYLINE' && lwPolylineVertices.length > 0) {
      entity.properties.vertices = lwPolylineVertices
        .filter((vertex): vertex is DXFVertex => typeof vertex.x === 'number' && typeof vertex.y === 'number')
        .map((vertex) => (
          typeof vertex.bulge === 'number'
            ? { x: vertex.x, y: vertex.y, bulge: vertex.bulge }
            : { x: vertex.x, y: vertex.y }
        ));
    } else if (entityType === 'LEADER' && leaderVertices.length > 1) {
      entity.type = 'LWPOLYLINE';
      entity.properties.vertices = leaderVertices
        .filter((vertex): vertex is DXFVertex => typeof vertex.x === 'number' && typeof vertex.y === 'number')
        .map((vertex) => ({ x: vertex.x, y: vertex.y }));
      entity.properties.closed = false;
      entity.properties.polylineFlag = 0;
      entity.properties.x = entity.properties.vertices[0]?.x;
      entity.properties.y = entity.properties.vertices[0]?.y;
    } else if (entityType === 'HATCH' && hatchBoundaryVertices.length > 1) {
      entity.type = 'LWPOLYLINE';
      entity.properties.vertices = hatchBoundaryVertices;
      entity.properties.closed = true;
      entity.properties.polylineFlag = 1;
      entity.properties.x = hatchBoundaryVertices[0]?.x;
      entity.properties.y = hatchBoundaryVertices[0]?.y;
    } else if (entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') {
      entity.properties.vertices = this.extractPolylineVertices(entity.properties);
    }

    // Pós-processamento para textos
    if (this.isTextEntity(entityType) && 
        entity.properties.alignmentX !== undefined && 
        entity.properties.alignmentY !== undefined) {
      
      const hasAlignment = (entity.properties.horizontalAlign && entity.properties.horizontalAlign > 0) || 
                           (entity.properties.verticalAlign && entity.properties.verticalAlign > 0) ||
                           (entity.properties.attachmentPoint && entity.properties.attachmentPoint > 1);
                           
      const isOrigin = entity.properties.x === 0 && entity.properties.y === 0;
      
      if (hasAlignment || isOrigin) {
        entity.properties.x = entity.properties.alignmentX;
        entity.properties.y = entity.properties.alignmentY;
      }
    }

    if (
      entityType === 'MTEXT'
      && entity.properties.rotation === undefined
      && typeof entity.properties.directionX === 'number'
      && typeof entity.properties.directionY === 'number'
    ) {
      entity.properties.rotation = (
        Math.atan2(entity.properties.directionY, entity.properties.directionX) * 180
      ) / Math.PI;
    }

    if (entityType === 'ATTDEF' && (!entity.properties.text || entity.properties.text.trim().length === 0)) {
      const fallbackText = typeof entity.properties.code_3 === 'string'
        ? entity.properties.code_3
        : (typeof entity.properties.code_2 === 'string' ? entity.properties.code_2 : '');
      if (fallbackText) {
        entity.properties.text = fallbackText;
      }
    }

    return entity;
  }

  private cloneVertices(vertices: DXFVertex[] | undefined): DXFVertex[] | undefined {
    if (!vertices) {
      return undefined;
    }

    return vertices.map((vertex) => (
      typeof vertex.bulge === 'number'
        ? { x: vertex.x, y: vertex.y, bulge: vertex.bulge }
        : { x: vertex.x, y: vertex.y }
    ));
  }

  private cloneEntity(entity: DXFEntity): DXFEntity {
    return {
      type: entity.type,
      layer: entity.layer,
      properties: {
        ...entity.properties,
        ...(entity.properties.vertices ? { vertices: this.cloneVertices(entity.properties.vertices) } : {})
      }
    };
  }

  private transformInsertPoint(
    x: number,
    y: number,
    block: DXFBlockDefinition,
    transform: DXFInsertTransform
  ): { x: number; y: number } {
    const localX = (x - block.baseX) * transform.scaleX;
    const localY = (y - block.baseY) * transform.scaleY;
    const radians = (transform.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    return {
      x: transform.x + (localX * cos) - (localY * sin),
      y: transform.y + (localX * sin) + (localY * cos)
    };
  }

  private normalizeInsertScale(value: number | null): number {
    if (value === null || !Number.isFinite(value) || Math.abs(value) <= 0.0000001) {
      return 1;
    }
    return value;
  }

  private buildInsertTransform(entity: DXFEntity): DXFInsertTransform {
    return {
      x: this.parseNumber(entity.properties.x) ?? 0,
      y: this.parseNumber(entity.properties.y) ?? 0,
      scaleX: this.normalizeInsertScale(this.parseNumber(entity.properties.scaleX)),
      scaleY: this.normalizeInsertScale(this.parseNumber(entity.properties.scaleY)),
      rotation: this.parseNumber(entity.properties.rotation) ?? 0,
      layer: entity.layer || '0'
    };
  }

  private annotateExpandedEntities(
    entities: DXFEntity[],
    metadata: {
      sourceEntityType: string;
      sourceBlockName: string;
      sourceLayer: string;
    }
  ): DXFEntity[] {
    return entities.map((entity) => ({
      ...entity,
      properties: {
        ...entity.properties,
        sourceEntityType: metadata.sourceEntityType,
        sourceBlockName: metadata.sourceBlockName,
        sourceLayer: metadata.sourceLayer
      }
    }));
  }

  private expandInsertEntity(
    entity: DXFEntity,
    blockDefinitions: Map<string, DXFBlockDefinition>,
    depth: number = 0
  ): DXFEntity[] {
    if (depth > 8) {
      return [];
    }

    const blockName = typeof entity.properties.blockName === 'string'
      ? entity.properties.blockName.trim()
      : (typeof entity.properties.code_2 === 'string' ? entity.properties.code_2.trim() : '');
    if (!blockName) {
      return [];
    }

    const block = blockDefinitions.get(blockName);
    if (!block || !this.shouldRenderBlock(block)) {
      return [];
    }

    const transform = this.buildInsertTransform(entity);
    const expandedEntities = block.entities.flatMap((childEntity) => this.materializeBlockEntity(
      childEntity,
      block,
      transform,
      blockDefinitions,
      depth + 1
    ));

    return this.annotateExpandedEntities(expandedEntities, {
      sourceEntityType: entity.type,
      sourceBlockName: block.name,
      sourceLayer: entity.layer || '0'
    });
  }

  private expandDimensionEntity(
    entity: DXFEntity,
    blockDefinitions: Map<string, DXFBlockDefinition>,
    depth: number = 0
  ): DXFEntity[] {
    if (depth > 8) {
      return [];
    }

    const blockName = typeof entity.properties.blockName === 'string'
      ? entity.properties.blockName.trim()
      : (typeof entity.properties.code_2 === 'string' ? entity.properties.code_2.trim() : '');
    if (!blockName) {
      return [];
    }

    const block = blockDefinitions.get(blockName);
    if (!block || !this.shouldRenderBlock(block)) {
      return [];
    }

    // As cotas do AutoCAD neste DXF referenciam blocos anonimos com geometria
    // ja posicionada em coordenadas absolutas, entao nao usamos a origem da DIMENSION
    // como se fosse um INSERT comum.
    const identityTransform: DXFInsertTransform = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      layer: entity.layer || '0'
    };

    const expandedEntities = block.entities.flatMap((childEntity) => this.materializeBlockEntity(
      childEntity,
      block,
      identityTransform,
      blockDefinitions,
      depth + 1
    ));

    return this.annotateExpandedEntities(expandedEntities, {
      sourceEntityType: entity.type,
      sourceBlockName: block.name,
      sourceLayer: entity.layer || '0'
    });
  }

  private materializeBlockEntity(
    sourceEntity: DXFEntity,
    block: DXFBlockDefinition,
    transform: DXFInsertTransform,
    blockDefinitions: Map<string, DXFBlockDefinition>,
    depth: number
  ): DXFEntity[] {
    const entity = this.cloneEntity(sourceEntity);
    if (!this.shouldRenderEntity(entity)) {
      return [];
    }
    const props = entity.properties;
    const resolvedLayer = entity.layer === '0' ? transform.layer : entity.layer;
    const averageScale = (Math.abs(transform.scaleX) + Math.abs(transform.scaleY)) / 2;
    const mirrored = (transform.scaleX * transform.scaleY) < 0;

    entity.layer = resolvedLayer;

    switch (entity.type) {
      case 'LINE': {
        const start = (typeof props.x1 === 'number' && typeof props.y1 === 'number')
          ? this.transformInsertPoint(props.x1, props.y1, block, transform)
          : null;
        const end = (typeof props.x2 === 'number' && typeof props.y2 === 'number')
          ? this.transformInsertPoint(props.x2, props.y2, block, transform)
          : null;
        if (!start || !end) {
          return [entity];
        }
        props.x1 = start.x;
        props.y1 = start.y;
        props.x2 = end.x;
        props.y2 = end.y;
        props.x = start.x;
        props.y = start.y;
        return [entity];
      }
      case 'POINT':
      case 'TEXT':
      case 'MTEXT':
      case 'ATTRIB': {
        if (typeof props.x === 'number' && typeof props.y === 'number') {
          const point = this.transformInsertPoint(props.x, props.y, block, transform);
          props.x = point.x;
          props.y = point.y;
        }
        if (typeof props.alignmentX === 'number' && typeof props.alignmentY === 'number') {
          const alignPoint = this.transformInsertPoint(props.alignmentX, props.alignmentY, block, transform);
          props.alignmentX = alignPoint.x;
          props.alignmentY = alignPoint.y;
        }
        if (entity.type !== 'POINT') {
          if (typeof props.height === 'number') {
            props.height = Math.max(props.height * averageScale, 0.0001);
          }
          if (typeof props.textHeight === 'number') {
            props.textHeight = Math.max(props.textHeight * averageScale, 0.0001);
          }
          if (typeof props.rotation === 'number') {
            props.rotation += transform.rotation;
          } else {
            props.rotation = transform.rotation;
          }
        }
        return [entity];
      }
      case 'CIRCLE':
      case 'ARC': {
        const centerX = typeof props.centerX === 'number' ? props.centerX : props.x;
        const centerY = typeof props.centerY === 'number' ? props.centerY : props.y;
        if (typeof centerX !== 'number' || typeof centerY !== 'number') {
          return [entity];
        }
        const center = this.transformInsertPoint(centerX, centerY, block, transform);
        props.centerX = center.x;
        props.centerY = center.y;
        props.x = center.x;
        props.y = center.y;
        if (typeof props.radius === 'number') {
          props.radius = Math.max(props.radius * averageScale, 0.0001);
        }
        if (entity.type === 'ARC') {
          if (typeof props.startAngle === 'number') {
            props.startAngle += transform.rotation;
          }
          if (typeof props.endAngle === 'number') {
            props.endAngle += transform.rotation;
          }
        }
        return [entity];
      }
      case 'LWPOLYLINE':
      case 'POLYLINE': {
        if (props.vertices && props.vertices.length > 0) {
          props.vertices = props.vertices.map((vertex) => {
            const point = this.transformInsertPoint(vertex.x, vertex.y, block, transform);
            const nextVertex: DXFVertex = { x: point.x, y: point.y };
            if (typeof vertex.bulge === 'number') {
              nextVertex.bulge = mirrored ? -vertex.bulge : vertex.bulge;
            }
            return nextVertex;
          });
          props.x = props.vertices[0]?.x;
          props.y = props.vertices[0]?.y;
        }
        return [entity];
      }
      case 'INSERT': {
        const nestedInsertPoint = this.transformInsertPoint(
          typeof props.x === 'number' ? props.x : block.baseX,
          typeof props.y === 'number' ? props.y : block.baseY,
          block,
          transform
        );
        entity.layer = resolvedLayer;
        entity.properties.x = nestedInsertPoint.x;
        entity.properties.y = nestedInsertPoint.y;
        entity.properties.scaleX = this.normalizeInsertScale(this.parseNumber(props.scaleX)) * transform.scaleX;
        entity.properties.scaleY = this.normalizeInsertScale(this.parseNumber(props.scaleY)) * transform.scaleY;
        entity.properties.rotation = (this.parseNumber(props.rotation) ?? 0) + transform.rotation;

        const expandedNested = this.expandInsertEntity(entity, blockDefinitions, depth);
        return expandedNested.length > 0 ? expandedNested : [entity];
      }
      default:
        return [entity];
    }
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
          const parsedColor = parseInt(value);
          if (!isNaN(parsedColor)) {
            layer.color = Math.abs(parsedColor);
            if (parsedColor < 0) {
              layer.hiddenByDefault = true;
            }
          }
          break;
        case '6': // Line type
          layer.lineType = value;
          break;
        case '70': // Layer flags
          const flags = parseInt(value);
          if (!isNaN(flags)) {
            layer.isFrozen = (flags & 1) === 1;
            layer.isLocked = (flags & 4) === 4;
            if (layer.isFrozen) {
              layer.hiddenByDefault = true;
            }
          }
          break;
        case '999':
          if (value === 'GEO_LIMITES_EDITOR_LAYER') {
            layer.editorCreated = true;
          }
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
    const bulges = this.parseNumberList(properties.code_42);
    for (let i = 0; i < minLength; i++) {
      const vertex: DXFVertex = {
        x: xCoords[i],
        y: yCoords[i]
      };
      if (typeof bulges[i] === 'number' && Number.isFinite(bulges[i]) && Math.abs(bulges[i]) > 0.000001) {
        vertex.bulge = bulges[i];
      }
      vertices.push(vertex);
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
