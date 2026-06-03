package com.momorialPro.CadMemorial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileUpdateDTO {

    @NotBlank
    private String fullName;

    @NotBlank
    @Email
    private String email;

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
}
