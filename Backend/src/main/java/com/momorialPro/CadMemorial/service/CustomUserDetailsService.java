package com.momorialPro.CadMemorial.service;


import com.momorialPro.CadMemorial.repository.UserRepository;
import com.momorialPro.CadMemorial.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsernameIgnoreCase(username)
                .map(CustomUserDetails::new)   // ← aqui, nome da classe precisa ser idêntico
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }

    public UserDetails loadUserByUsernameAndTenantId(String username, UUID tenantId) throws UsernameNotFoundException {
        return userRepository.findByUsernameIgnoreCaseAndTenantId(username, tenantId)
                .or(() -> userRepository.findByEmailIgnoreCaseAndTenantId(username, tenantId))
                .map(CustomUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado para o tenant informado"));
    }
}
