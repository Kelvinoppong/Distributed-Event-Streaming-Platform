FROM confluentinc/cp-kafka:7.5.0

USER root
ADD https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.20.0/jmx_prometheus_javaagent-0.20.0.jar /opt/jmx-exporter/jmx_prometheus_javaagent.jar
COPY jmx-exporter.yml /opt/jmx-exporter/config.yml
RUN chmod 644 /opt/jmx-exporter/jmx_prometheus_javaagent.jar /opt/jmx-exporter/config.yml
USER appuser
