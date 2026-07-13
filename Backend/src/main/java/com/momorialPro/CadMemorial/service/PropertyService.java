package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.FileMetadataDTO;
import com.momorialPro.CadMemorial.dto.PropertyLandmarkDTO;
import com.momorialPro.CadMemorial.mapper.PropertyLandmarkMapper;
import com.momorialPro.CadMemorial.dto.PropertySummaryDTO;
import com.momorialPro.CadMemorial.mapper.PropertyMapper;
import com.momorialPro.CadMemorial.model.FileMetadata;
import com.momorialPro.CadMemorial.model.Property;
import com.momorialPro.CadMemorial.model.PropertyLandmark;
import com.momorialPro.CadMemorial.model.User;
import com.momorialPro.CadMemorial.repository.FileMetadataRepository;
import com.momorialPro.CadMemorial.repository.PropertyLandmarkRepository;
import com.momorialPro.CadMemorial.repository.PropertyRepository;
import com.momorialPro.CadMemorial.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PropertyService {
    
    private final PropertyRepository propertyRepository;
    private final PropertyLandmarkRepository propertyLandmarkRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final PropertyMapper propertyMapper;
    private final PropertyLandmarkMapper propertyLandmarkMapper;
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

        return buildPropertyDtoWithFiles(property, tenantId);
    }

    @Transactional(readOnly = true)
    public PropertyDTO findByIdWithRelationships(UUID propertyId, UUID userId) {
        UUID tenantId = requireTenantId(userId);
        Property property = propertyRepository.findByIdWithRelationships(propertyId, userId, tenantId)
                .orElseThrow(() -> {
                    log.error("❌ Propriedade {} não encontrada para o usuário {}", propertyId, userId);
                    return new RuntimeException("Property not found");
                });

        return buildPropertyDtoWithFiles(property, tenantId);
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
        applyLandmarks(property, propertyDTO.getLandmarks());

        Property savedProperty = propertyRepository.save(property);
        replaceTechnicalFiles(savedProperty, propertyDTO.getDxfFiles(), persistedUser);

        return buildPropertyDtoWithFiles(savedProperty, persistedUser.getTenant().getId());
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
        replaceLandmarks(existingProperty, propertyDTO.getLandmarks());
        replaceTechnicalFiles(existingProperty, propertyDTO.getDxfFiles(), existingProperty.getUser());

        Property updatedProperty = propertyRepository.save(existingProperty);

        return buildPropertyDtoWithFiles(updatedProperty, tenantId);
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
                .total_files(property.getFiles() != null ? property.getFiles().size() : 0)
                .total_dxf_files(countTechnicalFiles(property))
                .dxf_files_list(buildTechnicalFilesList(property))
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

    private void replaceLandmarks(Property property, List<PropertyLandmarkDTO> landmarkDTOs) {
        propertyLandmarkRepository.deleteByPropertyPropertyId(property.getPropertyId());
        property.getLandmarks().clear();
        applyLandmarks(property, landmarkDTOs);
    }

    private PropertyDTO buildPropertyDtoWithFiles(Property property, UUID tenantId) {
        PropertyDTO dto = propertyMapper.toDTO(property);
        List<FileMetadata> linkedFiles = fileMetadataRepository
                .findByTenantIdAndPropertyPropertyIdOrderByCreatedAtDesc(tenantId, property.getPropertyId());

        dto.setDxfFiles(propertyMapper.mapTechnicalFiles(linkedFiles));
        dto.setOtherFiles(propertyMapper.mapOtherFiles(linkedFiles));
        return dto;
    }

    private void applyLandmarks(Property property, List<PropertyLandmarkDTO> landmarkDTOs) {
        if (landmarkDTOs == null || landmarkDTOs.isEmpty()) {
            return;
        }

        List<PropertyLandmark> landmarks = landmarkDTOs.stream()
                .filter(Objects::nonNull)
                .filter(dto -> dto.getLandmarkName() != null && !dto.getLandmarkName().trim().isEmpty())
                .filter(dto -> dto.getCoordinateX() != null && dto.getCoordinateY() != null)
                .map(propertyLandmarkMapper::toEntity)
                .peek(landmark -> landmark.setProperty(property))
                .collect(Collectors.toList());

        property.getLandmarks().addAll(landmarks);
    }

    private void replaceTechnicalFiles(Property property, List<FileMetadataDTO> fileDTOs, User user) {
        UUID tenantId = property.getTenant() != null ? property.getTenant().getId() : requireTenantId(user.getId());
        List<FileMetadataDTO> orderedFileDTOs = fileDTOs == null
                ? List.of()
                : fileDTOs.stream()
                        .filter(Objects::nonNull)
                        .filter(dto -> dto.getId() != null)
                        .collect(Collectors.toList());
        Set<UUID> desiredFileIds = fileDTOs == null
                ? Set.of()
                : orderedFileDTOs.stream()
                        .map(FileMetadataDTO::getId)
                        .collect(Collectors.toSet());
        UUID desiredPrimaryFileId = orderedFileDTOs.stream()
                .filter(dto -> Boolean.TRUE.equals(dto.getPrimaryForProperty()))
                .map(FileMetadataDTO::getId)
                .findFirst()
                .orElseGet(() -> orderedFileDTOs.stream()
                        .map(FileMetadataDTO::getId)
                        .findFirst()
                        .orElse(null));

        List<FileMetadata> currentlyLinkedFiles = fileMetadataRepository
                .findByTenantIdAndPropertyPropertyIdOrderByCreatedAtDesc(tenantId, property.getPropertyId());
        Set<UUID> currentlyLinkedFileIds = currentlyLinkedFiles.stream()
                .map(FileMetadata::getId)
                .collect(Collectors.toSet());

        currentlyLinkedFiles.stream()
                .filter(file -> !desiredFileIds.contains(file.getId()))
                .forEach(file -> {
                    file.setProperty(null);
                    file.setPrimaryForProperty(false);
                });

        if (desiredFileIds.isEmpty()) {
            if (!currentlyLinkedFiles.isEmpty()) {
                fileMetadataRepository.saveAll(currentlyLinkedFiles);
            }
            return;
        }

        List<FileMetadata> desiredFiles = fileMetadataRepository.findByIdInAndTenantId(desiredFileIds, tenantId).stream()
                .collect(Collectors.toList());

        if (desiredFiles.size() != desiredFileIds.size()) {
            throw new IllegalArgumentException("Um ou mais arquivos tecnicos informados nao pertencem ao usuario atual.");
        }

        List<FileMetadata> unauthorizedFiles = desiredFiles.stream()
                .filter(file -> {
                    boolean belongsToCurrentUser = file.getOwner() != null && Objects.equals(file.getOwner().getId(), user.getId());
                    boolean alreadyLinkedToProperty = currentlyLinkedFileIds.contains(file.getId());
                    return !belongsToCurrentUser && !alreadyLinkedToProperty;
                })
                .toList();

        if (!unauthorizedFiles.isEmpty()) {
            throw new IllegalArgumentException("Um ou mais arquivos tecnicos informados nao pertencem ao usuario atual.");
        }

        desiredFiles.stream()
                .filter(file -> file.getOwner() == null || !Objects.equals(file.getOwner().getId(), user.getId()))
                .filter(file -> currentlyLinkedFileIds.contains(file.getId()))
                .forEach(file -> log.warn(
                        "Mantendo arquivo tecnico legado {} vinculado ao imovel {} apesar de owner divergente/null. userAtual={}, ownerArquivo={}",
                        file.getId(),
                        property.getPropertyId(),
                        user.getId(),
                        file.getOwner() != null ? file.getOwner().getId() : null
                ));

        desiredFiles.forEach(file -> {
            file.setProperty(property);
            file.setPrimaryForProperty(Objects.equals(file.getId(), desiredPrimaryFileId));
        });
        fileMetadataRepository.saveAll(desiredFiles);
    }

    private int countTechnicalFiles(Property property) {
        if (property.getFiles() == null) {
            return 0;
        }

        return (int) property.getFiles().stream()
                .filter(this::isTechnicalFile)
                .count();
    }

    private String buildTechnicalFilesList(Property property) {
        if (property.getFiles() == null) {
            return "";
        }

        return property.getFiles().stream()
                .filter(this::isTechnicalFile)
                .map(FileMetadata::getOriginalName)
                .collect(Collectors.joining(", "));
    }

    private boolean isTechnicalFile(FileMetadata file) {
        String extension = file.getExtension() == null ? "" : file.getExtension().trim().toLowerCase();
        return "dxf".equals(extension) || "dwg".equals(extension);
    }
}
