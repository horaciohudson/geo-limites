# Instalação das Dependências do Backend

## 1. Adicionar ao pom.xml

Adicione estas dependências no arquivo `pom.xml` do backend:

```xml
<!-- WebSocket Support -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-websocket</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-messaging</artifactId>
</dependency>

<!-- Se não tiver ainda -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

## 2. Executar Instalação

```bash
cd Backend
mvn clean install
```

## 3. Verificar Dependências

Após a instalação, verifique se as dependências foram adicionadas:

```bash
mvn dependency:tree | grep -E "(websocket|messaging)"
```

## 4. Reiniciar o Backend

Após adicionar as dependências e os novos arquivos Java:

```bash
mvn spring-boot:run
```

## 5. Testar WebSocket

Acesse: `http://localhost:9010/ws/memorial` para verificar se o endpoint WebSocket está funcionando.