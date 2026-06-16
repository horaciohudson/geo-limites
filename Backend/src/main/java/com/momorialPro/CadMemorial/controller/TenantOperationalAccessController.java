package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.admin.TenantOperationalAdminDTO;
import com.momorialPro.CadMemorial.service.TenantAdministrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tenant-access")
@RequiredArgsConstructor
public class TenantOperationalAccessController {

    private final TenantAdministrationService tenantAdministrationService;

    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TenantOperationalAdminDTO> getCurrentTenantOperational() {
        return ResponseEntity.ok(tenantAdministrationService.getCurrentTenantOperational());
    }
}
