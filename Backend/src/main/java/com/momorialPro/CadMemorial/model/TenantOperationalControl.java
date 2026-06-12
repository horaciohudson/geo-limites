package com.momorialPro.CadMemorial.model;

import com.momorialPro.CadMemorial.enums.TenantBillingStatus;
import com.momorialPro.CadMemorial.enums.TenantOnboardingStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Operational governance state persisted per tenant for SaaS onboarding.
 */
@Entity
@Table(name = "tab_tenant_operational_control", uniqueConstraints = {
    @UniqueConstraint(name = "ux_tenant_operational_control_tenant", columnNames = "tenant_id")
}, indexes = {
    @Index(name = "ix_tenant_operational_control_onboarding_status", columnList = "onboarding_status"),
    @Index(name = "ix_tenant_operational_control_billing_status", columnList = "billing_status"),
    @Index(name = "ix_tenant_operational_control_operational_access", columnList = "operational_access_released")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
public class TenantOperationalControl extends AuditBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tenant_operational_control_id", columnDefinition = "UUID")
    private UUID id;

    @Column(name = "tenant_id", nullable = false, columnDefinition = "UUID", unique = true)
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "onboarding_status", nullable = false, length = 30)
    @Builder.Default
    private TenantOnboardingStatus onboardingStatus = TenantOnboardingStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_status", nullable = false, length = 30)
    @Builder.Default
    private TenantBillingStatus billingStatus = TenantBillingStatus.PENDING_FIRST_PAYMENT;

    @Column(name = "company_data_completed", nullable = false)
    @Builder.Default
    private Boolean companyDataCompleted = false;

    @Column(name = "admin_approved", nullable = false)
    @Builder.Default
    private Boolean adminApproved = false;

    @Column(name = "first_payment_confirmed", nullable = false)
    @Builder.Default
    private Boolean firstPaymentConfirmed = false;

    @Column(name = "operational_access_released", nullable = false)
    @Builder.Default
    private Boolean operationalAccessReleased = false;

    @Column(name = "admin_approved_by", length = 50)
    private String adminApprovedBy;

    @Column(name = "admin_approved_at")
    private OffsetDateTime adminApprovedAt;

    @Column(name = "first_payment_confirmed_by", length = 50)
    private String firstPaymentConfirmedBy;

    @Column(name = "first_payment_confirmed_at")
    private OffsetDateTime firstPaymentConfirmedAt;

    @Column(name = "operational_access_released_by", length = 50)
    private String operationalAccessReleasedBy;

    @Column(name = "operational_access_released_at")
    private OffsetDateTime operationalAccessReleasedAt;

    @Column(name = "release_notes", length = 255)
    private String releaseNotes;
}
