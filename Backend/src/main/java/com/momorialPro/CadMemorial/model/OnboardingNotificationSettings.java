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
@Table(name = "tab_onboarding_notification_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnboardingNotificationSettings extends AuditBase {

    @Id
    @Column(name = "onboarding_notification_settings_id", updatable = false, nullable = false)
    private Short id;

    @Column(name = "responsible_name", length = 150)
    private String responsibleName;

    @Column(name = "responsible_email", length = 255)
    private String responsibleEmail;

    @Column(name = "alternate_email", length = 255)
    private String alternateEmail;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "whatsapp", length = 30)
    private String whatsapp;

    @Column(name = "manual_approval_enabled", nullable = false)
    @Builder.Default
    private Boolean manualApprovalEnabled = true;

    @Column(name = "notify_on_signup_created", nullable = false)
    @Builder.Default
    private Boolean notifyOnSignupCreated = false;

    @Column(name = "notify_on_email_verified", nullable = false)
    @Builder.Default
    private Boolean notifyOnEmailVerified = false;

    @Column(name = "notify_on_pending_approval", nullable = false)
    @Builder.Default
    private Boolean notifyOnPendingApproval = true;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
