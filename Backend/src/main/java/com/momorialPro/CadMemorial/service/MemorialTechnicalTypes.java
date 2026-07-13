package com.momorialPro.CadMemorial.service;

import java.util.List;
import java.util.Map;

record SimplePoint(
        double x,
        double y,
        String id
) {}

record PolygonEdge(
        double startX,
        double startY,
        double endX,
        double endY,
        String side,
        double length,
        double angleDegrees
) {}

record ManualFrontageEvidence(
        String streetName,
        String sourceDirection,
        String inferredSide,
        boolean directTouch,
        boolean cornerContinuation
) {}

record OrderLabelReference(
        String label,
        int orderNumber,
        double x,
        double y
) {}

record OrderedLotContext(
        Map<String, Object> entity,
        List<Map<String, Object>> vertices,
        Double area,
        Double perimeter,
        Integer lotNumberHint,
        List<String> orderLabels,
        int firstOrderNumber,
        double centroidX,
        double centroidY,
        int fallbackIndex
) {}

record LotBlock(
        int lotNumber,
        String content,
        int start,
        int end
) {}

record VertexTechnicalPoint(
        int originalIndex,
        String label,
        int orderNumber,
        double x,
        double y
) {}

record TechnicalSideSummary(
        int sideIndex,
        String startLabel,
        String endLabel,
        double length,
        String direction,
        String technicalBearing,
        String reference,
        String referenceSource,
        String reason
) {}

record FrontageReference(
        String reference,
        String source,
        int confidenceScore,
        String reason
) {}

record LotTechnicalSummary(
        int lotNumber,
        Double area,
        Double perimeter,
        List<VertexTechnicalPoint> vertexSequence,
        List<TechnicalSideSummary> sideSummaries,
        Map<String, String> consolidatedConfrontations,
        List<String> streetFrontages,
        boolean isCornerLot,
        boolean hasDualFrontage,
        boolean hasGeoreferencedVertices,
        List<ValidationIssue> supplementalValidationIssues
) {}

record ValidationIssue(
        String code,
        String severity,
        String message
) {}

record MemorialAlignmentCheck(
        boolean valid,
        List<String> blockingIssues,
        List<String> warnings
) {}
