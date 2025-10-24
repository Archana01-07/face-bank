-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Regular', 'HNW', 'VIP', 'Elderly')),
  face_descriptors JSONB,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create behavior table
CREATE TABLE IF NOT EXISTS public.customer_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  behavior_type TEXT NOT NULL CHECK (behavior_type IN ('Happy', 'Irate', 'Cautious', 'Neutral', 'Anxious')),
  context TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create visit history table
CREATE TABLE IF NOT EXISTS public.visit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  purpose TEXT NOT NULL,
  outcome TEXT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create counter queue table
CREATE TABLE IF NOT EXISTS public.counter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  counter_number INTEGER,
  priority INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'serving', 'completed')),
  purpose TEXT,
  expected_outcome TEXT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_queue ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now as there's no auth yet)
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to behaviors" ON public.customer_behaviors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to visit history" ON public.visit_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to counter queue" ON public.counter_queue FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_counter_queue_updated_at
  BEFORE UPDATE ON public.counter_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX idx_customers_account_number ON public.customers(account_number);
CREATE INDEX idx_customer_behaviors_customer_id ON public.customer_behaviors(customer_id);
CREATE INDEX idx_visit_history_customer_id ON public.visit_history(customer_id);
CREATE INDEX idx_counter_queue_customer_id ON public.counter_queue(customer_id);
CREATE INDEX idx_counter_queue_status ON public.counter_queue(status);