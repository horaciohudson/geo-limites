import type { DXFEntity } from '@/graphics-engine/shared/dxf';

export const GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM = 'GEOMETRIA';
export const GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT = 'LOTES';
export const GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT = 'LIMITES';
export const GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF = 'GEOREFERENCIA';
export const GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR = 'AUXILIAR';

export type GeoLimitesFunctionalLayerInput = {
  layer: string;
  type?: string;
  text?: string | null;
};

const GEORREF_LAYER_HINTS = [
  'qd_lote',
  'quadro',
  'coord',
  'georref',
  'georef',
  'datum',
  'vrt',
  'vertice',
  'coordenada',
  'eixo'
];

const AUXILIARY_LAYER_HINTS = [
  'cota',
  'dimension',
  'dim',
  'hatch',
  'selo',
  'carimbo',
  'margem',
  'borda',
  'layout',
  'viewport',
  'title'
];

const CONFRONTATION_TEXT_HINTS = [
  'confront',
  'confrontante',
  'divisa',
  'limite',
  'rumo',
  'azimute',
  'lado'
];

const LOT_TEXT_HINTS = [
  'lote',
  'quadra',
  'area',
  'm2',
  'm²'
];

const TABLE_TEXT_HINTS = [
  'vertice',
  'coordenada',
  'distancia',
  'azimute',
  'rumo',
  'ponto',
  'descri',
  'norte',
  'leste'
];

const normalizeText = (value: string | null | undefined) => (
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
);

const LEGACY_FUNCTIONAL_LAYER_NAME_MAP: Record<string, string> = {
  lotes_geom: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
  geometria: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM,
  lotes_txt: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
  lotes_text: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
  lotes: GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT,
  confrontacoes_txt: GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT,
  limites: GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT,
  apoio_georref: GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  georeferencia: GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  georreferencia: GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  georeferência: GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  georreferência: GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF,
  auxiliar: GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR
};

const isTextLikeType = (entityType: string) => ['TEXT', 'MTEXT', 'ATTRIB'].includes(entityType);

export const isGeoLimitesCustomLayerName = (layerName: string | null | undefined): boolean => {
  const normalizedLayer = normalizeText(layerName);

  if (!normalizedLayer || normalizedLayer === '0') {
    return false;
  }

  if (LEGACY_FUNCTIONAL_LAYER_NAME_MAP[normalizedLayer]) {
    return false;
  }

  if (GEORREF_LAYER_HINTS.some((hint) => normalizedLayer.includes(hint))) {
    return false;
  }

  if (AUXILIARY_LAYER_HINTS.some((hint) => normalizedLayer.includes(hint))) {
    return false;
  }

  if (CONFRONTATION_TEXT_HINTS.some((hint) => normalizedLayer.includes(hint))) {
    return false;
  }

  if (LOT_TEXT_HINTS.some((hint) => normalizedLayer.includes(hint))) {
    return false;
  }

  if (TABLE_TEXT_HINTS.some((hint) => normalizedLayer.includes(hint))) {
    return false;
  }

  return true;
};

export const resolveGeoLimitesFunctionalLayerName = ({
  layer,
  type,
  text
}: GeoLimitesFunctionalLayerInput): string => {
  const normalizedLayer = normalizeText(layer);
  const normalizedType = normalizeText(type);
  const normalizedText = normalizeText(text);
  const isTextLike = isTextLikeType(normalizedType.toUpperCase());
  const mappedLegacyLayerName = LEGACY_FUNCTIONAL_LAYER_NAME_MAP[normalizedLayer];

  if (mappedLegacyLayerName) {
    return mappedLegacyLayerName;
  }

  if (
    GEORREF_LAYER_HINTS.some((hint) => normalizedLayer.includes(hint))
    || TABLE_TEXT_HINTS.some((hint) => normalizedText.includes(hint))
  ) {
    return GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF;
  }

  if (
    AUXILIARY_LAYER_HINTS.some((hint) => normalizedLayer.includes(hint))
    && !isTextLike
  ) {
    return GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR;
  }

  if (isTextLike) {
    if (CONFRONTATION_TEXT_HINTS.some((hint) => normalizedText.includes(hint))) {
      return GEO_LIMITES_FUNCTIONAL_LAYER_CONFRONTACOES_TXT;
    }

    if (LOT_TEXT_HINTS.some((hint) => normalizedText.includes(hint))) {
      return GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT;
    }

    if (AUXILIARY_LAYER_HINTS.some((hint) => normalizedLayer.includes(hint))) {
      return GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR;
    }

    return GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_TXT;
  }

  if (['line', 'lwpolyline', 'polyline', 'arc', 'circle'].includes(normalizedType)) {
    return GEO_LIMITES_FUNCTIONAL_LAYER_LOTES_GEOM;
  }

  if (normalizedType === 'point') {
    return GEO_LIMITES_FUNCTIONAL_LAYER_APOIO_GEORREF;
  }

  return GEO_LIMITES_FUNCTIONAL_LAYER_AUXILIAR;
};

export const resolveGeoLimitesFunctionalLayerNameFromEntity = (entity: DXFEntity): string => (
  resolveGeoLimitesFunctionalLayerName({
    layer: entity.layer,
    type: entity.type,
    text: typeof entity.properties.text === 'string' ? entity.properties.text : null
  })
);
