package com.momorialPro.CadMemorial.repository;



import com.momorialPro.CadMemorial.enums.RoleName;
import com.momorialPro.CadMemorial.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(RoleName name);
}