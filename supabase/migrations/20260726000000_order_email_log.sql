-- Migration: Create order_email_log table for tracking transactional Brevo email notifications
CREATE TABLE IF NOT EXISTS order_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz DEFAULT now()
);

-- Indexes for querying logs by order and timestamp
CREATE INDEX IF NOT EXISTS idx_order_email_log_order_id ON order_email_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_email_log_sent_at ON order_email_log(sent_at DESC);

-- Enable RLS
ALTER TABLE order_email_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies for reading and recording logs
DROP POLICY IF EXISTS "Allow public read access for order_email_log" ON order_email_log;
CREATE POLICY "Allow public read access for order_email_log" ON order_email_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert access for order_email_log" ON order_email_log;
CREATE POLICY "Allow insert access for order_email_log" ON order_email_log FOR INSERT WITH CHECK (true);
