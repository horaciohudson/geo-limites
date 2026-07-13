package com.momorialPro.CadMemorial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tab_cad_system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CadSystemSettings extends AuditBase {

    @Id
    @Column(name = "cad_settings_id", updatable = false, nullable = false)
    private Short id;

    @Column(name = "measurement_unit", nullable = false, length = 8)
    @Builder.Default
    private String measurementUnit = "cm";

    @Column(name = "new_document_workspace_size", nullable = false)
    @Builder.Default
    private Double newDocumentWorkspaceSize = 1000d;
}
