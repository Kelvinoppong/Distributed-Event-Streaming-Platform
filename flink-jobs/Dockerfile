FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -q

FROM flink:1.18-java17
COPY --from=build /app/target/order-event-processor-1.0.0.jar /opt/flink/usrlib/order-event-processor.jar
