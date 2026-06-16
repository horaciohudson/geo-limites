package com.momorialPro.CadMemorial.dto;



import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreateDTO {

    @NotBlank
    private String username;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    private String fullName;

    @Builder.Default
    private String roleName = "ROLE_USER";

    @Builder.Default
    private Boolean verified = false;

    @Builder.Default
    private Boolean sendVerificationEmail = true;
}
