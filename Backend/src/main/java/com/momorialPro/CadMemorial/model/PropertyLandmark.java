package com.momorialPro.CadMemorial.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tab_property_landmarks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyLandmark {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "landmark_id")
    private UUID landmarkId;
    
    // LANDMARK IDENTIFICATION
    @Column(name = "landmark_name", nullable = false, length = 50)
    private String landmarkName;
    
    @Column(name = "landmark_type", nullable = false, length = 20)
    private String landmarkType; // LANDMARK, VERTEX, REFERENCE_POINT
    
    // COORDINATES
    @Column(name = "coordinate_x", nullable = false, precision = 15, scale = 4)
    private BigDecimal coordinateX;
    
    @Column(name = "coordinate_y", nullable = false, precision = 15, scale = 4)
    private BigDecimal coordinateY;
    
    @Column(name = "coordinate_z", precision = 10, scale = 4)
    private BigDecimal coordinateZ;
    
    // TECHNICAL DATA
    @Column(name = "entrance_azimuth", precision = 8, scale = 4)
    private BigDecimal entranceAzimuth;
    
    @Column(name = "exit_azimuth", precision = 8, scale = 4)
    private BigDecimal exitAzimuth;
    
    @Column(name = "previous_distance", precision = 15, scale = 4)
    private BigDecimal previousDistance;
    
    // DESCRIPTION
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "landmark_material")
    private String landmarkMaterial;
    
    // ORDER
    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;
    
    // RELATIONSHIP
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;
    
    // AUDIT
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}