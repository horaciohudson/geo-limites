package com.momorialPro.CadMemorial.repository;

import com.momorialPro.CadMemorial.model.EmailVerificationToken;
import com.momorialPro.CadMemorial.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findByTokenAndUsedAtIsNull(String token);
    Optional<EmailVerificationToken> findByToken(String token);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EmailVerificationToken e WHERE e.user = :user")
    void deleteByUser(@Param("user") User user);
}
