FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY smt/pom.xml ./pom.xml
RUN mvn dependency:go-offline -B
COPY smt/src ./src
RUN mvn clean package -DskipTests -q

FROM confluentinc/cp-kafka-connect:7.5.0
COPY --from=build /app/target/slack-alert-smt-1.0.0.jar \
     /usr/share/java/kafka-connect-transforms/slack-alert-smt.jar
