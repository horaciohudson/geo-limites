FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src/ src/
RUN ./mvnw -DskipTests clean package

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

RUN mkdir -p /app/logs /app/data/uploads/dxf /app/data/templates

COPY --from=builder /workspace/target/*.jar /app/app.jar

EXPOSE 9010

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
