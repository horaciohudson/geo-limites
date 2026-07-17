package com.momorialPro.CadMemorial.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class NumberToWordsConverter {

    private static final String[] UNIDADES = {
            "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
            "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"
    };

    private static final String[] DEZENAS = {
            "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"
    };

    private static final String[] CENTENAS = {
            "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"
    };

    /**
     * Converte uma área em metros quadrados para extenso.
     * Exemplo: 130.00 -> "cento e trinta metros quadrados"
     * Exemplo: 3334.51 -> "três mil trezentos e trinta e quatro metros quadrados e cinquenta e um decímetros quadrados"
     */
    public static String convertArea(double value) {
        BigDecimal bd = BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
        long metrosQuadrados = bd.longValue();
        int decimais = bd.remainder(BigDecimal.ONE).multiply(BigDecimal.valueOf(100)).intValue();

        StringBuilder result = new StringBuilder();
        
        if (metrosQuadrados == 0 && decimais == 0) {
            return "zero metros quadrados";
        }

        if (metrosQuadrados > 0) {
            result.append(convertNumber(metrosQuadrados));
            if (metrosQuadrados == 1) {
                result.append(" metro quadrado");
            } else {
                result.append(" metros quadrados");
            }
        }

        if (decimais > 0) {
            if (metrosQuadrados > 0) {
                result.append(" e ");
            }
            result.append(convertNumber(decimais));
            if (decimais == 1) {
                result.append(" decímetro quadrado");
            } else {
                result.append(" decímetros quadrados");
            }
        }

        return result.toString().trim();
    }

    /**
     * Converte uma distância em metros para extenso.
     * Exemplo: 12.34 -> "doze metros e trinta e quatro centímetros"
     */
    public static String convertDistance(double value) {
        BigDecimal bd = BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
        long metros = bd.longValue();
        int centimetros = bd.remainder(BigDecimal.ONE).multiply(BigDecimal.valueOf(100)).intValue();

        StringBuilder result = new StringBuilder();

        if (metros == 0 && centimetros == 0) {
            return "zero metros";
        }

        if (metros > 0) {
            result.append(convertNumber(metros));
            if (metros == 1) {
                result.append(" metro");
            } else {
                result.append(" metros");
            }
        }

        if (centimetros > 0) {
            if (metros > 0) {
                result.append(" e ");
            }
            result.append(convertNumber(centimetros));
            if (centimetros == 1) {
                result.append(" centímetro");
            } else {
                result.append(" centímetros");
            }
        }

        return result.toString().trim();
    }

    private static String convertNumber(long number) {
        if (number == 0) {
            return "zero";
        }

        if (number < 0) {
            return "menos " + convertNumber(-number);
        }

        if (number < 20) {
            return UNIDADES[(int) number];
        }

        if (number < 100) {
            return DEZENAS[(int) (number / 10)] + ((number % 10 != 0) ? " e " + UNIDADES[(int) (number % 10)] : "");
        }

        if (number < 1000) {
            if (number == 100) return "cem";
            return CENTENAS[(int) (number / 100)] + ((number % 100 != 0) ? " e " + convertNumber(number % 100) : "");
        }

        if (number < 1000000) {
            if (number < 2000) return "mil" + ((number % 1000 != 0) ? " " + convertNumber(number % 1000) : "");
            return convertNumber(number / 1000) + " mil" + ((number % 1000 != 0) ? " " + convertNumber(number % 1000) : "");
        }

        if (number < 1000000000) {
            String milhao = (number / 1000000 == 1) ? " milhão" : " milhões";
            return convertNumber(number / 1000000) + milhao + ((number % 1000000 != 0) ? " e " + convertNumber(number % 1000000) : "");
        }

        return String.valueOf(number); // Fallback for very large numbers
    }
}
