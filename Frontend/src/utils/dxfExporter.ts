import type { DXFData, DXFEntity, DXFEntityProperties } from '@/utils/dxfParser';

const DXF_EOL = '\r\n';
const EDITOR_CREATED_LAYER_MARKER = 'GEO_LIMITES_EDITOR_LAYER';

const pushPair = (lines: string[], code: string | number, value: string | number) => {
  lines.push(String(code), String(value));
};

const formatNumber = (value: number | undefined, fallback = 0) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Number.isInteger(safeValue) ? String(safeValue) : safeValue.toFixed(6);
};

const normalizeLayerName = (layerName: string | undefined) => {
  const trimmed = (layerName || '0').trim();
  return trimmed || '0';
};

const escapeTextValue = (value: string | undefined) => (value || '').replace(/\r?\n/g, '\\P');

const serializeLineEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  pushPair(lines, 0, 'LINE');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 10, formatNumber(props.x1 ?? props.x));
  pushPair(lines, 20, formatNumber(props.y1 ?? props.y));
  pushPair(lines, 11, formatNumber(props.x2));
  pushPair(lines, 21, formatNumber(props.y2));
};

const serializeCircleEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  pushPair(lines, 0, 'CIRCLE');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 10, formatNumber(props.centerX ?? props.x));
  pushPair(lines, 20, formatNumber(props.centerY ?? props.y));
  pushPair(lines, 40, formatNumber(props.radius, 1));
};

const serializeArcEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  pushPair(lines, 0, 'ARC');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 10, formatNumber(props.centerX ?? props.x));
  pushPair(lines, 20, formatNumber(props.centerY ?? props.y));
  pushPair(lines, 40, formatNumber(props.radius, 1));
  pushPair(lines, 50, formatNumber(props.startAngle));
  pushPair(lines, 51, formatNumber(props.endAngle));
};

const serializePointEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  pushPair(lines, 0, 'POINT');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 10, formatNumber(props.x));
  pushPair(lines, 20, formatNumber(props.y));
};

const serializeTextLikeEntity = (
  lines: string[],
  entityType: 'TEXT' | 'MTEXT' | 'ATTRIB',
  entity: DXFEntity,
  props: DXFEntityProperties
) => {
  pushPair(lines, 0, entityType);
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 10, formatNumber(props.x));
  pushPair(lines, 20, formatNumber(props.y));
  pushPair(lines, 40, formatNumber(props.height ?? props.textHeight, 2.5));
  pushPair(lines, 1, escapeTextValue(props.text));

  if (typeof props.rotation === 'number') {
    pushPair(lines, 50, formatNumber(props.rotation));
  }

  if (typeof props.widthFactor === 'number') {
    pushPair(lines, 41, formatNumber(props.widthFactor, 1));
  }

  if (typeof props.alignmentX === 'number') {
    pushPair(lines, 11, formatNumber(props.alignmentX));
  }

  if (typeof props.alignmentY === 'number') {
    pushPair(lines, 21, formatNumber(props.alignmentY));
  }

  if (typeof props.horizontalAlign === 'number') {
    pushPair(lines, 72, props.horizontalAlign);
  }

  if (typeof props.verticalAlign === 'number') {
    pushPair(lines, 73, props.verticalAlign);
  }

  if (entityType === 'MTEXT') {
    if (typeof props.attachmentPoint === 'number') {
      pushPair(lines, 70, props.attachmentPoint);
    }
    if (typeof props.width === 'number' || typeof props.mtextWidth === 'number') {
      pushPair(lines, 43, formatNumber(props.mtextWidth ?? props.width, 0));
    }
    if (typeof props.lineSpacing === 'number') {
      pushPair(lines, 44, formatNumber(props.lineSpacing, 1));
    }
  }
};

const serializeLwPolylineEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  const vertices = props.vertices || [];
  if (vertices.length < 2) {
    return;
  }

  pushPair(lines, 0, 'LWPOLYLINE');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 90, vertices.length);
  pushPair(lines, 70, props.closed ? 1 : 0);
  vertices.forEach((vertex) => {
    pushPair(lines, 10, formatNumber(vertex.x));
    pushPair(lines, 20, formatNumber(vertex.y));
    if (typeof vertex.bulge === 'number' && Number.isFinite(vertex.bulge) && Math.abs(vertex.bulge) > 0.000001) {
      pushPair(lines, 42, formatNumber(vertex.bulge, 0));
    }
  });
};

const serializePolylineEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  const vertices = props.vertices || [];
  if (vertices.length < 2) {
    return;
  }

  pushPair(lines, 0, 'POLYLINE');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 66, 1);
  pushPair(lines, 70, props.closed ? 1 : 0);

  vertices.forEach((vertex) => {
    pushPair(lines, 0, 'VERTEX');
    pushPair(lines, 8, normalizeLayerName(entity.layer));
    pushPair(lines, 10, formatNumber(vertex.x));
    pushPair(lines, 20, formatNumber(vertex.y));
    if (typeof vertex.bulge === 'number' && Number.isFinite(vertex.bulge) && Math.abs(vertex.bulge) > 0.000001) {
      pushPair(lines, 42, formatNumber(vertex.bulge, 0));
    }
  });

  pushPair(lines, 0, 'SEQEND');
};

const serializeInsertEntity = (lines: string[], entity: DXFEntity, props: DXFEntityProperties) => {
  pushPair(lines, 0, 'INSERT');
  pushPair(lines, 8, normalizeLayerName(entity.layer));
  pushPair(lines, 2, typeof props.code_2 === 'string' ? props.code_2 : 'BLOCK');
  pushPair(lines, 10, formatNumber(props.x));
  pushPair(lines, 20, formatNumber(props.y));
};

const serializeEntity = (lines: string[], entity: DXFEntity) => {
  const props = entity.properties as DXFEntityProperties;

  switch (entity.type) {
    case 'LINE':
      serializeLineEntity(lines, entity, props);
      return;
    case 'CIRCLE':
      serializeCircleEntity(lines, entity, props);
      return;
    case 'ARC':
      serializeArcEntity(lines, entity, props);
      return;
    case 'POINT':
      serializePointEntity(lines, entity, props);
      return;
    case 'TEXT':
      serializeTextLikeEntity(lines, 'TEXT', entity, props);
      return;
    case 'MTEXT':
      serializeTextLikeEntity(lines, 'MTEXT', entity, props);
      return;
    case 'ATTRIB':
      serializeTextLikeEntity(lines, 'ATTRIB', entity, props);
      return;
    case 'LWPOLYLINE':
      serializeLwPolylineEntity(lines, entity, props);
      return;
    case 'POLYLINE':
      serializePolylineEntity(lines, entity, props);
      return;
    case 'INSERT':
      serializeInsertEntity(lines, entity, props);
      return;
    default:
      return;
  }
};

const collectLayers = (data: DXFData) => {
  const layerMap = new Map<string, DXFData['layers'][number]>();

  data.layers.forEach((layer) => {
    const normalizedLayerName = normalizeLayerName(layer.name);
    layerMap.set(normalizedLayerName, {
      ...layer,
      name: normalizedLayerName
    });
  });

  data.entities.forEach((entity) => {
    const normalizedLayerName = normalizeLayerName(entity.layer);
    if (!layerMap.has(normalizedLayerName)) {
      layerMap.set(normalizedLayerName, { name: normalizedLayerName });
    }
  });

  if (!layerMap.has('0')) {
    layerMap.set('0', { name: '0' });
  }

  return Array.from(layerMap.values());
};

export const buildDXFString = (data: DXFData) => {
  const lines: string[] = [];
  const layers = collectLayers(data);

  pushPair(lines, 0, 'SECTION');
  pushPair(lines, 2, 'HEADER');
  pushPair(lines, 9, '$ACADVER');
  pushPair(lines, 1, 'AC1015');
  pushPair(lines, 0, 'ENDSEC');

  pushPair(lines, 0, 'SECTION');
  pushPair(lines, 2, 'TABLES');
  pushPair(lines, 0, 'TABLE');
  pushPair(lines, 2, 'LAYER');
  pushPair(lines, 70, layers.length);

  layers.forEach((layer) => {
    pushPair(lines, 0, 'LAYER');
    pushPair(lines, 2, normalizeLayerName(layer.name));
    pushPair(lines, 70, 0);
    pushPair(lines, 62, typeof layer.color === 'number' ? layer.color : 7);
    pushPair(lines, 6, typeof layer.lineType === 'string' && layer.lineType.trim() ? layer.lineType : 'CONTINUOUS');
    if (layer.editorCreated) {
      pushPair(lines, 999, EDITOR_CREATED_LAYER_MARKER);
    }
  });

  pushPair(lines, 0, 'ENDTAB');
  pushPair(lines, 0, 'ENDSEC');

  pushPair(lines, 0, 'SECTION');
  pushPair(lines, 2, 'ENTITIES');
  data.entities.forEach((entity) => serializeEntity(lines, entity));
  pushPair(lines, 0, 'ENDSEC');
  pushPair(lines, 0, 'EOF');

  return `${lines.join(DXF_EOL)}${DXF_EOL}`;
};

export const downloadDXF = (data: DXFData, fileName: string) => {
  const dxfContent = buildDXFString(data);
  const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName.toLowerCase().endsWith('.dxf') ? fileName : `${fileName}.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};
