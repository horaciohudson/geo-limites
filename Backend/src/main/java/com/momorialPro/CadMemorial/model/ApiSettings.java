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
@Table(name = "tab_api_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiSettings extends AuditBase {

    @Id
    @Column(name = "api_config_id", updatable = false, nullable = false)
    private Short id;

    @Column(name = "template_api_provider", nullable = false, length = 50)
    @Builder.Default
    private String templateApiProvider = "CLAUDE";

    @Column(name = "memorial_api_provider", nullable = false, length = 50)
    @Builder.Default
    private String memorialApiProvider = "CLAUDE";
}
