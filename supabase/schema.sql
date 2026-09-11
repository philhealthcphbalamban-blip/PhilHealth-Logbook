-- ========================================================
-- PHILHEALTH LOGBOOK DATABASE SCHEMA & SEED DATA (SUPABASE)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.worksheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_key TEXT NOT NULL UNIQUE,
    encoder TEXT NOT NULL DEFAULT 'Juvy',
    total_patients INTEGER DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worksheet_id UUID REFERENCES public.worksheets(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    category TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    phic_cat TEXT NOT NULL,
    icd_code TEXT,
    amount NUMERIC(12, 2),
    hci_amount NUMERIC(12, 2),
    pf_amount NUMERIC(12, 2),
    encoder_name TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.icd_reference (
    code TEXT PRIMARY KEY,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_records_date_key ON public.records(date_key);
CREATE INDEX IF NOT EXISTS idx_records_category ON public.records(category);
CREATE INDEX IF NOT EXISTS idx_worksheets_date_key ON public.worksheets(date_key);

ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icd_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Worksheets Policy" ON public.worksheets FOR ALL USING (true);
CREATE POLICY "Public Records Policy" ON public.records FOR ALL USING (true);
CREATE POLICY "Public ICD Policy" ON public.icd_reference FOR SELECT USING (true);

INSERT INTO public.icd_reference (code, amount) VALUES
  ('10060', 0),
  ('10120', 0),
  ('10140', 0),
  ('10160', 0),
  ('10180', 0),
  ('11000', 27404),
  ('11010', 0),
  ('11012', 78780),
  ('11040', 0),
  ('11041', 0),
  ('11042', 0),
  ('11043', 0),
  ('11044', 0),
  ('11100', 0),
  ('11302', 0),
  ('11303', 0),
  ('11311', 0),
  ('11400', 0),
  ('11401', 0),
  ('11402', 0),
  ('11403', 0),
  ('11404', 0),
  ('11406', 4732),
  ('11420', 0),
  ('11421', 0),
  ('11422', 0),
  ('11423', 0),
  ('11424', 0),
  ('11426', 4732),
  ('11440', 0),
  ('11441', 0),
  ('11442', 0),
  ('11443', 5340),
  ('11444', 0),
  ('11446', 0),
  ('11623', 0),
  ('11730', 0),
  ('11750', 0),
  ('12001', 0),
  ('12002', 0),
  ('12004', 0),
  ('12005', 0),
  ('12011', 0),
  ('12013', 0),
  ('12014', 0),
  ('12015', 0),
  ('12031', 0),
  ('14021', 0),
  ('14041', 0),
  ('15931', 0),
  ('16010', 0),
  ('16040', 0),
  ('19020', 0),
  ('19120', 0),
  ('19160', 0),
  ('19162', 0),
  ('19180', 0),
  ('20610', 0),
  ('20680', 15574),
  ('23500', 0),
  ('23515', 16192),
  ('23550', 28522),
  ('23600', 0),
  ('23650', 0),
  ('24341', 0),
  ('24538', 0),
  ('24635', 0),
  ('25075', 0),
  ('25107', 0),
  ('25248', 0),
  ('25574', 0),
  ('25575', 0),
  ('25620', 0),
  ('25927', 0),
  ('26160', 0),
  ('26180', 0),
  ('26600', 0),
  ('26765', 0),
  ('27071', 60450),
  ('27125', 0),
  ('27236', 0),
  ('27245', 0),
  ('27328', 0),
  ('27329', 0),
  ('27502', 0),
  ('27503', 0),
  ('27506', 0),
  ('27507', 39962),
  ('27535', 0),
  ('27536', 0),
  ('27590', 0),
  ('27652', 0),
  ('27696', 0),
  ('27720', 0),
  ('27724', 0),
  ('27759', 0),
  ('27780', 14248),
  ('27880', 39390),
  ('28120', 0),
  ('28810', 24240)
ON CONFLICT (code) DO NOTHING;
