package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.ApiSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiSettingsRepository extends JpaRepository<ApiSettings, Short> {
}
