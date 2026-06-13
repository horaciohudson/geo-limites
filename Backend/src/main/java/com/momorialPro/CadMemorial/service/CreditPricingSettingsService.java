package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.CreditPackageDTO;
import com.momorialPro.CadMemorial.dto.CreditPricingSettingsDTO;
import com.momorialPro.CadMemorial.dto.UpdateCreditPackageRequest;
import com.momorialPro.CadMemorial.dto.UpdateCreditPricingSettingsRequest;
import com.momorialPro.CadMemorial.model.CreditPricingSettings;
import com.momorialPro.CadMemorial.repository.CreditPricingSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class CreditPricingSettingsService {

    private static final Short SINGLETON_ID = 1;
    private static final List<String> PACKAGE_ORDER = List.of("starter", "basic", "professional", "enterprise");

    private final CreditPricingSettingsRepository repository;

    @Transactional(readOnly = true)
    public CreditPricingSettingsDTO getSettings() {
        return toDTO(getOrCreateEntity());
    }

    @Transactional
    public CreditPricingSettingsDTO updateSettings(UpdateCreditPricingSettingsRequest request) {
        CreditPricingSettings entity = getOrCreateEntity();

        entity.setWelcomeCredits(request.getWelcomeCredits());
        entity.setSingleLotCreditCost(request.getSingleLotCreditCost());
        entity.setSmallProjectMaxLots(request.getSmallProjectMaxLots());
        entity.setSmallProjectCreditCost(request.getSmallProjectCreditCost());
        entity.setLargeProjectCreditCost(request.getLargeProjectCreditCost());
        entity.setCustomPricePerCredit(scaleMoney(request.getCustomPricePerCredit()));

        Map<String, UpdateCreditPackageRequest> packagesById = request.getPackages().stream()
                .collect(java.util.stream.Collectors.toMap(
                        item -> normalizePackageId(item.getId()),
                        Function.identity(),
                        (first, second) -> second
                ));

        for (String packageId : PACKAGE_ORDER) {
            UpdateCreditPackageRequest packageRequest = packagesById.get(packageId);
            if (packageRequest == null) {
                throw new IllegalArgumentException("Pacote obrigatorio ausente: " + packageId);
            }
            applyPackage(entity, packageId, packageRequest);
        }

        repository.save(entity);
        return toDTO(entity);
    }

    @Transactional(readOnly = true)
    public CreditPricingSettings getOrCreateEntity() {
        return repository.findById(SINGLETON_ID)
                .orElseGet(() -> repository.save(CreditPricingSettings.builder().id(SINGLETON_ID).build()));
    }

    @Transactional(readOnly = true)
    public List<CreditPackageDTO> getPackages() {
        return toDTO(getOrCreateEntity()).getPackages();
    }

    @Transactional(readOnly = true)
    public CreditPackageDTO findPackageById(String packageId) {
        return getPackages().stream()
                .filter(pkg -> pkg.getId().equals(normalizePackageId(packageId)))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Pacote de credito invalido."));
    }

    private void applyPackage(CreditPricingSettings entity, String packageId, UpdateCreditPackageRequest request) {
        switch (packageId) {
            case "starter" -> {
                entity.setPackageStarterName(request.getName().trim());
                entity.setPackageStarterBaseCredits(request.getBaseCredits());
                entity.setPackageStarterBonusCredits(request.getBonusCredits());
                entity.setPackageStarterPrice(scaleMoney(request.getPrice()));
                entity.setPackageStarterPopular(request.getPopular());
            }
            case "basic" -> {
                entity.setPackageBasicName(request.getName().trim());
                entity.setPackageBasicBaseCredits(request.getBaseCredits());
                entity.setPackageBasicBonusCredits(request.getBonusCredits());
                entity.setPackageBasicPrice(scaleMoney(request.getPrice()));
                entity.setPackageBasicPopular(request.getPopular());
            }
            case "professional" -> {
                entity.setPackageProfessionalName(request.getName().trim());
                entity.setPackageProfessionalBaseCredits(request.getBaseCredits());
                entity.setPackageProfessionalBonusCredits(request.getBonusCredits());
                entity.setPackageProfessionalPrice(scaleMoney(request.getPrice()));
                entity.setPackageProfessionalPopular(request.getPopular());
            }
            case "enterprise" -> {
                entity.setPackageEnterpriseName(request.getName().trim());
                entity.setPackageEnterpriseBaseCredits(request.getBaseCredits());
                entity.setPackageEnterpriseBonusCredits(request.getBonusCredits());
                entity.setPackageEnterprisePrice(scaleMoney(request.getPrice()));
                entity.setPackageEnterprisePopular(request.getPopular());
            }
            default -> throw new IllegalArgumentException("Pacote de credito invalido: " + packageId);
        }
    }

    private CreditPricingSettingsDTO toDTO(CreditPricingSettings entity) {
        return CreditPricingSettingsDTO.builder()
                .welcomeCredits(entity.getWelcomeCredits())
                .singleLotCreditCost(entity.getSingleLotCreditCost())
                .smallProjectMaxLots(entity.getSmallProjectMaxLots())
                .smallProjectCreditCost(entity.getSmallProjectCreditCost())
                .largeProjectCreditCost(entity.getLargeProjectCreditCost())
                .customPricePerCredit(entity.getCustomPricePerCredit())
                .packages(List.of(
                        buildPackage("starter", entity.getPackageStarterName(), entity.getPackageStarterBaseCredits(), entity.getPackageStarterBonusCredits(), entity.getPackageStarterPrice(), entity.getPackageStarterPopular()),
                        buildPackage("basic", entity.getPackageBasicName(), entity.getPackageBasicBaseCredits(), entity.getPackageBasicBonusCredits(), entity.getPackageBasicPrice(), entity.getPackageBasicPopular()),
                        buildPackage("professional", entity.getPackageProfessionalName(), entity.getPackageProfessionalBaseCredits(), entity.getPackageProfessionalBonusCredits(), entity.getPackageProfessionalPrice(), entity.getPackageProfessionalPopular()),
                        buildPackage("enterprise", entity.getPackageEnterpriseName(), entity.getPackageEnterpriseBaseCredits(), entity.getPackageEnterpriseBonusCredits(), entity.getPackageEnterprisePrice(), entity.getPackageEnterprisePopular())
                ))
                .build();
    }

    private CreditPackageDTO buildPackage(
            String id,
            String name,
            Integer baseCredits,
            Integer bonusCredits,
            BigDecimal price,
            Boolean popular
    ) {
        int totalCredits = (baseCredits != null ? baseCredits : 0) + (bonusCredits != null ? bonusCredits : 0);
        BigDecimal safePrice = price != null ? scaleMoney(price) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal pricePerCredit = totalCredits > 0
                ? safePrice.divide(BigDecimal.valueOf(totalCredits), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        return CreditPackageDTO.builder()
                .id(id)
                .name(name)
                .baseCredits(baseCredits)
                .bonusCredits(bonusCredits)
                .totalCredits(totalCredits)
                .price(safePrice)
                .pricePerCredit(pricePerCredit)
                .popular(Boolean.TRUE.equals(popular))
                .build();
    }

    private String normalizePackageId(String packageId) {
        return packageId == null ? "" : packageId.trim().toLowerCase(Locale.ROOT);
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
