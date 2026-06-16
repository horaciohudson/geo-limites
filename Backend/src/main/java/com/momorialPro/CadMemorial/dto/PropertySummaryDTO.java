package com.momorialPro.CadMemorial.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO para resumo de propriedades usado na pesquisa
 */
@Data
@Builder
public class PropertySummaryDTO {
    
    private String property_id;
    private String registration_number;
    private String name;
    private String property_type;
    private String full_address;
    private String owner_name;
    private String owner_document;
    private Integer total_owners;
    private Integer total_documents;
    private Integer total_files;
    private Integer total_dxf_files;
    private String dxf_files_list;
    private String completeness_status;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}