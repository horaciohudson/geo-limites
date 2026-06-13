package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.CreditPricingSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreditPricingSettingsRepository extends JpaRepository<CreditPricingSettings, Short> {
}
