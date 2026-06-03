package com.momorialPro.CadMemorial.service;



import com.momorialPro.CadMemorial.dto.DxfCompareResultDTO;
import com.momorialPro.CadMemorial.dto.DxfEntityChangeDTO;
import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.repository.FileMetadataRepository;
import com.momorialPro.CadMemorial.util.DxfParser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DxfCompareService {

    private final FileMetadataRepository files;

    @Transactional(readOnly = true)
    public DxfCompareResultDTO compareByIds(UUID oldId, UUID newId) {
        FileMetadata oldF = files.findById(oldId).orElseThrow(() -> new IllegalArgumentException("Arquivo antigo não encontrado"));
        FileMetadata newF = files.findById(newId).orElseThrow(() -> new IllegalArgumentException("Arquivo novo não encontrado"));

        var oldEntities = DxfParser.parse(Path.of(oldF.getDiskPath()));
        var newEntities = DxfParser.parse(Path.of(newF.getDiskPath()));

        // index por (type|layer) → fingerprints
        Map<String, Set<String>> oldMap = groupByTL(oldEntities);
        Map<String, Set<String>> newMap = groupByTL(newEntities);

        List<DxfEntityChangeDTO> added = new ArrayList<>();
        List<DxfEntityChangeDTO> removed = new ArrayList<>();
        List<DxfEntityChangeDTO> modified = new ArrayList<>();

        Set<String> keys = new HashSet<>();
        keys.addAll(oldMap.keySet());
        keys.addAll(newMap.keySet());

        for (String key : keys) {
            String[] tl = key.split("\\|", 2);
            String type = tl[0]; String layer = tl.length > 1 ? tl[1] : "0";
            Set<String> o = oldMap.getOrDefault(key, Set.of());
            Set<String> n = newMap.getOrDefault(key, Set.of());

            // added
            for (String fp : diff(n, o)) added.add(ch(type, layer, fp, "ADDED"));
            // removed
            for (String fp : diff(o, n)) removed.add(ch(type, layer, fp, "REMOVED"));

            // heurística MODIFIED: mesmo count mas fingerprints diferentes
            if (!o.isEmpty() && !n.isEmpty() && !o.equals(n) && o.size() == n.size()) {
                // marca todos como modified para sinalizar alteração sutil
                for (String fp : n) modified.add(ch(type, layer, fp, "MODIFIED"));
            }
        }

        Map<String, Integer> summary = summarize(added, removed, modified);

        return DxfCompareResultDTO.builder()
                .oldFileName(oldF.getOriginalName())
                .newFileName(newF.getOriginalName())
                .totalOldEntities(oldEntities.size())
                .totalNewEntities(newEntities.size())
                .added(added)
                .removed(removed)
                .modified(modified)
                .summaryByType(summary)
                .build();
    }

    private static Map<String, Set<String>> groupByTL(List<DxfParser.Entity> list) {
        return list.stream().collect(Collectors.groupingBy(
                e -> e.type() + "|" + e.layer(),
                Collectors.mapping(e -> e.fingerprint() != null ? e.fingerprint() : "null", Collectors.toSet())
        ));
    }

    private static Set<String> diff(Set<String> a, Set<String> b) {
        Set<String> r = new HashSet<>(a);
        r.removeAll(b);
        return r;
    }

    private static DxfEntityChangeDTO ch(String type, String layer, String id, String change) {
        return DxfEntityChangeDTO.builder().type(type).layer(layer).id(id).change(change).build();
    }
    
    /**
     * Cria DxfEntityChangeDTO com informações completas da entidade DXF
     */
    private static DxfEntityChangeDTO createEntityChange(DxfParser.Entity entity, String change) {
        return DxfEntityChangeDTO.builder()
            .type(entity.type())
            .layer(entity.layer())
            .id(entity.fingerprint())
            .change(change)
            .x(entity.x())
            .y(entity.y())
            .z(entity.z())
            .x2(entity.x2())
            .y2(entity.y2())
            .z2(entity.z2())
            .radius(entity.radius())
            .startAngle(entity.startAngle())
            .endAngle(entity.endAngle())
            .text(entity.text())
            .textStyle(entity.textStyle())
            .textHeight(entity.textHeight())
            .textRotation(entity.textRotation())
            .build();
    }

    private static Map<String, Integer> summarize(List<DxfEntityChangeDTO> a, List<DxfEntityChangeDTO> r, List<DxfEntityChangeDTO> m) {
        Map<String, Integer> map = new LinkedHashMap<>();
        for (var x : a) map.merge(x.getType() + ":+", 1, Integer::sum);
        for (var x : r) map.merge(x.getType() + ":-", 1, Integer::sum);
        for (var x : m) map.merge(x.getType() + ":~", 1, Integer::sum);
        return map;
    }
}