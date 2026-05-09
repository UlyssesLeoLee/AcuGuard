# syntax=docker/dockerfile:1
# ── Dependency cache layer (cargo-chef) ───────────────────────────────────────
FROM rust:1.87-alpine AS chef
RUN apk add --no-cache musl-dev
RUN cargo install cargo-chef --locked
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ── Builder ───────────────────────────────────────────────────────────────────
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Cache dependencies separately so they aren't rebuilt on every code change
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release

# ── Runner (minimal alpine image) ─────────────────────────────────────────────
FROM alpine:3.21 AS runner
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=builder /app/target/release/backend ./backend
COPY --from=builder /app/sql                    ./sql

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080
ENV BIND_ADDR=0.0.0.0:8080

CMD ["./backend"]
