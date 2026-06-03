package com.momorialPro.CadMemorial.service;

import com.momorialPro.CadMemorial.dto.PropertyDTO;
import com.momorialPro.CadMemorial.dto.MemorialStandardDTO;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Serviço para templates legais profissionais
 * PRIORIDADE 2 e 3 - PLANO DE MELHORIAS
 */
@Service
public class LegalTemplateService {

    /**
     * Gera preâmbulo legal completo
     */
    public String generateLegalPreamble(PropertyDTO property, MemorialStandardDTO standard) {
        StringBuilder preamble = new StringBuilder();
        
        // Cabeçalho oficial
        preamble.append("MEMORIAL DESCRITIVO\n");
        preamble.append("Documento assinado no Assinador Registro de Imóveis.\n\n");
        
        // Dados básicos
        preamble.append("Terreno: Urbano\n");
        
        if (property != null) {
            if (property.getOwnerName() != null) {
                preamble.append("Proprietário: ").append(property.getOwnerName()).append("\n");
            }
            
            if (property.getStreet() != null) {
                preamble.append("Localização: ").append(property.getStreet());
                if (property.getNeighborhood() != null) {
                    preamble.append(" | Bairro: ").append(property.getNeighborhood());
                }
                if (property.getCity() != null && property.getState() != null) {
                    preamble.append(" | Município: ").append(property.getCity()).append("/").append(property.getState());
                }
                preamble.append("\n");
            }
        }
        
        // Objetivo técnico
        preamble.append("Objetivo: Levantamento topográfico planimétrico de imóvel urbano ");
        preamble.append("georreferenciado no Datum Sirgas 2000 para fins de instrução técnica e registral.\n\n");
        
        // Situação antes - USANDO DADOS REAIS DA PROPRIEDADE
        preamble.append("SITUAÇÃO ANTES DESTE DESMEMBRAMENTO DE ÁREA\n\n");
        preamble.append("TERRENO 1\n");
        preamble.append("Um imóvel urbano, localizado na ");
        
        if (property != null && property.getStreet() != null) {
            preamble.append(property.getStreet().toUpperCase());
        } else {
            preamble.append("[LOGRADOURO NAO INFORMADO]");
        }
        
        if (property != null && property.getNeighborhood() != null) {
            preamble.append(", bairro ").append(property.getNeighborhood());
        } else {
            preamble.append(", bairro [NAO INFORMADO]");
        }
        
        if (property != null && property.getCity() != null && property.getState() != null) {
            preamble.append(", ").append(property.getCity()).append("/").append(property.getState());
        } else {
            preamble.append(", [MUNICIPIO/UF NAO INFORMADO]");
        }
        
        preamble.append(", possuindo formato poligonal e irregular, conforme seus pontos ");
        
        // COORDENADAS REAIS DO TERRENO ORIGINAL
        if (property != null && property.getSirgas_e() != null && property.getSirgas_n() != null) {
            double baseE = property.getSirgas_e().doubleValue();
            double baseN = property.getSirgas_n().doubleValue();
            preamble.append(generateOriginalTerrainCoordinates(baseE, baseN));
        } else {
            preamble.append("P01 e demais vertices conforme levantamento planimetrico georreferenciado disponivel");
        }
        
        preamble.append(", perfazendo assim, um perímetro de ");
        
        // PERÍMETRO REAL
        if (property != null && property.getTotalPerimeter() != null) {
            preamble.append(String.format("%.2fm", property.getTotalPerimeter())).append(" ");
            preamble.append("(").append(extenso(property.getTotalPerimeter().doubleValue())).append(")");
        } else {
            preamble.append("[PERIMETRO NAO INFORMADO]");
        }
        
        preamble.append(" e uma área territorial total de ");
        
        // ÁREA TOTAL REAL
        if (property != null && property.getTotalArea() != null) {
            preamble.append(String.format("%.2fm²", property.getTotalArea())).append(" ");
            preamble.append("(").append(extensoArea(property.getTotalArea().doubleValue())).append(")");
        } else {
            preamble.append("[AREA TOTAL NAO INFORMADA]");
        }
        
        preamble.append(", com as seguintes medidas e confrontações:\n\n");
        
        // CONFRONTAÇÕES DO TERRENO ORIGINAL
        preamble.append(generateOriginalConfrontations(property));
        
        preamble.append("\n__________________________________________\n\n");
        preamble.append("SITUAÇÃO DEPOIS DESTE DESMEMBRAMENTO DE ÁREA\n\n");
        
        return preamble.toString();
    }
    
    /**
     * Gera coordenadas do terreno original (7 pontos do perímetro)
     */
    private String generateOriginalTerrainCoordinates(double baseE, double baseN) {
        StringBuilder coords = new StringBuilder();
        coords.append(String.format(Locale.US, "P01 (coordenadas E %.2fm e N %.2fm)", baseE, baseN));
        coords.append(", e demais vertices conforme arquivo georreferenciado e cadastro tecnico");
        
        return coords.toString();
    }
    
    /**
     * Gera confrontações do terreno original
     */
    private String generateOriginalConfrontations(PropertyDTO property) {
        StringBuilder conf = new StringBuilder();
        
        String norte = property != null && property.getNorthBoundary() != null ? 
                       property.getNorthBoundary() : "[CONFRONTANTE NORTE NAO INFORMADO]";
        String sul = property != null && property.getSouthBoundary() != null ? 
                     property.getSouthBoundary() : "[CONFRONTANTE SUL NAO INFORMADO]";
        String leste = property != null && property.getEastBoundary() != null ? 
                       property.getEastBoundary() : "[CONFRONTANTE LESTE NAO INFORMADO]";
        String oeste = property != null && property.getWestBoundary() != null ? 
                       property.getWestBoundary() : "[CONFRONTANTE OESTE NAO INFORMADO]";
        
        conf.append("AO NORTE: confrontando com ").append(norte).append(", conforme levantamento técnico.\n");
        conf.append("AO SUL: confrontando com ").append(sul).append(", conforme levantamento técnico.\n");
        conf.append("AO LESTE: confrontando com ").append(leste).append(", conforme levantamento técnico.\n");
        conf.append("AO OESTE: confrontando com ").append(oeste).append(", conforme levantamento técnico.\n");
        
        return conf.toString();
    }
    
    /**
     * Converte valor numérico para extenso (metros)
     */
    private String extenso(double valor) {
        int inteiro = (int) valor;
        int decimal = (int) Math.round((valor - inteiro) * 100);
        
        String[] unidades = {"", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"};
        String[] especiais = {"dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"};
        String[] dezenas = {"", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"};
        String[] centenas = {"", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"};
        
        StringBuilder result = new StringBuilder();
        
        if (inteiro >= 1000) {
            int milhares = inteiro / 1000;
            if (milhares == 1) {
                result.append("mil");
            } else {
                result.append(unidades[milhares]).append(" mil");
            }
            inteiro = inteiro % 1000;
            if (inteiro > 0) result.append(" ");
        }
        
        if (inteiro >= 100) {
            if (inteiro == 100) {
                result.append("cem");
            } else {
                result.append(centenas[inteiro / 100]);
            }
            inteiro = inteiro % 100;
            if (inteiro > 0) result.append(" e ");
        }
        
        if (inteiro >= 20) {
            result.append(dezenas[inteiro / 10]);
            inteiro = inteiro % 10;
            if (inteiro > 0) result.append(" e ");
        } else if (inteiro >= 10) {
            result.append(especiais[inteiro - 10]);
            inteiro = 0;
        }
        
        if (inteiro > 0 && inteiro < 10) {
            result.append(unidades[inteiro]);
        }
        
        result.append(" metros");
        
        if (decimal > 0) {
            result.append(" e ").append(extensoDecimal(decimal)).append(" centímetros");
        }
        
        return result.toString();
    }
    
    private String extensoDecimal(int decimal) {
        String[] unidades = {"", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"};
        String[] especiais = {"dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"};
        String[] dezenas = {"", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"};
        
        if (decimal >= 20) {
            String result = dezenas[decimal / 10];
            int unidade = decimal % 10;
            if (unidade > 0) {
                result += " e " + unidades[unidade];
            }
            return result;
        } else if (decimal >= 10) {
            return especiais[decimal - 10];
        } else {
            return unidades[decimal];
        }
    }
    
    /**
     * Converte valor numérico para extenso (metros quadrados)
     */
    private String extensoArea(double valor) {
        int inteiro = (int) valor;
        int decimal = (int) Math.round((valor - inteiro) * 100);
        
        String[] unidades = {"", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"};
        String[] especiais = {"dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"};
        String[] dezenas = {"", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"};
        String[] centenas = {"", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"};
        
        StringBuilder result = new StringBuilder();
        
        if (inteiro >= 1000) {
            int milhares = inteiro / 1000;
            if (milhares == 1) {
                result.append("mil");
            } else {
                result.append(unidades[milhares]).append(" mil");
            }
            inteiro = inteiro % 1000;
            if (inteiro > 0) result.append(" ");
        }
        
        if (inteiro >= 100) {
            if (inteiro == 100) {
                result.append("cem");
            } else {
                result.append(centenas[inteiro / 100]);
            }
            inteiro = inteiro % 100;
            if (inteiro > 0) result.append(" e ");
        }
        
        if (inteiro >= 20) {
            result.append(dezenas[inteiro / 10]);
            inteiro = inteiro % 10;
            if (inteiro > 0) result.append(" e ");
        } else if (inteiro >= 10) {
            result.append(especiais[inteiro - 10]);
            inteiro = 0;
        }
        
        if (inteiro > 0 && inteiro < 10) {
            result.append(unidades[inteiro]);
        }
        
        result.append(" metros quadrados");
        
        return result.toString();
    }

    /**
     * Gera confrontações detalhadas para um lote
     */
    public String generateDetailedConfrontations(int loteNumber, 
                                               Map<String, String> confrontationData,
                                               List<String> streetNames) {
        StringBuilder confrontations = new StringBuilder();
        
        // Determinar confrontações baseadas na posição do lote
        String norte = determineNorthConfrontation(loteNumber, confrontationData, streetNames);
        String sul = determineSouthConfrontation(loteNumber, confrontationData, streetNames);
        String leste = determineEastConfrontation(loteNumber, confrontationData);
        String oeste = determineWestConfrontation(loteNumber, confrontationData);
        
        // Formato profissional detalhado
        confrontations.append("AO NORTE: (fundos), com medida a ser preenchida conforme levantamento, partindo do ponto P").append(String.format("%02d", getPointNumber(loteNumber, "NW")));
        confrontations.append(", segue até o ponto P").append(String.format("%02d", getPointNumber(loteNumber, "NE")));
        confrontations.append(", limitando-se com ").append(norte).append(".\n\n");
        
        confrontations.append("AO SUL: (frente), com medida a ser preenchida conforme levantamento, partindo do ponto P").append(String.format("%02d", getPointNumber(loteNumber, "SW")));
        confrontations.append(", segue até o ponto P").append(String.format("%02d", getPointNumber(loteNumber, "SE")));
        confrontations.append(", limitando-se com ").append(sul).append(".\n\n");
        
        confrontations.append("AO LESTE: (lateral esquerda), com medida a ser preenchida conforme levantamento, partindo do ponto P").append(String.format("%02d", getPointNumber(loteNumber, "SE")));
        confrontations.append(", segue até o ponto P").append(String.format("%02d", getPointNumber(loteNumber, "NE")));
        confrontations.append(", limitando-se com ").append(leste).append(".\n\n");
        
        confrontations.append("AO OESTE: (lateral direita), com medida a ser preenchida conforme levantamento, partindo do ponto P").append(String.format("%02d", getPointNumber(loteNumber, "SW")));
        confrontations.append(", segue até o ponto P").append(String.format("%02d", getPointNumber(loteNumber, "NW")));
        confrontations.append(", limitando-se com ").append(oeste).append(".");
        
        return confrontations.toString();
    }

    /**
     * Gera declaração final legal
     */
    public String generateLegalDeclaration(PropertyDTO property) {
        StringBuilder declaration = new StringBuilder();
        
        declaration.append("DECLARAÇÃO\n\n");
        declaration.append("Declaro para todos os fins e efeitos de direito que o levantamento ");
        declaration.append("topográfico respeitou as divisas consolidadas e o alinhamento do ");
        declaration.append("logradouro público, importando sujeitar-se ao que dispõe o § 14, ");
        declaration.append("do artigo 213, da LRP. Verificado a qualquer tempo não serem ");
        declaration.append("verdadeiros os fatos constantes no memorial descritivo, responderão ");
        declaration.append("o requerente e o profissional que o elaborou pelos prejuízos causados, ");
        declaration.append("independentemente das sanções disciplinares e penais.\n\n");
        
        // Data e local
        String cidade = property != null && property.getCity() != null ? 
                       property.getCity() : "Horizonte";
        
        LocalDate hoje = LocalDate.now();
        String dataFormatada = hoje.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", 
                                                                       new Locale("pt", "BR")));
        
        declaration.append(cidade).append(", ").append(dataFormatada).append(".\n\n");
        
        // Assinatura profissional - extrair das observações ou usar dados padrão
        ProfessionalData profData = extractProfessionalData(property);
        
        declaration.append("_________________________________________________\n");
        declaration.append(profData.nome);
        declaration.append(" | CREA/").append(profData.estado).append(": ").append(profData.crea);
        declaration.append(" | RNP: ").append(profData.rnp).append("\n\n");
        
        return declaration.toString();
    }
    
    /**
     * Classe interna para dados profissionais
     */
    private static class ProfessionalData {
        String nome = "Eng. Responsável Técnico";
        String crea = "000000-D";
        String estado = "CE";
        String rnp = "CE00000000000";
        
        @Override
        public String toString() {
            return nome + " | CREA/" + estado + ": " + crea + " | RNP: " + rnp;
        }
    }
    
    /**
     * Extrai dados profissionais das observações da propriedade ou usa padrões
     */
    private ProfessionalData extractProfessionalData(PropertyDTO property) {
        ProfessionalData data = new ProfessionalData();
        
        if (property == null || property.getObservations() == null) {
            return data;
        }
        
        String obs = property.getObservations();
        
        try {
            // Tentar extrair nome do profissional
            // Padrões: "Profissional: Nome", "Eng: Nome", "RT: Nome"
            java.util.regex.Pattern patternNome = java.util.regex.Pattern.compile(
                    "(?:Profissional|Eng|RT|Responsável)[:\\s]+([A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)+)",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcherNome = patternNome.matcher(obs);
            if (matcherNome.find()) {
                data.nome = matcherNome.group(1);
            }
            
            // Tentar extrair CREA
            // Padrões: "CREA: 123456-D", "CREA/CE: 123456"
            java.util.regex.Pattern patternCrea = java.util.regex.Pattern.compile(
                    "CREA[/]?([A-Z]{2})?[:\\s-]*([0-9]{5,7}[\\-]?[A-Z]?)",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcherCrea = patternCrea.matcher(obs);
            if (matcherCrea.find()) {
                if (matcherCrea.group(1) != null) {
                    data.estado = matcherCrea.group(1).toUpperCase();
                }
                data.crea = matcherCrea.group(2).toUpperCase();
            }
            
            // Tentar extrair RNP
            // Padrões: "RNP: CE12345678901"
            java.util.regex.Pattern patternRnp = java.util.regex.Pattern.compile(
                    "RNP[:\\s]*([A-Z]{2}[0-9]{11,13})",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcherRnp = patternRnp.matcher(obs);
            if (matcherRnp.find()) {
                data.rnp = matcherRnp.group(1).toUpperCase();
            }
            
        } catch (Exception e) {
            return data;
        }
        
        return data;
    }

    /**
     * Gera template completo de lote profissional
     */
    public String generateProfessionalLotTemplate(int loteNumber, 
                                                PropertyDTO property,
                                                Map<String, Double> coordinates,
                                                List<String> streetNames) {
        StringBuilder loteTemplate = new StringBuilder();
        
        // Cabeçalho do lote
        loteTemplate.append("LOTE ").append(loteNumber).append(":\n");
        
        // Descrição inicial
        loteTemplate.append("Um imóvel urbano, localizado na ");
        
        if (!streetNames.isEmpty()) {
            loteTemplate.append(streetNames.get(0));
        } else if (property != null && property.getStreet() != null) {
            loteTemplate.append(property.getStreet());
        } else {
            loteTemplate.append("[RUA A DEFINIR]");
        }
        
        if (property != null && property.getNeighborhood() != null) {
            loteTemplate.append(", bairro ").append(property.getNeighborhood());
        }
        
        if (property != null && property.getCity() != null && property.getState() != null) {
            loteTemplate.append(", ").append(property.getCity()).append("/").append(property.getState());
        }
        
        loteTemplate.append(", possuindo formato poligonal, conforme seus pontos ");
        
        // Coordenadas dos vértices
        if (coordinates != null && !coordinates.isEmpty()) {
            loteTemplate.append(formatCoordinatesForLot(loteNumber, coordinates));
        } else {
            loteTemplate.append("[COORDENADAS_A_DEFINIR]");
        }
        
        loteTemplate.append(", perfazendo assim, perimetro e area a serem preenchidos com base nos dados tecnicos apurados, ");
        loteTemplate.append("com as seguintes medidas e confrontações:\n\n");
        
        // Confrontações detalhadas (será preenchido pelo método específico)
        loteTemplate.append("[CONFRONTACOES_DETALHADAS]\n\n");
        
        // Separador
        loteTemplate.append("--------------------------------------------------------------");
        loteTemplate.append("--------------------------------------------------------------\n");
        
        return loteTemplate.toString();
    }

    // Métodos auxiliares privados

    private String determineNorthConfrontation(int loteNumber, Map<String, String> data, List<String> streets) {
        // Lógica para determinar confrontação norte baseada na posição do lote
        if (loteNumber <= 10) {
            return !streets.isEmpty() ? streets.get(0) : "[CONFRONTANTE NORTE A CONFIRMAR]";
        } else {
            return "partes do LOTE " + (loteNumber - 10) + " deste desmembramento";
        }
    }

    private String determineSouthConfrontation(int loteNumber, Map<String, String> data, List<String> streets) {
        if (loteNumber <= 10) {
            return "Lote " + (loteNumber + 1) + " deste desmembramento";
        } else {
            return !streets.isEmpty() ? streets.get(0) : "[CONFRONTANTE SUL A CONFIRMAR]";
        }
    }

    private String determineEastConfrontation(int loteNumber, Map<String, String> data) {
        if (loteNumber < 25) {
            return "Lote " + (loteNumber + 1) + " deste desmembramento";
        } else {
            return "[CONFRONTANTE LESTE A CONFIRMAR]";
        }
    }

    private String determineWestConfrontation(int loteNumber, Map<String, String> data) {
        if (loteNumber > 1) {
            return "Lote " + (loteNumber - 1) + " deste desmembramento";
        } else {
            return "[CONFRONTANTE OESTE A CONFIRMAR]";
        }
    }

    private int getPointNumber(int loteNumber, String position) {
        // Calcula número do ponto baseado no lote e posição
        // SW = SudOeste, SE = SudEste, NW = NorOeste, NE = NorEste
        int basePoint = (loteNumber - 1) * 4;
        
        switch (position) {
            case "SW": return basePoint + 1;
            case "SE": return basePoint + 2;
            case "NE": return basePoint + 3;
            case "NW": return basePoint + 4;
            default: return basePoint + 1;
        }
    }

    private String formatCoordinatesForLot(int loteNumber, Map<String, Double> coordinates) {
        // Formata coordenadas no padrão profissional
        StringBuilder coords = new StringBuilder();
        
        // Exemplo: P01 (coordenadas E [E_1]m e N [N_1]m)
        int pointStart = (loteNumber - 1) * 4 + 1;
        
        for (int i = 0; i < 4; i++) {
            if (i > 0) coords.append(", ");
            
            coords.append("P").append(String.format("%02d", pointStart + i));
            coords.append(" (coordenadas E [E_").append(pointStart + i).append("]m e N [N_").append(pointStart + i).append("]m)");
        }
        
        return coords.toString();
    }
}
