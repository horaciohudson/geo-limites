package com.momorialPro.CadMemorial.controller;



import com.momorialPro.CadMemorial.dto.MessageResponseDTO;
import com.momorialPro.CadMemorial.dto.AdminUserPasswordResetDTO;
import com.momorialPro.CadMemorial.dto.UserCreateDTO;
import com.momorialPro.CadMemorial.dto.UserDTO;
import com.momorialPro.CadMemorial.dto.UserUpdateDTO;
import com.momorialPro.CadMemorial.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<UserDTO> findById(@PathVariable UUID id) {
        UserDTO user = service.findById(id);
        return user != null ? ResponseEntity.ok(user) : ResponseEntity.notFound().build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> create(@Valid @RequestBody UserCreateDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> update(@PathVariable UUID id, @Valid @RequestBody UserUpdateDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponseDTO> resetPassword(@PathVariable UUID id, @Valid @RequestBody AdminUserPasswordResetDTO dto) {
        return ResponseEntity.ok(service.resetPassword(id, dto));
    }

    @PostMapping("/{id}/resend-verification")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponseDTO> resendVerification(@PathVariable UUID id) {
        return ResponseEntity.ok(service.resendVerification(id));
    }
}
