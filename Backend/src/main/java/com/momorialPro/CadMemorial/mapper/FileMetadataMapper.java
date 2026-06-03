package com.momorialPro.CadMemorial.mapper;




import com.momorialPro.CadMemorial.dto.FileMetadataDTO;
import com.momorialPro.CadMemorial.model.FileMetadata;
import org.springframework.stereotype.Component;

@Component
public class FileMetadataMapper {

    public FileMetadataDTO toDTO(FileMetadata entity) {
        if (entity == null) return null;

        return FileMetadataDTO.builder()
                .id(entity.getId())
                .originalName(entity.getOriginalName())
                .storedName(entity.getStoredName())
                .extension(entity.getExtension())
                .contentType(entity.getContentType())
                .sizeBytes(entity.getSizeBytes())
                .checksumSha256(entity.getChecksumSha256())
                .diskPath(entity.getDiskPath())
                .ownerId(entity.getOwner() != null ? entity.getOwner().getId() : null)
                .ownerUsername(entity.getOwner() != null ? entity.getOwner().getUsername() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

}