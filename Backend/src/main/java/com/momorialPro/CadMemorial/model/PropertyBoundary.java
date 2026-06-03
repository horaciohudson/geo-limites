package com.momorialPro.CadMemorial.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tab_property_boundaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyBoundary {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "boundary_id")
    private UUID boundaryId;
    
    // DIRECTION
    @Column(nullable = false, length = 20)
    private String direction; // NORTH, SOUTH, EAST, WEST, NORTHEAST, etc.
    
    // MEASUREMENTS
    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal extension;
    
    @Column(precision = 8, scale = 4)
    private BigDecimal azimuth;
    
    // ADJACENT
    @Column(name = "adjacent_type", nullable = false, length = 50)
    private String adjacentType; // OWNER, STREET, AVENUE, RIVER, RAILWAY, etc.
    
    @Column(name = "adjacent_name", nullable = false)
    private String adjacentName;
    
    @Column(name = "adjacent_document", length = 50)
    private String adjacentDocument;
    
    // DESCRIPTION
    @Column(name = "full_description", columnDefinition = "TEXT")
    private String fullDescription;
    
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