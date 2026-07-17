package com.momorialPro.CadMemorial.util;

public class DirectionConverter {

    /**
     * Calcula o sentido de caminhamento cartorial (ex: "Oeste-Leste", "Sul-Norte")
     * baseado nas coordenadas inicial e final do segmento e na orientação principal da face.
     *
     * @param startE Coordenada E (Easting/X) do ponto inicial
     * @param startN Coordenada N (Northing/Y) do ponto inicial
     * @param endE   Coordenada E (Easting/X) do ponto final
     * @param endN   Coordenada N (Northing/Y) do ponto final
     * @param face   Direção geral da face (NORTE, SUL, LESTE, OESTE)
     * @return String com o sentido de caminhamento (ex: "Oeste-Leste")
     */
    public static String getSentidoCaminhamento(double startE, double startN, double endE, double endN, String face) {
        double deltaE = endE - startE;
        double deltaN = endN - startN;

        boolean isHorizontal = face.equalsIgnoreCase("NORTE") || face.equalsIgnoreCase("SUL");
        boolean isVertical = face.equalsIgnoreCase("LESTE") || face.equalsIgnoreCase("OESTE");

        // Se a face for predominantemente horizontal, avaliamos o eixo E (Leste/Oeste)
        if (isHorizontal) {
            if (Math.abs(deltaE) >= 0.001) { // tolerância para evitar falsos 0
                return deltaE > 0 ? "Oeste-Leste" : "Leste-Oeste";
            } else {
                // Se for perfeitamente vertical mas classificada como horizontal (incomum)
                return deltaN > 0 ? "Sul-Norte" : "Norte-Sul";
            }
        }

        // Se a face for predominantemente vertical, avaliamos o eixo N (Norte/Sul)
        if (isVertical) {
            if (Math.abs(deltaN) >= 0.001) {
                return deltaN > 0 ? "Sul-Norte" : "Norte-Sul";
            } else {
                // Se for perfeitamente horizontal mas classificada como vertical (incomum)
                return deltaE > 0 ? "Oeste-Leste" : "Leste-Oeste";
            }
        }

        // Fallback genérico caso a face não seja reconhecida:
        // Usa o eixo com maior variação
        if (Math.abs(deltaE) > Math.abs(deltaN)) {
            return deltaE > 0 ? "Oeste-Leste" : "Leste-Oeste";
        } else {
            return deltaN > 0 ? "Sul-Norte" : "Norte-Sul";
        }
    }
}
