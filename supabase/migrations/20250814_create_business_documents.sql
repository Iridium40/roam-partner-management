-- Create business document type enum
CREATE TYPE public.business_document_type AS ENUM (
  'drivers_license',
  'proof_of_address',
  'liability_insurance',
  'professional_license',
  'professional_certificate',
  'business_license'
);

-- Create business document status enum
CREATE TYPE public.business_document_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'under_review'
);

-- Create business_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.business_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_type public.business_document_type NOT NULL,
  document_name character varying(255) NOT NULL,
  file_url text NOT NULL,
  file_size_bytes integer NULL,
  verified_by uuid NULL,
  verified_at timestamp without time zone NULL,
  rejection_reason text NULL,
  expiry_date date NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  verification_status public.business_document_status NULL DEFAULT 'pending',
  business_id uuid NOT NULL,
  CONSTRAINT business_documents_pkey PRIMARY KEY (id),
  CONSTRAINT business_documents_business_id_fkey FOREIGN KEY (business_id) REFERENCES business_profiles (id) ON DELETE CASCADE,
  CONSTRAINT business_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES admin_users (id) ON DELETE SET NULL
);

-- Add RLS policies
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own business documents
CREATE POLICY "Users can view their own business documents" ON public.business_documents
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to insert documents for their own business
CREATE POLICY "Users can insert documents for their own business" ON public.business_documents
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to update their own business documents
CREATE POLICY "Users can update their own business documents" ON public.business_documents
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to delete their own business documents
CREATE POLICY "Users can delete their own business documents" ON public.business_documents
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_documents_business_id ON public.business_documents (business_id);
CREATE INDEX IF NOT EXISTS idx_business_documents_document_type ON public.business_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_business_documents_verification_status ON public.business_documents (verification_status);
