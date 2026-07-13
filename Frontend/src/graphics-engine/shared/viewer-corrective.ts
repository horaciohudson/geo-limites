import type { CorrectiveTool, SuggestionConfidence } from '@/graphics-engine/shared/corrective';
import type { Point2D } from '@/graphics-engine/shared/geometry';
import type { ProcessingContextStatusDTO } from '@/utils/processingContextStatus';

export interface PropertyLandmarkView {
  landmarkId?: string;
  landmarkName?: string;
  coordinateX?: number | string | null;
  coordinateY?: number | string | null;
  sequenceOrder?: number | null;
}

export interface CorrectiveDraftOperation {
  id: string;
  label: string;
  status: 'draft' | 'undone';
  fileId?: string;
  revision?: number;
}

export interface CorrectiveHistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
}

export interface CorrectiveHistoryCommand {
  undoToken: number;
  redoToken: number;
}

export interface CorrectiveSuggestionCommand {
  applyToken: number;
}

export interface CorrectiveLotInspectionView {
  lotNumber: number;
  detected: boolean;
  area: number | null;
  textsInside: string[];
  issueCount: number;
  severity: 'BLOQUEANTE' | 'AVISO' | null;
  detectionSource: 'direct' | 'face' | 'anchor' | null;
  nearestVertexGapDistance: number | null;
  nearestSegmentGapDistance: number | null;
  suggestedTool: CorrectiveTool;
  suggestionConfidence: SuggestionConfidence;
  suggestionReason: string;
}

export interface CorrectiveIssueViewModel {
  lotNumber: number;
  code: string;
  severity: 'BLOQUEANTE' | 'AVISO';
  message: string;
  detectionSource?: 'direct' | 'face' | 'anchor';
}

export interface ManualReviewLotSelectionPayload {
  lotNumber: number;
  selected: boolean;
  lotNumbers: number[];
  source: 'alt-click';
}

export interface RestoredCorrectiveSnapshotView {
  snapshotId: string;
  appliedAt: string;
  polygons: Point2D[][];
  processingContextStatus?: ProcessingContextStatusDTO | null;
}
