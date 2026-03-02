CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at);
