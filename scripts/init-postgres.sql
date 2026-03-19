CREATE TABLE IF NOT EXISTS user_order_stats (
    user_id       VARCHAR(255)     NOT NULL,
    order_count   BIGINT           NOT NULL DEFAULT 0,
    total_amount  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    window_start  TIMESTAMP        NOT NULL,
    window_end    TIMESTAMP        NOT NULL,
    PRIMARY KEY (user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_user_order_stats_window
    ON user_order_stats (window_start, window_end);
