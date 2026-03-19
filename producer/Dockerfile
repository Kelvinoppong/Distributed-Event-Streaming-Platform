FROM golang:1.21-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /event-producer .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /event-producer /event-producer
ENTRYPOINT ["/event-producer"]
