package com.momorialPro.CadMemorial.controller;

import com.momorialPro.CadMemorial.dto.admin.TenantOperationalActionRequest;
import com.momorialPro.CadMemorial.dto.admin.TenantOperationalAdminDTO;
import com.momorialPro.CadMemorial.dto.UserDTO;
import com.momorialPro.CadMemorial.service.TenantAdministrationService;
import com.momorialPro.CadMemorial.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/tenants")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TenantAdministrationController {

    private final TenantAdministrationService tenantAdministrationService;
    private final UserService userService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> listAllUsersGlobally() {
        return ResponseEntity.ok(userService.findAllGlobal());
    }

    @GetMapping("/operational")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TenantOperationalAdminDTO>> listOperationalTenants() {
        return ResponseEntity.ok(tenantAdministrationService.listOperationalTenants());
    }

    @GetMapping("/operational/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TenantOperationalAdminDTO> getTenantOperational(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(tenantAdministrationService.getTenantOperational(tenantId));
    }

    @PatchMapping("/operational/{tenantId}/admin-approval")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TenantOperationalAdminDTO> setAdminApproved(
            @PathVariable UUID tenantId,
            @RequestBody(required = false) TenantOperationalActionRequest request) {
        boolean value = request != null && Boolean.TRUE.equals(request.getValue());
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(tenantAdministrationService.setAdminApproved(tenantId, value, notes, getCurrentActor()));
    }

    @PatchMapping("/operational/{tenantId}/first-payment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TenantOperationalAdminDTO> setFirstPaymentConfirmed(
            @PathVariable UUID tenantId,
            @RequestBody(required = false) TenantOperationalActionRequest request) {
        boolean value = request != null && Boolean.TRUE.equals(request.getValue());
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(tenantAdministrationService.setFirstPaymentConfirmed(tenantId, value, notes, getCurrentActor()));
    }

    @PatchMapping("/operational/{tenantId}/release")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TenantOperationalAdminDTO> setOperationalAccessReleased(
            @PathVariable UUID tenantId,
            @RequestBody(required = false) TenantOperationalActionRequest request) {
        boolean value = request != null && Boolean.TRUE.equals(request.getValue());
        String notes = request != null ? request.getNotes() : null;
        return ResponseEntity.ok(tenantAdministrationService.setOperationalAccessReleased(tenantId, value, notes, getCurrentActor()));
    }

    private String getCurrentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return "SYSTEM";
        }
        return authentication.getName();
    }
}
