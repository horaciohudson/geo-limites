package com.momorialPro.CadMemorial.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private String corporateName;
    private String tradeName;
    private String cnpj;
    private String stateRegistration;
    private String municipalRegistration;
    private String phone;
    private String mobile;
    private String whatsapp;
    private String manager;
    private String address;
    private String district;
    private String city;
    private String state;
    private String zipCode;
    private UUID tenantId;
    private String tenantCode;
    private Boolean active;
    private Boolean verified;
    private List<UserRoleDTO> roles;
}
