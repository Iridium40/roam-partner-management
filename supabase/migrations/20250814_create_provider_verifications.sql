-- Create provider_verifications table for Stripe Identity integration
CREATE TABLE IF NOT EXISTS provider_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_verification_session_id TEXT UNIQUE NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'requires_input' CHECK (verification_status IN ('requires_input', 'processing', 'verified', 'canceled')),
    verified_data JSONB,
    verification_type TEXT DEFAULT 'identity' CHECK (verification_type IN ('identity', 'document')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one verification per user
    UNIQUE(user_id, verification_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_verifications_user_id ON provider_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_verifications_session_id ON provider_verifications(stripe_verification_session_id);
CREATE INDEX IF NOT EXISTS idx_provider_verifications_status ON provider_verifications(verification_status);

-- Enable Row Level Security
ALTER TABLE provider_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own verifications" ON provider_verifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications" ON provider_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications" ON provider_verifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policy for viewing all verifications
CREATE POLICY "Admins can view all verifications" ON provider_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_verifications_updated_at
    BEFORE UPDATE ON provider_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_verifications_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON provider_verifications TO authenticated;
GRANT SELECT ON provider_verifications TO anon;
