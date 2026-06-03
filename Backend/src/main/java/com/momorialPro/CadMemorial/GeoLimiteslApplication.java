package com.momorialPro.CadMemorial;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GeoLimiteslApplication {

	public static void main(String[] args) {
		// Carrega variáveis do arquivo .env se existir
		Dotenv dotenv = Dotenv.configure()
				.directory(".")
				.ignoreIfMissing()
				.load();
		
		// Define as variáveis de ambiente para o Spring
		dotenv.entries().forEach(entry -> {
			System.setProperty(entry.getKey(), entry.getValue());
		});
		
		SpringApplication.run(GeoLimiteslApplication.class, args);
	}

}
