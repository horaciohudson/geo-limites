import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DocumentWorkspaceShell from '@/components/DocumentWorkspaceShell';
import Viewer from './Viewer';

const ViewerDocument: React.FC = () => {
  const [searchParams] = useSearchParams();
  const documentKind = searchParams.get('documentKind') === 'resumo-tecnico'
    ? 'resumo-tecnico'
    : 'memorial';

  const viewerUrl = useMemo(() => {
    const nextParams = new URLSearchParams();
    const fileId = searchParams.get('fileId');
    const fileIds = searchParams.get('fileIds');

    if (fileId) {
      nextParams.set('fileId', fileId);
    }
    if (fileIds) {
      nextParams.set('fileIds', fileIds);
    }

    const queryString = nextParams.toString();
    return queryString ? `/viewer?${queryString}` : '/viewer';
  }, [searchParams]);

  return (
    <div className="viewer-document-page">
      <DocumentWorkspaceShell documentKind={documentKind} viewerUrl={viewerUrl}>
        <Viewer documentOnly />
      </DocumentWorkspaceShell>
    </div>
  );
};

export default ViewerDocument;
