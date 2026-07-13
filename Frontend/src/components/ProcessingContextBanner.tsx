import type { CSSProperties } from 'react';
import ProcessingContextBadge from '@/components/ProcessingContextBadge';
import {
  getProcessingContextStatusLabels,
  getProcessingContextVisualTheme,
  type ProcessingContextAssessment,
  type ProcessingContextVisualTone
} from '@/utils/processingContextStatus';

interface ProcessingContextBannerProps {
  assessment: ProcessingContextAssessment;
  tone?: ProcessingContextVisualTone;
  heading?: string;
  badgeLabel?: string;
  showMetrics?: boolean;
  noticesMode?: 'all' | 'first' | 'none';
  containerStyle?: CSSProperties;
  headingStyle?: CSSProperties;
  detailStyle?: CSSProperties;
  metricsStyle?: CSSProperties;
}

const ProcessingContextBanner: React.FC<ProcessingContextBannerProps> = ({
  assessment,
  tone = 'default',
  heading,
  badgeLabel,
  showMetrics = true,
  noticesMode = 'none',
  containerStyle,
  headingStyle,
  detailStyle,
  metricsStyle
}) => {
  const theme = getProcessingContextVisualTheme(assessment.status, tone);
  const labels = getProcessingContextStatusLabels(assessment.status);
  const notices = noticesMode === 'all'
    ? assessment.notices
    : noticesMode === 'first'
      ? assessment.notices.slice(0, 1)
      : [];

  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      background: theme.background,
      ...containerStyle
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: theme.title,
            marginBottom: '4px',
            ...headingStyle
          }}>
            {heading || assessment.headline}
          </div>
          <div style={{
            fontSize: '0.8rem',
            lineHeight: 1.45,
            color: theme.body,
            ...detailStyle
          }}>
            {assessment.detail}
          </div>
        </div>
        <ProcessingContextBadge
          status={assessment.status}
          label={badgeLabel || (tone === 'default' ? labels.detailedBadge : labels.compactBadge)}
          title={assessment.detail}
          tone={tone === 'default' ? 'default' : tone}
        />
      </div>

      {showMetrics ? (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '8px',
          fontSize: '0.74rem',
          color: theme.body,
          ...metricsStyle
        }}>
          <span>Area Total: {assessment.baseAreaPointCount}</span>
          <span>Terreno Original: {assessment.originalPropertyPointCount}</span>
        </div>
      ) : null}

      {notices.length > 0 ? (
        <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
          {notices.map((notice) => (
            <div key={notice.id} style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: `1px solid ${theme.noticeBorder}`,
              background: theme.noticeBackground
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.noticeTitle, marginBottom: '4px' }}>
                {notice.title}
              </div>
              <div style={{ fontSize: '0.76rem', lineHeight: 1.45, color: theme.noticeBody }}>
                {notice.message}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ProcessingContextBanner;
