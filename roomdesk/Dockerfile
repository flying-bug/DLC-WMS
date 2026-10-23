# syntax=docker/dockerfile:1

# ---- build stage: JDK + Maven wrapper, never shipped --------------------------------------
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/main/ src/main/
RUN ./mvnw -B -q package -Dmaven.test.skip=true \
 && java -Djarmode=tools -jar target/roomdesk-*.jar extract --layers --launcher --destination target/extracted

# ---- runtime stage: JRE only, no source code, non-root ----------------------------------
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S roomdesk && adduser -S -G roomdesk -H -s /sbin/nologin roomdesk
WORKDIR /app

COPY --from=build --chown=roomdesk:roomdesk /workspace/target/extracted/dependencies/ ./
COPY --from=build --chown=roomdesk:roomdesk /workspace/target/extracted/spring-boot-loader/ ./
COPY --from=build --chown=roomdesk:roomdesk /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=roomdesk:roomdesk /workspace/target/extracted/application/ ./

USER roomdesk
ENV SPRING_PROFILES_ACTIVE=docker
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "org.springframework.boot.loader.launch.JarLauncher"]
