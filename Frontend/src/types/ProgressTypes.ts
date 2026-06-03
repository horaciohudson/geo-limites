/**
 * Types for memorial generation progress tracking
 * Used to display chunking progress in the UI
 */

export interface ChunkProgress {
    currentChunk: number;
    totalChunks: number;
    stage: 'chunking' | 'generating' | 'combining';
    message: string;
}

export interface GenerationProgress {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number; // 0-100
    chunkProgress?: ChunkProgress;
    estimatedTimeRemaining?: number;
}

export interface MemorialGenerationStatus {
    memorialId: string;
    progress: GenerationProgress;
    startTime: number;
    lastUpdate: number;
}
