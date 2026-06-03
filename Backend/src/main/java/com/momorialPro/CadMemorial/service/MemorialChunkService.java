package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.ChunkResult;
import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.LotChunk;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Serviço responsável pelo particionamento de memoriais grandes.
 * Divide a geração em chunks menores para garantir completude.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MemorialChunkService {
    
    @Value("${memorialpro.memorial.partition.chunk-size:10}")
    private int chunkSize;
    
    @Value("${memorialpro.memorial.partition.overlap:1}")
    private int overlap;
    
    /**
     * Cria chunks de lotes para geração particionada.
     * 
     * @param totalLots Número total de lotes no projeto
     * @param sharedContext Contexto compartilhado (dados da propriedade, normas, etc.)
     * @return Lista de chunks para serem processados
     */
    public List<LotChunk> createChunks(int totalLots, String sharedContext) {
        List<LotChunk> chunks = new ArrayList<>();
        int currentLot = 1;
        int chunkNumber = 1;
        
        while (currentLot <= totalLots) {
            List<Integer> lotNumbers = new ArrayList<>();
            
            // Adiciona lotes ao chunk atual
            for (int i = 0; i < chunkSize && currentLot <= totalLots; i++) {
                lotNumbers.add(currentLot);
                currentLot++;
            }
            
            // Cria o chunk
            LotChunk chunk = LotChunk.builder()
                    .chunkNumber(chunkNumber)
                    .totalChunks(0) // Será atualizado depois
                    .lotNumbers(lotNumbers)
                    .firstChunk(chunkNumber == 1)
                    .lastChunk(currentLot > totalLots)
                    .sharedContext(sharedContext)
                    .build();
            
            chunks.add(chunk);

            chunkNumber++;
            
            // Retrocede para criar overlap (exceto no último chunk)
            if (currentLot <= totalLots && overlap > 0) {
                currentLot -= overlap;
            }
        }
        
        // Atualiza totalChunks em todos os chunks
        int totalChunks = chunks.size();
        chunks.forEach(chunk -> chunk.setTotalChunks(totalChunks));

        return chunks;
    }
    
    /**
     * Combina múltiplos chunks em um memorial único.
     * 
     * @param chunkResults Lista de resultados dos chunks
     * @return Memorial completo combinado
     */
    public String combineChunks(List<ChunkResult> chunkResults) {
        if (chunkResults.isEmpty()) {
            log.error("❌ Nenhum chunk para combinar!");
            return "";
        }
        
        // Ordena chunks por número
        List<ChunkResult> sortedChunks = chunkResults.stream()
                .sorted(Comparator.comparingInt(ChunkResult::getChunkNumber))
                .collect(Collectors.toList());
        
        StringBuilder memorial = new StringBuilder();
        
        // Primeiro chunk: extrai preâmbulo + lotes
        ChunkResult firstChunk = sortedChunks.get(0);
        String firstContent = firstChunk.getContent();
        
        // Adiciona preâmbulo (tudo antes do primeiro LOTE)
        String preamble = extractPreamble(firstContent);
        memorial.append(preamble);

        // Adiciona lotes de todos os chunks
        for (ChunkResult chunk : sortedChunks) {
            String lots = extractLots(chunk.getContent());
            memorial.append(lots);
        }
        
        // Último chunk: extrai conclusão
        ChunkResult lastChunk = sortedChunks.get(sortedChunks.size() - 1);
        String conclusion = extractConclusion(lastChunk.getContent());
        memorial.append(conclusion);

        String result = memorial.toString();
        return result;
    }
    
    /**
     * Extrai o preâmbulo (tudo antes do primeiro LOTE).
     */
    private String extractPreamble(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }

        Pattern pattern = Pattern.compile("(?i)(.*?)(?=LOTE\\s+\\d+:)", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(content);
        
        if (matcher.find()) {
            return matcher.group(1).trim() + "\n\n";
        }
        
        // Se não encontrou LOTE, retorna os primeiros 30% do conteúdo
        int preambleLength = (int) (content.length() * 0.3);
        return content.substring(0, Math.min(preambleLength, content.length()));
    }
    
    /**
     * Extrai apenas a seção de lotes (LOTE 1 até último LOTE).
     */
    private String extractLots(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }

        Pattern pattern = Pattern.compile(
                "(?i)(LOTE\\s+\\d+:.*?)(?=\\n\\n(?:DECLARAÇÃO|CONCLUSÃO|$))", 
                Pattern.DOTALL
        );
        Matcher matcher = pattern.matcher(content);
        
        StringBuilder lots = new StringBuilder();
        while (matcher.find()) {
            lots.append(matcher.group(1).trim()).append("\n\n");
        }
        
        // Se não encontrou padrão específico, tenta extrair tudo que tem "LOTE"
        if (lots.length() == 0) {
            pattern = Pattern.compile("(?i)(LOTE\\s+\\d+:.*?)(?=LOTE\\s+\\d+:|$)", Pattern.DOTALL);
            matcher = pattern.matcher(content);
            
            while (matcher.find()) {
                lots.append(matcher.group(1).trim()).append("\n\n");
            }
        }
        
        return lots.toString();
    }
    
    /**
     * Extrai a conclusão (tudo depois do último LOTE).
     */
    private String extractConclusion(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }

        // Procura por seções finais típicas
        Pattern pattern = Pattern.compile(
                "(?i)((?:DECLARAÇÃO|CONCLUSÃO|OBSERVAÇÕES).*?)$", 
                Pattern.DOTALL
        );
        Matcher matcher = pattern.matcher(content);
        
        if (matcher.find()) {
            return "\n" + matcher.group(1).trim();
        }
        
        // Se não encontrou, pega os últimos 20% do conteúdo
        int conclusionStart = (int) (content.length() * 0.8);
        return content.substring(conclusionStart);
    }
    
    /**
     * Valida se todos os lotes esperados foram gerados.
     * 
     * @param memorial Memorial completo
     * @param expectedLots Número esperado de lotes
     * @return true se todos os lotes foram encontrados
     */
    public boolean validateCompleteness(String memorial, int expectedLots) {
        Pattern pattern = Pattern.compile("(?i)LOTE\\s+(\\d+):");
        Matcher matcher = pattern.matcher(memorial);
        
        Set<Integer> foundLots = new HashSet<>();
        while (matcher.find()) {
            int lotNumber = Integer.parseInt(matcher.group(1));
            foundLots.add(lotNumber);
        }

        // Verifica se todos os lotes esperados foram encontrados
        List<Integer> missingLots = new ArrayList<>();
        for (int i = 1; i <= expectedLots; i++) {
            if (!foundLots.contains(i)) {
                missingLots.add(i);
            }
        }
        
        if (!missingLots.isEmpty()) {
            log.warn("⚠️ Lotes faltantes: {}", 
                    missingLots.stream().map(String::valueOf).collect(Collectors.joining(", ")));
            return false;
        }
        
        // Verifica se não há lotes extras
        List<Integer> extraLots = foundLots.stream()
                .filter(lot -> lot > expectedLots)
                .sorted()
                .collect(Collectors.toList());
        
        if (!extraLots.isEmpty()) {
            log.warn("⚠️ Lotes extras encontrados: {}", 
                    extraLots.stream().map(String::valueOf).collect(Collectors.joining(", ")));
        }
        
        boolean isComplete = foundLots.size() == expectedLots && missingLots.isEmpty();

        if (!isComplete) {
            log.error("❌ Memorial INCOMPLETO: {} lotes encontrados de {} esperados", 
                    foundLots.size(), expectedLots);
        }
        
        return isComplete;
    }
    
    /**
     * Identifica lotes faltantes no memorial.
     * 
     * @param memorial Memorial gerado
     * @param expectedLots Número esperado de lotes
     * @return Lista de números de lotes faltantes
     */
    public List<Integer> findMissingLots(String memorial, int expectedLots) {
        Pattern pattern = Pattern.compile("(?i)LOTE\\s+(\\d+):");
        Matcher matcher = pattern.matcher(memorial);
        
        Set<Integer> foundLots = new HashSet<>();
        while (matcher.find()) {
            foundLots.add(Integer.parseInt(matcher.group(1)));
        }
        
        List<Integer> missingLots = new ArrayList<>();
        for (int i = 1; i <= expectedLots; i++) {
            if (!foundLots.contains(i)) {
                missingLots.add(i);
            }
        }
        
        return missingLots;
    }
}


