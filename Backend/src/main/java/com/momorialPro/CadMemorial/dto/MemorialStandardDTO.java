package com.momorialPro.CadMemorial.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemorialStandardDTO {

    private UUID id;
    private String name;
    private String description;
    private String standardText;
    private String promptTemplate;
    private Boolean active;
    private Boolean isDefault;
    private UUID ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}