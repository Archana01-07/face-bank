-- Change counter_number from integer to text to support diverse counter names
ALTER TABLE counter_queue 
  DROP COLUMN counter_number;

ALTER TABLE counter_queue 
  ADD COLUMN counter_name text;

-- Add index for better performance
CREATE INDEX idx_counter_queue_customer_status ON counter_queue(customer_id, status);