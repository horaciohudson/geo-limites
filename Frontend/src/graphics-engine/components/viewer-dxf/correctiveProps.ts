import type { DXFData } from '@/graphics-engine/shared/dxf';
import type {
  CorrectiveDraftOperation,
  CorrectiveHistoryCommand,
  CorrectiveHistoryStatus,
  CorrectiveIssueViewModel,
  CorrectiveLotInspectionView,
  ManualReviewLotSelectionPayload,
  CorrectiveSuggestionCommand,
  PropertyLandmarkView,
  RestoredCorrectiveSnapshotView
} from '@/graphics-engine/shared/viewer-corrective';
import type { CorrectiveTool, ViewerMode } from '@/graphics-engine/shared/corrective';
import type { ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf/viewerState';

export type ViewerCorrectiveSnapshotChangedHandler = (
  fileId: string | undefined,
  snapshotData: DXFData,
  referencePoints: ConfirmedReferencePoint[]
) => void;

export type ViewerCorrectiveHistoryStatusChangeHandler = (
  fileId: string | undefined,
  status: CorrectiveHistoryStatus
) => void;

export type ViewerCorrectiveLotInspectionChangeHandler = (
  fileId: string | undefined,
  inspection: CorrectiveLotInspectionView | null
) => void;

export interface ViewerDXFCorrectiveProps {
  propertyLandmarks?: PropertyLandmarkView[];
  viewerMode?: ViewerMode;
  correctiveFocusLotNumber?: number | null;
  recentlyCorrectedLotNumber?: number | null;
  activeCorrectiveTool?: CorrectiveTool;
  onRegisterCorrectiveDraftOperation?: (operation: CorrectiveDraftOperation) => void;
  correctiveSnapshotFileId?: string;
  onCorrectiveSnapshotChanged?: ViewerCorrectiveSnapshotChangedHandler;
  correctiveHistoryCommand?: CorrectiveHistoryCommand;
  correctiveSuggestionCommand?: CorrectiveSuggestionCommand;
  onCorrectiveHistoryStatusChange?: ViewerCorrectiveHistoryStatusChangeHandler;
  correctiveIssues?: CorrectiveIssueViewModel[];
  onCorrectiveLotInspectionChange?: ViewerCorrectiveLotInspectionChangeHandler;
  manualReviewLotNumbers?: number[];
  onManualReviewLotSelectionChange?: (payload: ManualReviewLotSelectionPayload) => void;
  restoredCorrectiveSnapshot?: RestoredCorrectiveSnapshotView | null;
}
