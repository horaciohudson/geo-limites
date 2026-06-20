package com.momorialPro.CadMemorial.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemorialExampleSanitizerTest {

    private final MemorialExampleSanitizer sanitizer = new MemorialExampleSanitizer();

    @Test
    void shouldRemoveSignatureAndValidationNoiseFromExtractedExamples() {
        String raw = """
                MEMORIAL DESCRITIVO
                Documento assinado no Assinador Registro de Imóveis. Para validar o documento e suas assinaturas acesse https://assinador.registrodeimoveis.org.br/validate/ABC-123.
                Proprietário: DBL Empreendimentos LTDA
                
                AO NORTE: confrontando com a Rua Terezinha Onofre Lima.
                https://assinador.registrodeimoveis.org.br/validate/ABC-123
                MANIFESTO DE
                ASSINATURAS
                Código de validação: ABC-123
                Para verificar as assinaturas, acesse o link direto de validação deste documento:
                Ou acesse a consulta de documentos assinados disponível no link abaixo e informe
                o código de validação:
                Diego Alves Pinto (CPF 007.701.383-22)
                .
                """;

        String sanitized = sanitizer.sanitize(raw);

        assertTrue(sanitized.contains("MEMORIAL DESCRITIVO"));
        assertTrue(sanitized.contains("Proprietário: DBL Empreendimentos LTDA"));
        assertTrue(sanitized.contains("AO NORTE: confrontando com a Rua Terezinha Onofre Lima."));
        assertFalse(sanitized.contains("Documento assinado no Assinador Registro de Imóveis"));
        assertFalse(sanitized.contains("MANIFESTO DE"));
        assertFalse(sanitized.contains("ASSINATURAS"));
        assertFalse(sanitized.contains("Código de validação"));
        assertFalse(sanitized.contains("Diego Alves Pinto (CPF 007.701.383-22)"));
        assertFalse(sanitized.contains("https://assinador.registrodeimoveis.org.br/validate"));
    }

    @Test
    void shouldNormalizeBrokenParagraphsAndDirectionalWraps() {
        String raw = """
                MEMORIAL DESCRITIVO DE DESMEMBRAMENTO DE ÁREA
                Objetivo: Levantamento Topográfico Planimétrico de imóvel urbano Georreferenciado no Datum
                Sirgas 2000 para fins de Desmembramento de Área.

                AO NORTE: (fundos), medindo uma distância total de 86,85m, no sentido Oeste
                Leste, limitando
                se com a Rua Terezinha Onofre Lima.
                AO SUL: (frente), medindo uma distância de 101,00m.
                """;

        String sanitized = sanitizer.sanitize(raw);

        assertTrue(sanitized.contains("Objetivo: Levantamento Topográfico Planimétrico de imóvel urbano Georreferenciado no Datum Sirgas 2000 para fins de Desmembramento de Área."));
        assertTrue(sanitized.contains("AO NORTE: (fundos), medindo uma distância total de 86,85m, no sentido Oeste-Leste, limitando-se com a Rua Terezinha Onofre Lima."));
        assertTrue(sanitized.contains("\nAO SUL: (frente), medindo uma distância de 101,00m."));
        assertFalse(sanitized.contains("Oeste\nLeste"));
        assertFalse(sanitized.contains("limitando\nse"));
    }
}
