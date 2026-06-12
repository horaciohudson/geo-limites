package com.momorialPro.CadMemorial.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantOperationalAdminDTO {
    private UUID tenantId;
    private String tenantCode;
    private String tenantName;
    private String tenantStatus;
    private String onboardingStatus;
    private String billingStatus;
    private boolean companyDataCompleted;
    private boolean adminApproved;
    private boolean firstPaymentConfirmed;
    private boolean operationalAccessReleased;
    private String adminApprovedBy;
    private OffsetDateTime adminApprovedAt;
    private String firstPaymentConfirmedBy;
    private OffsetDateTime firstPaymentConfirmedAt;
    private String operationalAccessReleasedBy;
    private OffsetDateTime operationalAccessReleasedAt;
    private String releaseNotes;
}
