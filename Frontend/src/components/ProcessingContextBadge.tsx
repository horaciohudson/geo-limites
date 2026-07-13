import type { CSSProperties } from 'react';
import {
  getProcessingContextStatusLabels,
  getProcessingContextVisualTheme,
  type ProcessingContextAssessmentStatus,
  type ProcessingContextVisualTone
} from '@/utils/processingContextStatus';

interface ProcessingContextBadgeProps {
  status: ProcessingContextAssessmentStatus;
  label?: string;
  title?: string;
  tone?: ProcessingContextVisualTone;
  style?: CSSProperties;
}

const ProcessingContextBadge: React.FC<ProcessingContextBadgeProps> = ({
  status,
  label,
  title,
  tone = 'chip',
  style
}) => {
  const theme = getProcessingContextVisualTheme(status, tone);
  const labels = getProcessingContextStatusLabels(status);

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '999px',
        border: `1px solid ${theme.border}`,
        background: tone === 'default' ? 'rgba(255,255,255,0.86)' : theme.background,
        color: theme.badge,
        fontSize: '0.68rem',
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...style
      }}
    >
      {label || labels.compactBadge}
    </span>
  );
};

export default ProcessingContextBadge;
