import GenerationProgress from './GenerationProgress';

type GeneratedDocumentKind = 'memorial' | 'resumo-tecnico';

interface DocumentProcessingOverlayProps {
  generatedDocumentKind: GeneratedDocumentKind;
  currentFileName?: string | null;
  memorialCurrentStep: string;
  memorialTimeElapsed: number;
  generationProgress: number;
}

const DocumentProcessingOverlay: React.FC<DocumentProcessingOverlayProps> = ({
  generatedDocumentKind,
  currentFileName,
  memorialCurrentStep,
  memorialTimeElapsed,
  generationProgress
}) => {
  const title = generatedDocumentKind === 'resumo-tecnico'
    ? 'Gerando Resumo Tecnico'
    : 'Gerando Memorial Descritivo';

  const subtitle = `${currentFileName || 'Arquivo atual'} em processamento.`;

  return (
    <GenerationProgress
      isGenerating
      progress={generationProgress}
      currentStep={memorialCurrentStep || 'Processando...'}
      timeElapsed={memorialTimeElapsed}
      title={title}
      subtitle={subtitle}
      tips={
        <p>
          O documento sera aberto na aba dedicada assim que o processamento terminar.
        </p>
      }
    />
  );
};

export default DocumentProcessingOverlay;
