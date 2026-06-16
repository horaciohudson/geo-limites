package com.momorialPro.CadMemorial.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DxfEntityChangeDTO {
    private String type;   // LINE, LWPOLYLINE, TEXT...
    private String layer;
    private String id;     // fingerprint do bloco DXF
    private String change; // ADDED | REMOVED | MODIFIED
    
    // Coordenadas para melhor extração de dados
    private Double x;      // Coordenada X principal
    private Double y;      // Coordenada Y principal
    private Double z;      // Coordenada Z principal
    private Double x2;     // Segunda coordenada X (para linhas, etc.)
    private Double y2;     // Segunda coordenada Y
    private Double z2;     // Segunda coordenada Z
    private Double radius; // Raio (para círculos, arcos)
    private Double startAngle; // Ângulo inicial (para arcos)
    private Double endAngle;   // Ângulo final (para arcos)
    
    // Informações de texto
    private String text;         // Conteúdo do texto
    private String textStyle;    // Estilo do texto
    private Double textHeight;   // Altura do texto
    private Double textRotation; // Rotação do texto
    
    // Vértices para polylines (LWPOLYLINE, POLYLINE)
    private java.util.List<java.util.Map<String, Double>> vertices; // Lista de vértices com x, y
}