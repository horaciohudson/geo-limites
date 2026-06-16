package com.momorialPro.CadMemorial.dto;


import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DxfCompareRequestDTO {
    private UUID oldFileId;
    private UUID newFileId;
}
