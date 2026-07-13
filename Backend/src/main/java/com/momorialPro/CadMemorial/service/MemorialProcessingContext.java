package com.momorialPro.CadMemorial.service;

import java.util.List;

public record MemorialProcessingContext(
        BaseAreaContext baseArea,
        OriginalPropertyContext originalProperty,
        RemainingAreaContext remainingArea
) {
    public MemorialProcessingContext(BaseAreaContext baseArea) {
        this(baseArea, OriginalPropertyContext.fromBaseArea(baseArea), null);
    }

    public MemorialProcessingContext(
            BaseAreaContext baseArea,
            OriginalPropertyContext originalProperty) {
        this(baseArea, originalProperty, null);
    }

    public MemorialProcessingContext {
        if (originalProperty == null && baseArea != null && baseArea.hasVertices()) {
            originalProperty = OriginalPropertyContext.fromBaseArea(baseArea);
        }
    }

    public boolean hasBaseArea() {
        return baseArea != null && baseArea.hasVertices();
    }

    public boolean hasOriginalProperty() {
        return effectiveOriginalProperty() != null && effectiveOriginalProperty().hasVertices();
    }

    public OriginalPropertyContext effectiveOriginalProperty() {
        if (originalProperty != null && originalProperty.hasVertices()) {
            return originalProperty;
        }
        return OriginalPropertyContext.fromBaseArea(baseArea);
    }

    public boolean hasRemainingArea() {
        return effectiveRemainingArea() != null && effectiveRemainingArea().hasVertices();
    }

    public RemainingAreaContext effectiveRemainingArea() {
        if (remainingArea != null && remainingArea.hasVertices()) {
            return remainingArea;
        }
        return null;
    }

    public record BaseAreaContext(
            String label,
            List<BaseAreaPoint> vertices
    ) {
        public boolean hasVertices() {
            return vertices != null && !vertices.isEmpty();
        }
    }

    public record OriginalPropertyContext(
            String label,
            String source,
            String narrativeRole,
            List<BaseAreaPoint> vertices
    ) {
        private static final String DEFAULT_LABEL = "TERRENO_ORIGINAL";
        private static final String DEFAULT_SOURCE = "BASE_AREA";
        private static final String DEFAULT_NARRATIVE_ROLE = "TERRENO_ORIGINAL";

        public static OriginalPropertyContext fromBaseArea(BaseAreaContext baseArea) {
            if (baseArea == null || !baseArea.hasVertices()) {
                return null;
            }
            return new OriginalPropertyContext(
                    baseArea.label(),
                    DEFAULT_SOURCE,
                    DEFAULT_NARRATIVE_ROLE,
                    baseArea.vertices()
            );
        }

        public boolean hasVertices() {
            return vertices != null && !vertices.isEmpty();
        }

        public String resolvedLabel() {
            return label == null || label.isBlank() ? DEFAULT_LABEL : label.trim();
        }

        public String resolvedSource() {
            return source == null || source.isBlank() ? DEFAULT_SOURCE : source.trim();
        }

        public String resolvedNarrativeRole() {
            return narrativeRole == null || narrativeRole.isBlank() ? DEFAULT_NARRATIVE_ROLE : narrativeRole.trim();
        }

        public int pointCount() {
            return vertices != null ? vertices.size() : 0;
        }
    }

    public record RemainingAreaContext(
            String label,
            String source,
            String narrativeRole,
            List<BaseAreaPoint> vertices
    ) {
        private static final String DEFAULT_LABEL = "AREA_REMANESCENTE";
        private static final String DEFAULT_SOURCE = "PROCESSING_CONTEXT";
        private static final String DEFAULT_NARRATIVE_ROLE = "AREA_REMANESCENTE";

        public boolean hasVertices() {
            return vertices != null && !vertices.isEmpty();
        }

        public String resolvedLabel() {
            return label == null || label.isBlank() ? DEFAULT_LABEL : label.trim();
        }

        public String resolvedSource() {
            return source == null || source.isBlank() ? DEFAULT_SOURCE : source.trim();
        }

        public String resolvedNarrativeRole() {
            return narrativeRole == null || narrativeRole.isBlank() ? DEFAULT_NARRATIVE_ROLE : narrativeRole.trim();
        }

        public int pointCount() {
            return vertices != null ? vertices.size() : 0;
        }
    }

    public record BaseAreaPoint(
            int orderNumber,
            String label,
            double x,
            double y
    ) {}
}
