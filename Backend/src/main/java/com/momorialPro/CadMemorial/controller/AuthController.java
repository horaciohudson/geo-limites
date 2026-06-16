package com.momorialPro.CadMemorial.controller;




import com.momorialPro.CadMemorial.dto.AuthRequestDTO;
import com.momorialPro.CadMemorial.dto.AuthResponseDTO;
import com.momorialPro.CadMemorial.dto.ChangePasswordRequestDTO;
import com.momorialPro.CadMemorial.dto.MessageResponseDTO;
import com.momorialPro.CadMemorial.dto.RefreshTokenRequestDTO;
import com.momorialPro.CadMemorial.dto.RegisterRequestDTO;
import com.momorialPro.CadMemorial.dto.RegisterResponseDTO;
import com.momorialPro.CadMemorial.dto.ResendVerificationRequestDTO;
import com.momorialPro.CadMemorial.dto.UserDTO;
import com.momorialPro.CadMemorial.dto.UserProfileUpdateDTO;
import com.momorialPro.CadMemorial.dto.VerificationResponseDTO;
import com.momorialPro.CadMemorial.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Endpoints para autenticação e autorização")
public class AuthController {

    private final AuthService auth;

    @PostMapping("/register")
    @Operation(summary = "Registrar novo usuário", description = "Cria uma nova conta de usuário")
    public ResponseEntity<RegisterResponseDTO> register(@Valid @RequestBody RegisterRequestDTO dto){
        return ResponseEntity.ok(auth.register(dto));
    }

    @PostMapping("/login")
    @Operation(summary = "Fazer login", description = "Autentica usuário e retorna tokens JWT")
    public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody AuthRequestDTO dto){
        return ResponseEntity.ok(auth.login(dto));
    }

    @GetMapping("/verify")
    @Operation(summary = "Confirmar e-mail", description = "Valida o token de verificação da conta")
    public ResponseEntity<VerificationResponseDTO> verifyEmail(@RequestParam("token") String token) {
        return ResponseEntity.ok(auth.verifyEmail(token));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Reenviar e-mail de confirmacao", description = "Gera um novo token e envia um novo e-mail de confirmacao")
    public ResponseEntity<MessageResponseDTO> resendVerificationEmail(@Valid @RequestBody ResendVerificationRequestDTO dto) {
        return ResponseEntity.ok(auth.resendVerificationEmail(dto));
    }
    
    @PostMapping("/refresh")
    @Operation(summary = "Renovar token", description = "Renova o token JWT usando refresh token")
    public ResponseEntity<AuthResponseDTO> refreshToken(@Valid @RequestBody RefreshTokenRequestDTO dto) {
        return ResponseEntity.ok(auth.refreshToken(dto));
    }
    
    @PostMapping("/logout")
    @Operation(summary = "Fazer logout", description = "Revoga o refresh token do usuário")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequestDTO dto) {
        auth.logout(dto.getRefreshToken());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Obter usuário atual", description = "Retorna informações do usuário autenticado")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(auth.getCurrentUser(authentication));
    }

    @PutMapping("/profile")
    @Operation(summary = "Atualizar perfil do usuário atual", description = "Atualiza os dados cadastrais básicos do usuário autenticado")
    public ResponseEntity<UserDTO> updateProfile(@Valid @RequestBody UserProfileUpdateDTO dto) {
        return ResponseEntity.ok(auth.updateCurrentUserProfile(dto));
    }

    @PutMapping("/change-password")
    @Operation(summary = "Alterar senha do usuário atual", description = "Valida a senha atual e grava uma nova senha para o usuário autenticado")
    public ResponseEntity<MessageResponseDTO> changePassword(@Valid @RequestBody ChangePasswordRequestDTO dto) {
        return ResponseEntity.ok(auth.changeCurrentUserPassword(dto));
    }
}
