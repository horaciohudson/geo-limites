package com.momorialPro.CadMemorial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tab_memorial_base_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemorialBaseSnapshot extends AuditBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "snapshot_id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id")
    private FileMetadata file;

    @Column(name = "memorial_standard_id")
    private UUID memorialStandardId;

    @Column(name = "project_name", length = 255)
    private String projectName;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "pipeline_version", length = 50, nullable = false)
    private String pipelineVersion;

    @Column(name = "estimated_lot_count")
    private Integer estimatedLotCount;

    @Column(name = "georeferenced", nullable = false)
    @Builder.Default
    private Boolean georeferenced = Boolean.FALSE;

    @Column(name = "coordinate_source", length = 100)
    private String coordinateSource;

    @Column(name = "generation_status", length = 30, nullable = false)
    @Builder.Default
    private String generationStatus = "GENERATED";

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "memorial_base_json", columnDefinition = "TEXT", nullable = false)
    private String memorialBaseJson;
}
