/**
 * Utility functions for parsing memorial generation progress
 * Extracts chunk progress information from backend messages
 */

import type { ChunkProgress } from '../types/ProgressTypes';

/**
 * Parse chunk progress from backend message
 * Examples:
 * - "Processando chunk 2 de 5"
 * - "Gerando chunk 3 of 10"
 * - "Processing chunk 1/5"
 */
export function parseChunkProgress(message: string): ChunkProgress | null {
    if (!message) return null;

    // Regex patterns for different message formats
    const patterns = [
        /chunk\s+(\d+)\s+(?:de|of|\/)\s+(\d+)/i,
        /processando\s+(\d+)\s+de\s+(\d+)/i,
        /gerando\s+(\d+)\s+de\s+(\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
            const currentChunk = parseInt(match[1], 10);
            const totalChunks = parseInt(match[2], 10);

            if (currentChunk > 0 && totalChunks > 0 && currentChunk <= totalChunks) {
                return {
                    currentChunk,
                    totalChunks,
                    stage: determineStage(message),
                    message
                };
            }
        }
    }

    return null;
}

/**
 * Determine the current stage from message content
 */
function determineStage(message: string): 'chunking' | 'generating' | 'combining' {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('dividindo') || lowerMessage.includes('particionando')) {
        return 'chunking';
    }

    if (lowerMessage.includes('combinando') || lowerMessage.includes('unindo')) {
        return 'combining';
    }

    return 'generating';
}

/**
 * Calculate progress percentage from chunk information
 */
export function calculateChunkProgress(chunkProgress: ChunkProgress): number {
    if (!chunkProgress || chunkProgress.totalChunks === 0) {
        return 0;
    }

    return Math.round((chunkProgress.currentChunk / chunkProgress.totalChunks) * 100);
}

/**
 * Format chunk progress message for display
 */
export function formatChunkMessage(chunkProgress: ChunkProgress): string {
    const { currentChunk, totalChunks, stage } = chunkProgress;

    const stageMessages = {
        chunking: 'Dividindo memorial',
        generating: 'Gerando chunk',
        combining: 'Combinando chunks'
    };

    return `${stageMessages[stage]} ${currentChunk} de ${totalChunks}`;
}
