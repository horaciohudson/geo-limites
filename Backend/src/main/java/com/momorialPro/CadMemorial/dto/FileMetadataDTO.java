package com.momorialPro.CadMemorial.dto;




import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadataDTO {
    private UUID id;
    private String originalName;
    private String storedName;
    private String extension;
    private String contentType;
    private long sizeBytes;
    private String checksumSha256;
    private String diskPath;
    private UUID ownerId;
    private String ownerUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Construtor simplificado para mensagens
    public FileMetadataDTO(UUID id, String originalName) {
        this.id = id;
        this.originalName = originalName;
    }
}

