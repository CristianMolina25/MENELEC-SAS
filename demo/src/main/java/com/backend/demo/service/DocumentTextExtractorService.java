package com.backend.demo.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

@Service
public class DocumentTextExtractorService {

    public String extractText(MultipartFile file) throws IOException, TikaException, SAXException {
        try (InputStream stream = file.getInputStream()) {
            AutoDetectParser parser = new AutoDetectParser();
            BodyContentHandler handler = new BodyContentHandler(-1);
            Metadata metadata = new Metadata();
            ParseContext context = new ParseContext();
            parser.parse(stream, handler, metadata, context);
            return handler.toString();
        }
    }
    
    // Para extraer también metadatos del documento (autor, fecha creación, etc.)
    public Map<String, String> extractMetadata(MultipartFile file) throws IOException, TikaException, SAXException {
        try (InputStream stream = file.getInputStream()) {
            AutoDetectParser parser = new AutoDetectParser();
            BodyContentHandler handler = new BodyContentHandler(-1);
            Metadata metadata = new Metadata();
            ParseContext context = new ParseContext();
            parser.parse(stream, handler, metadata, context);
            
            Map<String, String> result = new HashMap<>();
            for (String name : metadata.names()) {
                result.put(name, metadata.get(name));
            }
            return result;
        }
    }
    
}