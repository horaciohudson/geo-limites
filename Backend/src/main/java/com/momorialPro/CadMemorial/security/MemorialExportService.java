package com.momorialPro.CadMemorial.security;


import com.itextpdf.text.Document;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.BaseColor;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;


@Service
@RequiredArgsConstructor
public class MemorialExportService {

    private final DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    public Path export(String content, String format, String fileNameBase) throws Exception {
        if (format == null) format = "txt";
        String timestamp = LocalDateTime.now().format(fmt);
        Path dir = Paths.get("exports").toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path file = dir.resolve(fileNameBase + "_" + timestamp + "." + format.toLowerCase());

        if (format.equalsIgnoreCase("pdf")) {
            writePdf(content, file);
        } else {
            Files.writeString(file, content);
        }
        return file;
    }

    private void writePdf(String text, Path file) throws Exception {
        Document doc = new Document();
        PdfWriter.getInstance(doc, Files.newOutputStream(file));
        doc.open();
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 11, BaseColor.BLACK);
        for (String line : text.split("\n")) doc.add(new Paragraph(line, font));
        doc.close();
    }
}