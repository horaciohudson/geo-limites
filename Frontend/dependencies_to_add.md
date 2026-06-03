# Dependências para Implementação Assíncrona

## Backend (pom.xml)

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

<!-- Já deve ter estas (verificar) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

## Frontend (package.json)

```json
{
  "dependencies": {
    "@stomp/stompjs": "^7.0.0",
    "sockjs-client": "^1.6.1"
  },
  "devDependencies": {
    "@types/sockjs-client": "^1.5.1"
  }
}
```

## Comandos de Instalação

### Frontend:
```bash
npm install @stomp/stompjs sockjs-client
npm install -D @types/sockjs-client
```

### Backend:
Adicionar as dependências no pom.xml e executar:
```bash
mvn clean install
```