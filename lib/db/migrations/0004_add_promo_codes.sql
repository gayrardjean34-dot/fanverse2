CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  credits INTEGER NOT NULL,
  used_by_user_id INTEGER REFERENCES users(id),
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);

INSERT INTO promo_codes (code, credits) VALUES
  ('FV100-A7KX2', 100),
  ('FV100-B3MN8', 100),
  ('FV100-C9PQ4', 100),
  ('FV100-D2RW6', 100),
  ('FV100-E5TY1', 100),
  ('FV100-F8UZ3', 100),
  ('FV100-G1VX7', 100),
  ('FV100-H4WB9', 100),
  ('FV100-J6YC5', 100),
  ('FV100-K0ZD2', 100);
