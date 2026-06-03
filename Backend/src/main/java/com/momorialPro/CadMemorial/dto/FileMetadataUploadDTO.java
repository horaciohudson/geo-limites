package com.momorialPro.CadMemorial.dto;



import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadataUploadDTO {
    private MultipartFile file;
    private UUID ownerId;
}