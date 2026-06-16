package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.SmtpSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SmtpSettingsRepository extends JpaRepository<SmtpSettings, Short> {
}
