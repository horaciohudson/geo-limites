package com.momorialPro.CadMemorial.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tab_properties")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "property_id")
    private UUID propertyId;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "internal_code")
    private String internalCode;
    
    // OWNER
    @Column(name = "owner_name", nullable = false)
    private String ownerName;
    
    @Column(name = "owner_document")
    private String ownerDocument;
    
    @Column(name = "owner_id_number")
    private String ownerIdNumber;
    
    @Column(name = "owner_phone")
    private String ownerPhone;
    
    @Column(name = "owner_email")
    private String ownerEmail;
    
    // LOCATION
    @Column(nullable = false)
    private String street;
    
    private String number;
    private String complement;
    
    @Column(nullable = false)
    private String neighborhood;
    
    @Column(nullable = false)
    private String city;
    
    @Column(nullable = false, length = 2)
    private String state;
    
    @Column(name = "zip_code")
    private String zipCode;
    
    // CARTOGRAPHIC DATA
    @Column(name = "coordinate_system")
    private String coordinateSystem;
    
    private String datum;
    
    @Column(name = "utm_zone")
    private String utmZone;
    
    @Column(name = "central_meridian")
    private String centralMeridian;
    
    // SIRGAS 2000 BASE COORDINATES (for manual input)
    @Column(name = "sirgas_e", precision = 15, scale = 4)
    private BigDecimal sirgas_e; // Coordenada Leste (East)
    
    @Column(name = "sirgas_n", precision = 15, scale = 4)
    private BigDecimal sirgas_n; // Coordenada Norte (North)
    
    @Column(name = "sirgas_source")
    private String sirgas_source; // Fonte da coordenada (GPS, Marco, etc.)
    
    // TECHNICAL DATA
    @Column(name = "total_area", precision = 15, scale = 4)
    private BigDecimal totalArea;
    
    @Column(name = "total_perimeter", precision = 15, scale = 4)
    private BigDecimal totalPerimeter;
    
    @Column(name = "main_frontage", precision = 15, scale = 4)
    private BigDecimal mainFrontage;
    
    @Column(name = "average_depth", precision = 15, scale = 4)
    private BigDecimal averageDepth;
    
    // LEGAL DATA
    @Column(name = "registration_number")
    private String registrationNumber;
    
    @Column(name = "registry_office")
    private String registryOffice;
    
    @Column(name = "registration_book")
    private String registrationBook;
    
    @Column(name = "registration_page")
    private String registrationPage;
    
    @Column(name = "registration_date")
    private LocalDate registrationDate;
    
    // CLASSIFICATION
    @Column(name = "property_type")
    private String propertyType;
    
    private String zoning;
    
    @Column(name = "floor_area_ratio", precision = 5, scale = 2)
    private BigDecimal floorAreaRatio;
    
    @Column(name = "lot_coverage", precision = 5, scale = 2)
    private BigDecimal lotCoverage;
    
    // BOUNDARIES
    @Column(name = "north_boundary", columnDefinition = "TEXT")
    private String northBoundary;
    
    @Column(name = "south_boundary", columnDefinition = "TEXT")
    private String southBoundary;
    
    @Column(name = "east_boundary", columnDefinition = "TEXT")
    private String eastBoundary;
    
    @Column(name = "west_boundary", columnDefinition = "TEXT")
    private String westBoundary;
    
    // NOTES
    @Column(columnDefinition = "TEXT")
    private String observations;
    
    @Column(columnDefinition = "TEXT")
    private String restrictions;
    
    // RELATIONSHIPS
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PropertyLandmark> landmarks = new ArrayList<>();
    
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PropertyBoundary> boundaries = new ArrayList<>();
    
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PropertyDocument> documents = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    private Tenant tenant;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    // AUDIT
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Builder.Default
    private Boolean active = true;
}
