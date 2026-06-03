package com.momorialPro.CadMemorial.mapper;


import com.momorialPro.CadMemorial.dto.UserCreateDTO;
import com.momorialPro.CadMemorial.dto.UserDTO;
import com.momorialPro.CadMemorial.dto.UserRoleDTO;
import com.momorialPro.CadMemorial.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserDTO toDTO(User entity) {
        if (entity == null) return null;
        return UserDTO.builder()
                .id(entity.getId())
                .username(entity.getUsername())
                .email(entity.getEmail())
                .fullName(entity.getFullName())
                .corporateName(entity.getCorporateName())
                .tradeName(entity.getTradeName())
                .cnpj(entity.getCnpj())
                .stateRegistration(entity.getStateRegistration())
                .municipalRegistration(entity.getMunicipalRegistration())
                .phone(entity.getPhone())
                .mobile(entity.getMobile())
                .whatsapp(entity.getWhatsapp())
                .manager(entity.getManager())
                .address(entity.getAddress())
                .district(entity.getDistrict())
                .city(entity.getCity())
                .state(entity.getState())
                .zipCode(entity.getZipCode())
                .tenantId(entity.getTenant() != null ? entity.getTenant().getId() : null)
                .tenantCode(entity.getTenant() != null ? entity.getTenant().getCode() : null)
                .active(entity.getActive())
                .verified(entity.getVerified())
                .roles(entity.getRoles().stream()
                        .map(role -> new UserRoleDTO(role.getName().name()))
                        .toList())
                .build();
    }

    public User toEntity(UserCreateDTO dto) {
        if (dto == null) return null;
        return User.builder()
                .username(dto.getUsername())
                .email(dto.getEmail())
                .password(dto.getPassword())
                .fullName(dto.getFullName())
                .active(true)
                .verified(Boolean.TRUE.equals(dto.getVerified()))
                .build();
    }
}
