package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateOnboardingNotificationSettingsRequest {

    @Size(max = 150)
    private String responsibleName;

    @Email
    @Size(max = 255)
    private String responsibleEmail;

    @Email
    @Size(max = 255)
    private String alternateEmail;

    @Size(max = 30)
    private String phone;

    @Size(max = 30)
    private String whatsapp;

    private Boolean manualApprovalEnabled;
    private Boolean notifyOnSignupCreated;
    private Boolean notifyOnEmailVerified;
    private Boolean notifyOnPendingApproval;
    private Boolean active;
}
