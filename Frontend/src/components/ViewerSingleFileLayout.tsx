import type { ReactNode } from 'react';

interface ViewerSingleFileLayoutProps {
  viewerNode: ReactNode;
  correctivePanelNode?: ReactNode;
}

const ViewerSingleFileLayout: React.FC<ViewerSingleFileLayoutProps> = ({
  viewerNode,
  correctivePanelNode
}) => {
  return (
    <div
      className="viewer-content"
      style={{
        display: 'flex',
        gap: '18px',
        alignItems: 'flex-start'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {viewerNode}
      </div>
      {correctivePanelNode}
    </div>
  );
};

export default ViewerSingleFileLayout;
