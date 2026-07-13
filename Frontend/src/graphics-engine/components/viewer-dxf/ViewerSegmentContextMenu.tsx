import React from 'react';

interface SegmentContextMenuState {
  open: boolean;
  x: number;
  y: number;
  nearestSegmentId: string | null;
}

interface ViewerSegmentContextMenuProps {
  manualBridgeCount: number;
  segmentContextMenu: SegmentContextMenuState;
  selectedSegmentCount: number;
  selectedSegmentIds: string[];
  onCheckSelectedSegments: () => void;
  onClearBridges: () => void;
  onClearSegmentSelection: () => void;
  onClose: () => void;
  onCloseGapFromSelectedSegments: () => void;
  onRemoveLastBridge: () => void;
  onToggleSegmentSelection: (segmentId: string) => void;
}

export const ViewerSegmentContextMenu: React.FC<ViewerSegmentContextMenuProps> = ({
  manualBridgeCount,
  segmentContextMenu,
  selectedSegmentCount,
  selectedSegmentIds,
  onCheckSelectedSegments,
  onClearBridges,
  onClearSegmentSelection,
  onClose,
  onCloseGapFromSelectedSegments,
  onRemoveLastBridge,
  onToggleSegmentSelection
}) => {
  if (!segmentContextMenu.open) {
    return null;
  }

  const nearestSegmentId = segmentContextMenu.nearestSegmentId;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${segmentContextMenu.x}px`,
        top: `${segmentContextMenu.y}px`,
        transform: 'translate(6px, 6px)',
        zIndex: 2000,
        minWidth: '260px',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
        padding: '10px'
      }}
    >
      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
          Ferramentas do contorno
        </div>
        <button
          type="button"
          disabled={!nearestSegmentId}
          onClick={() => {
            if (!nearestSegmentId) {
              return;
            }
            onToggleSegmentSelection(nearestSegmentId);
            onClose();
          }}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: nearestSegmentId && selectedSegmentIds.includes(nearestSegmentId) ? '#ecfdf5' : '#ffffff',
            cursor: nearestSegmentId ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            textAlign: 'left'
          }}
        >
          Selecionar segmento (perto do mouse)
        </button>
        <button
          type="button"
          disabled={selectedSegmentCount === 0}
          onClick={() => {
            onClearSegmentSelection();
            onClose();
          }}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            cursor: selectedSegmentCount > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            textAlign: 'left'
          }}
        >
          Limpar segmentos selecionados
        </button>
        <button
          type="button"
          onClick={onCheckSelectedSegments}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #0ea5e9',
            background: '#e0f2fe',
            cursor: 'pointer',
            fontWeight: 800,
            textAlign: 'left',
            color: '#075985'
          }}
        >
          Verificar fechado/aberto
        </button>
        <button
          type="button"
          onClick={onCloseGapFromSelectedSegments}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #0f766e',
            background: '#ecfdf5',
            cursor: 'pointer',
            fontWeight: 800,
            textAlign: 'left',
            color: '#065f46'
          }}
        >
          Fechar (criar ponte entre pontas)
        </button>
        <button
          type="button"
          disabled={manualBridgeCount === 0}
          onClick={onRemoveLastBridge}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            cursor: manualBridgeCount > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            textAlign: 'left'
          }}
        >
          Remover ultima ponte
        </button>
        <button
          type="button"
          disabled={manualBridgeCount === 0}
          onClick={onClearBridges}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            cursor: manualBridgeCount > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            textAlign: 'left'
          }}
        >
          Limpar pontes
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            cursor: 'pointer',
            fontWeight: 700,
            textAlign: 'left',
            color: '#475569'
          }}
        >
          Fechar menu
        </button>
      </div>
    </div>
  );
};
