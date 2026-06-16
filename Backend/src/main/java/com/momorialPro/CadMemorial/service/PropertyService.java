package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.PropertySummaryDTO;
import com.momorialPro.CadMemorial.mapper.PropertyMapper;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.PropertyRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PropertyService {
    
    private final PropertyRepository propertyRepository;
    private final PropertyMapper propertyMapper;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PropertyDTO> findByUserId(UUID userId) {
        UUID tenantId = requireTenantId(userId);
        List<Property> properties = propertyRepository.findByTenantIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(tenantId, userId);

        return properties.stream()
                .map(propertyMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PropertyDTO findByIdAndUserId(UUID propertyId, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        Property property = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> {
                    log.error("❌ Propriedade {} não encontrada para o usuário {}", propertyId, userId);
                    return new RuntimeException("Property not found");
                });

        return propertyMapper.toDTO(property);
    }

    @Transactional(readOnly = true)
    public PropertyDTO findByIdWithRelationships(UUID propertyId, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        Property property = propertyRepository.findByIdWithRelationships(propertyId, userId, tenantId)
                .orElseThrow(() -> {
                    log.error("❌ Propriedade {} não encontrada para o usuário {}", propertyId, userId);
                    return new RuntimeException("Property not found");
                });

        return propertyMapper.toDTO(property);
    }

    public PropertyDTO create(PropertyDTO propertyDTO, UUID userId) {
        Property property = propertyMapper.toEntity(propertyDTO);
        User persistedUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Set default values
        property.setActive(true);
        if (property.getCoordinateSystem() == null) {
            property.setCoordinateSystem("SIRGAS 2000 / UTM zone 23S");
        }
        if (property.getDatum() == null) {
            property.setDatum("SIRGAS 2000");
        }
        if (property.getUtmZone() == null) {
            property.setUtmZone("23S");
        }
        if (property.getCentralMeridian() == null) {
            property.setCentralMeridian("-45°");
        }
        if (property.getPropertyType() == null) {
            property.setPropertyType("URBAN");
        }

        property.setUser(persistedUser);
        property.setTenant(persistedUser.getTenant());

        Property savedProperty = propertyRepository.save(property);

        return propertyMapper.toDTO(savedProperty);
    }

    public PropertyDTO update(UUID propertyId, PropertyDTO propertyDTO, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        Property existingProperty = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> {
                    log.error("❌ Propriedade {} não encontrada para o usuário {}", propertyId, userId);
                    return new RuntimeException("Property not found");
                });
        
        // Update fields
        propertyMapper.updateEntityFromDTO(propertyDTO, existingProperty);

        Property updatedProperty = propertyRepository.save(existingProperty);

        return propertyMapper.toDTO(updatedProperty);
    }

    public void delete(UUID propertyId, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        Property property = propertyRepository.findByPropertyIdAndTenantIdAndUserIdAndActiveTrue(propertyId, tenantId, userId)
                .orElseThrow(() -> {
                    log.error("❌ Propriedade {} não encontrada para o usuário {}", propertyId, userId);
                    return new RuntimeException("Property not found");
                });
        
        // Soft delete
        property.setActive(false);
        propertyRepository.save(property);
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> searchByName(String name, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        List<Property> properties = propertyRepository.findByNameContainingIgnoreCaseAndTenantIdAndUserIdAndActiveTrue(name, tenantId, userId);

        return properties.stream()
                .map(propertyMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> searchByOwnerName(String ownerName, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        List<Property> properties = propertyRepository.findByOwnerNameContainingIgnoreCaseAndTenantIdAndUserIdAndActiveTrueOrderByName(ownerName, tenantId, userId);

        return properties.stream()
                .map(propertyMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> searchByLocation(String city, String state, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        List<Property> properties = propertyRepository.findByCityIgnoreCaseAndStateIgnoreCaseAndTenantIdAndUserIdAndActiveTrueOrderByName(city, state, tenantId, userId);

        return properties.stream()
                .map(propertyMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countByUserId(UUID userId) {
        UUID tenantId = requireTenantId(userId);
        return propertyRepository.countByTenantIdAndUserIdAndActiveTrue(tenantId, userId);
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> findRecentByUser(UUID userId) {
        UUID tenantId = requireTenantId(userId);
        List<Property> properties = propertyRepository.findRecentByUser(userId, tenantId);

        return properties.stream()
                .limit(10) // Limit to 10 most recent
                .map(propertyMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertySummaryDTO> getPropertiesSummary(UUID userId) {
        UUID tenantId = requireTenantId(userId);
        List<Property> properties = propertyRepository.findByTenantIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(tenantId, userId);

        return properties.stream()
                .map(this::convertToSummary)
                .collect(Collectors.toList());
    }
    
    private PropertySummaryDTO convertToSummary(Property property) {
        // Montar endereço completo
        String fullAddress = String.format("%s, %s - %s, %s - %s",
                property.getStreet() != null ? property.getStreet() : "",
                property.getNumber() != null ? property.getNumber() : "",
                property.getNeighborhood() != null ? property.getNeighborhood() : "",
                property.getCity() != null ? property.getCity() : "",
                property.getState() != null ? property.getState() : ""
        ).replaceAll(", - ", " - ").replaceAll("^, |, $", "");
        
        // Determinar status de completude
        String completenessStatus = "INCOMPLETO";
        if (property.getRegistrationNumber() != null && 
            property.getStreet() != null && 
            property.getOwnerName() != null) {
            completenessStatus = "COMPLETO";
        }
        
        return PropertySummaryDTO.builder()
                .property_id(property.getPropertyId().toString())
                .registration_number(property.getRegistrationNumber())
                .name(property.getName())
                .property_type(property.getPropertyType() != null ? property.getPropertyType().toString() : "URBAN")
                .full_address(fullAddress)
                .owner_name(property.getOwnerName())
                .owner_document(property.getOwnerDocument())
                .total_owners(1)
                .total_documents(0)
                .total_files(0)
                .total_dxf_files(0) // TODO: Implementar contagem de arquivos DXF
                .dxf_files_list("") // TODO: Implementar lista de arquivos DXF
                .completeness_status(completenessStatus)
                .created_at(property.getCreatedAt())
                .updated_at(property.getUpdatedAt())
                .build();
    }

    private UUID requireTenantId(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getTenant() == null || user.getTenant().getId() == null) {
            throw new IllegalStateException("Tenant do usuário não configurado");
        }
        return user.getTenant().getId();
    }
}
