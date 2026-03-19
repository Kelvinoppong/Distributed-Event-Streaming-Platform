FROM golang:1.21-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /dlq-retry-consumer .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /dlq-retry-consumer /dlq-retry-consumer
ENTRYPOINT ["/dlq-retry-consumer"]
