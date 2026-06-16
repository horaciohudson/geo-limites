package com.momorialPro.CadMemorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingNotificationSettingsDTO {
    private String responsibleName;
    private String responsibleEmail;
    private String alternateEmail;
    private String phone;
    private String whatsapp;
    private boolean manualApprovalEnabled;
    private boolean notifyOnSignupCreated;
    private boolean notifyOnEmailVerified;
    private boolean notifyOnPendingApproval;
    private boolean active;
}
