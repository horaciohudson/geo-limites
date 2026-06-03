package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.exception.BusinessException;
import com.momorialPro.CadMemorial.model.RefreshToken;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.RefreshTokenRepository;
import com.momorialPro.CadMemorial.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class RefreshTokenService {
    
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    public RefreshToken createRefreshToken(User user) {
        // Revoga todos os refresh tokens existentes do usuário
        refreshTokenRepository.revokeAllByUser(user);
        
        String token = jwtTokenProvider.generateRefreshToken();
        LocalDateTime expiryDate = LocalDateTime.now()
                .plusSeconds(jwtTokenProvider.getRefreshExpirationMs() / 1000);
        
        RefreshToken refreshToken = new RefreshToken(token, expiryDate, user);
        return refreshTokenRepository.save(refreshToken);
    }
    
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }
    
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.isExpired() || token.isRevoked()) {
            refreshTokenRepository.delete(token);
            throw new BusinessException("Refresh token expirado ou revogado. Faça login novamente.");
        }
        return token;
    }
    
    public void revokeByToken(String token) {
        refreshTokenRepository.revokeByToken(token);
    }
    
    public void revokeAllByUser(User user) {
        refreshTokenRepository.revokeAllByUser(user);
    }
    
    @Scheduled(fixedRate = 3600000) // Executa a cada hora
    public void deleteExpiredTokens() {
        refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
    }
}