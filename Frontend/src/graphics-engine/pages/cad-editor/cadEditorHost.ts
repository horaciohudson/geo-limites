import type { ComponentType } from 'react';
import type { ViewerDXFProps } from '@/graphics-engine/components/viewer-dxf/types';
import type { ConfirmedConfrontationText } from '@/graphics-engine/components/viewer-dxf/types';
import type { ConfirmedLotSelection } from '@/graphics-engine/components/viewer-dxf/types';
import type { ConfirmedReferencePoint } from '@/graphics-engine/components/viewer-dxf/types';
import type { DXFEntity } from '@/graphics-engine/shared/dxf';
import type { CorrectiveIssueView } from '@/utils/viewerCorrective';
import type { ProcessingContextStatusDTO } from '@/utils/processingContextStatus';
import type {
  CadEditorSessionPreferences,
  CadEditorSettings,
  CadLayerDefinition,
  CadMeasurementUnitOption,
  TextToolPresetDefinition,
  TextToolSessionState
} from '@/graphics-engine/pages/cad-editor/cadEditorConfig';

export interface CadEditorHostTexts {
  initialEditorNotice: string;
  textPlacementPointNotice: string;
  clearSelectedEntitiesByContextMenuNotice: string;
}

export interface CadEditorBootResult {
  initialCadEditorSettings: CadEditorSettings;
  initialCadEditorSessionPreferences: CadEditorSessionPreferences;
  initialTextToolSessionState: TextToolSessionState;
  handleNavigateBack: () => void;
}

export interface CadEditorPersistenceParams {
  textToolSessionPayload: TextToolSessionState;
  sessionPreferencesPayload: CadEditorSessionPreferences;
}

export interface CadEditorLayerClassificationInput {
  layer: string;
  type?: string;
  text?: string | null;
}

export interface CadEditorHost {
  ViewerComponent: ComponentType<ViewerDXFProps>;
  TechnicalSummaryPanelComponent?: ComponentType<{
    summaryJson: string;
    summaryText: string;
    processingContextStatus?: ProcessingContextStatusDTO | null;
    manualReviewLotNumbers?: number[];
  }>;
  baseLayers: ReadonlyArray<CadLayerDefinition>;
  layerColorClasses: ReadonlyArray<string>;
  layerPlaceholderIds: ReadonlyArray<string>;
  propertyLandmarks?: ViewerDXFProps['propertyLandmarks'];
  defaultActiveLayerName: string;
  defaultAnnotationLayerName: string;
  defaultTextAnnotationLayerName: string;
  resolveFunctionalLayerName?: (input: CadEditorLayerClassificationInput | DXFEntity) => string;
  scanCorrectiveIssues?: (data: ViewerDXFProps['data']) => CorrectiveIssueView[];
  generateTechnicalSummary?: (params: {
    dxfData: ViewerDXFProps['data'];
    fileName: string;
    selectedLotNumbers?: number[];
    selectedLotSelections?: ConfirmedLotSelection[];
    manualReviewLotNumbers?: number[];
    selectedConfrontationTexts?: ConfirmedConfrontationText[];
    referencePoints?: ConfirmedReferencePoint[];
  }) => Promise<{
    summaryJson: string;
    documentSummaryJson?: string;
    summaryText: string;
    analyzedFileName?: string;
    processingContextStatus?: ProcessingContextStatusDTO | null;
  }>;
  openStandardsAndTemplates?: () => void;
  saveSystemSettings?: (settings: CadEditorSettings) => Promise<CadEditorSettings>;
  canManageSystemSettings?: boolean;
  measurementUnitOptions: ReadonlyArray<CadMeasurementUnitOption>;
  textToolPresets: ReadonlyArray<TextToolPresetDefinition>;
  customTextToolPresetId: string;
  customTextToolPresetLabel: string;
  texts: CadEditorHostTexts;
  useBoot: () => CadEditorBootResult;
  usePersistence: (params: CadEditorPersistenceParams) => void;
  useCadEditorChrome: (params: any) => any;
  useCadEditorCommandController: (params: any) => any;
  useCadEditorDocumentController: (params: any) => any;
  useCadEditorEntityActions: (params: any) => any;
  useCadEditorGuideController: (params: any) => any;
  useCadEditorKeyboardShortcuts: (params: any) => any;
  useCadEditorLayoutController: (params: any) => any;
  useCadEditorModifyController: (params: any) => any;
  useCadEditorStateSync: (params: any) => any;
  useCadEditorTextToolController: (params: any) => any;
  useCadEditorToolController: (params: any) => any;
  useCadEditorUiActionController: (params: any) => any;
  useCadEditorViewerController: (params: any) => any;
}
