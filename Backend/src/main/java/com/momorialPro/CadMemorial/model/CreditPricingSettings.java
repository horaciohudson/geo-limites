package com.momorialPro.CadMemorial.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "tab_credit_pricing_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditPricingSettings extends AuditBase {

    @Id
    @Column(name = "credit_pricing_id", updatable = false, nullable = false)
    private Short id;

    @Column(name = "welcome_credits", nullable = false)
    @Builder.Default
    private Integer welcomeCredits = 25;

    @Column(name = "single_lot_credit_cost", nullable = false)
    @Builder.Default
    private Integer singleLotCreditCost = 1;

    @Column(name = "small_project_max_lots", nullable = false)
    @Builder.Default
    private Integer smallProjectMaxLots = 5;

    @Column(name = "small_project_credit_cost", nullable = false)
    @Builder.Default
    private Integer smallProjectCreditCost = 3;

    @Column(name = "large_project_credit_cost", nullable = false)
    @Builder.Default
    private Integer largeProjectCreditCost = 10;

    @Column(name = "custom_price_per_credit", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal customPricePerCredit = new BigDecimal("2.50");

    @Column(name = "package_starter_name", nullable = false, length = 60)
    @Builder.Default
    private String packageStarterName = "Starter";

    @Column(name = "package_starter_base_credits", nullable = false)
    @Builder.Default
    private Integer packageStarterBaseCredits = 10;

    @Column(name = "package_starter_bonus_credits", nullable = false)
    @Builder.Default
    private Integer packageStarterBonusCredits = 0;

    @Column(name = "package_starter_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal packageStarterPrice = new BigDecimal("25.00");

    @Column(name = "package_starter_popular", nullable = false)
    @Builder.Default
    private Boolean packageStarterPopular = false;

    @Column(name = "package_basic_name", nullable = false, length = 60)
    @Builder.Default
    private String packageBasicName = "Profissional";

    @Column(name = "package_basic_base_credits", nullable = false)
    @Builder.Default
    private Integer packageBasicBaseCredits = 50;

    @Column(name = "package_basic_bonus_credits", nullable = false)
    @Builder.Default
    private Integer packageBasicBonusCredits = 5;

    @Column(name = "package_basic_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal packageBasicPrice = new BigDecimal("100.00");

    @Column(name = "package_basic_popular", nullable = false)
    @Builder.Default
    private Boolean packageBasicPopular = true;

    @Column(name = "package_professional_name", nullable = false, length = 60)
    @Builder.Default
    private String packageProfessionalName = "Empresarial";

    @Column(name = "package_professional_base_credits", nullable = false)
    @Builder.Default
    private Integer packageProfessionalBaseCredits = 100;

    @Column(name = "package_professional_bonus_credits", nullable = false)
    @Builder.Default
    private Integer packageProfessionalBonusCredits = 20;

    @Column(name = "package_professional_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal packageProfessionalPrice = new BigDecimal("180.00");

    @Column(name = "package_professional_popular", nullable = false)
    @Builder.Default
    private Boolean packageProfessionalPopular = false;

    @Column(name = "package_enterprise_name", nullable = false, length = 60)
    @Builder.Default
    private String packageEnterpriseName = "Corporativo";

    @Column(name = "package_enterprise_base_credits", nullable = false)
    @Builder.Default
    private Integer packageEnterpriseBaseCredits = 250;

    @Column(name = "package_enterprise_bonus_credits", nullable = false)
    @Builder.Default
    private Integer packageEnterpriseBonusCredits = 75;

    @Column(name = "package_enterprise_price", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal packageEnterprisePrice = new BigDecimal("400.00");

    @Column(name = "package_enterprise_popular", nullable = false)
    @Builder.Default
    private Boolean packageEnterprisePopular = false;
}
