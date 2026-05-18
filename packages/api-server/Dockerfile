# Stage 1: build the fat JAR
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy Maven wrapper and POM first to cache the dependency layer
COPY packages/api-server/mvnw packages/api-server/mvnw.cmd packages/api-server/
COPY packages/api-server/.mvn packages/api-server/.mvn
COPY packages/api-server/pom.xml packages/api-server/

WORKDIR /app/packages/api-server

RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code - BEFORE changing directory for consistency
COPY packages/api-server/src ./src

# Now build
RUN ./mvnw package -DskipTests -B

# Stage 2: minimal JRE runtime
FROM eclipse-temurin:17-jre-alpine

# Upgrade packages to fix known vulnerabilities in the base alpine image
RUN apk upgrade --no-cache

WORKDIR /app

COPY --from=builder /app/packages/api-server/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]