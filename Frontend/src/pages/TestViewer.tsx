import React from 'react';
import { useSearchParams } from 'react-router-dom';

const TestViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId');

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>Test Viewer Component</h1>
      <p>File ID: {fileId || 'No file ID provided'}</p>
      <p>Search Params: {searchParams.toString()}</p>
      <p>This is a test component to verify routing is working.</p>
    </div>
  );
};

export default TestViewer;
