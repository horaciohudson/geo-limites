package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.CadSystemSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CadSystemSettingsRepository extends JpaRepository<CadSystemSettings, Short> {
}
