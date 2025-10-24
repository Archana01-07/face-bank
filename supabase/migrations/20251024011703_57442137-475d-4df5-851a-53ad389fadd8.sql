-- Refresh database types
-- This migration refreshes the TypeScript types to sync with the current database schema

-- Add a comment to the customers table to trigger types regeneration
COMMENT ON TABLE public.customers IS 'Customer information and face recognition data';
COMMENT ON TABLE public.counter_queue IS 'Queue management for customer service counters';
COMMENT ON TABLE public.visit_history IS 'Historical record of customer visits';
COMMENT ON TABLE public.customer_behaviors IS 'Behavioral tracking for customers';