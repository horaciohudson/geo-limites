import { useCallback, useMemo } from 'react';
import { buildConfirmedSelections } from '@/graphics-engine/components/viewer-dxf/lotSelectionUtils';
import type {
  ConfirmedReferencePoint,
  SegmentConfrontationAnnotation,
  SelectedConfrontationText
} from '@/graphics-engine/components/viewer-dxf/types';
import type {
  ViewerPolygonConfirmedHandler,
  ViewerTechnicalSummaryHandler
} from '@/graphics-engine/components/viewer-dxf/viewerDocumentCallbacks';
import type { DXFData } from '@/graphics-engine/shared/dxf';

interface UseGeoLimitesSelectionSummaryParams {
  selectedPolygons: Array<Array<{ x: number; y: number }>>;
  dxfData: DXFData | null;
  selectedConfrontationTexts: SelectedConfrontationText[];
  segmentAnnotations: SegmentConfrontationAnnotation[];
  confirmedReferencePoints: ConfirmedReferencePoint[];
  technicalSummarySnapshot: DXFData | null;
  onPolygonConfirmed?: ViewerPolygonConfirmedHandler;
  onGenerateTechnicalSummary?: ViewerTechnicalSummaryHandler;
}

export const useGeoLimitesSelectionSummary = ({
  selectedPolygons,
  dxfData,
  selectedConfrontationTexts,
  segmentAnnotations,
  confirmedReferencePoints,
  technicalSummarySnapshot,
  onPolygonConfirmed,
  onGenerateTechnicalSummary
}: UseGeoLimitesSelectionSummaryParams) => {
  const confirmedSelections = useMemo(
    () => buildConfirmedSelections(
      selectedPolygons,
      dxfData,
      selectedConfrontationTexts,
      segmentAnnotations,
      { restrictSelectedTextsToPolygon: selectedPolygons.length > 0 }
    ),
    [dxfData, segmentAnnotations, selectedConfrontationTexts, selectedPolygons]
  );

  const handleGenerateSummary = useCallback(() => {
    if (technicalSummarySnapshot && onGenerateTechnicalSummary) {
      onGenerateTechnicalSummary({
        viewerData: technicalSummarySnapshot,
        referencePoints: confirmedReferencePoints
      });
    }
  }, [confirmedReferencePoints, onGenerateTechnicalSummary, technicalSummarySnapshot]);

  const handleConfirmPolygonSelection = useCallback(() => {
    onPolygonConfirmed?.({
      selections: confirmedSelections,
      referencePoints: confirmedReferencePoints
    });
  }, [confirmedReferencePoints, confirmedSelections, onPolygonConfirmed]);

  return {
    confirmedSelections,
    handleGenerateSummary,
    handleConfirmPolygonSelection
  };
};
