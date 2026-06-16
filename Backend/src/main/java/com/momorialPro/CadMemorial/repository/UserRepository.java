package com.momorialPro.CadMemorial.repository;



import com.momorialPro.CadMemorial.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByUsernameAndTenantId(String username, UUID tenantId);
    Optional<User> findByUsernameIgnoreCaseAndTenantId(String username, UUID tenantId);
    Optional<User> findByEmailIgnoreCaseAndTenantId(String email, UUID tenantId);
    List<User> findByEmailIgnoreCase(String email);
    List<User> findByTenantId(UUID tenantId);
    Optional<User> findByIdAndTenantId(UUID id, UUID tenantId);
    long countByTenantId(UUID tenantId);
}
