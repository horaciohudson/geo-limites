import type { ReactNode } from 'react';
import ProcessingContextBadge from '@/components/ProcessingContextBadge';
import type { FileMetadata } from '@/types';
import type { ProcessingContextAssessmentStatus } from '@/utils/processingContextStatus';

interface ViewerFileStatusBadge {
  label: string;
  title: string;
  status: ProcessingContextAssessmentStatus;
}

interface ViewerMultiFileLayoutProps {
  files: FileMetadata[];
  renderViewer: (fileItem: FileMetadata, index: number) => ReactNode;
  getFileStatusBadge?: (fileItem: FileMetadata, index: number) => ViewerFileStatusBadge | null;
}

const ViewerMultiFileLayout: React.FC<ViewerMultiFileLayoutProps> = ({
  files,
  renderViewer,
  getFileStatusBadge
}) => {
  return (
    <div className="multiple-drawings-layout">
      {files.map((fileItem, index) => {
        const statusBadge = getFileStatusBadge ? getFileStatusBadge(fileItem, index) : null;

        return (
          <div key={fileItem.id} className="drawing-container">
            <div className="drawing-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Arquivo {index + 1} • {fileItem.originalName}</span>
              {statusBadge ? (
                <ProcessingContextBadge
                  status={statusBadge.status}
                  label={statusBadge.label}
                  title={statusBadge.title}
                  tone="chip"
                  style={{ fontSize: '0.72rem' }}
                />
              ) : null}
            </div>
            <div className="drawing-content">
              {renderViewer(fileItem, index)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ViewerMultiFileLayout;
