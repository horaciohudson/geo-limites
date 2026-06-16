package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.OnboardingNotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OnboardingNotificationSettingsRepository extends JpaRepository<OnboardingNotificationSettings, Short> {
}
