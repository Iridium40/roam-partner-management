-- Create provider_bank_accounts table for Plaid integration
CREATE TABLE IF NOT EXISTS provider_bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    plaid_access_token TEXT NOT NULL,
    plaid_item_id TEXT UNIQUE NOT NULL,
    account_data JSONB NOT NULL,
    institution_data JSONB,
    webhook_status TEXT,
    webhook_error JSONB,
    last_webhook_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one bank account connection per business
    UNIQUE(business_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_bank_accounts_user_id ON provider_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_bank_accounts_business_id ON provider_bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_provider_bank_accounts_plaid_item_id ON provider_bank_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_provider_bank_accounts_connected_at ON provider_bank_accounts(connected_at);

-- Enable Row Level Security
ALTER TABLE provider_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own bank accounts" ON provider_bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON provider_bank_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON provider_bank_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON provider_bank_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policy for viewing all bank accounts
CREATE POLICY "Admins can view all bank accounts" ON provider_bank_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_bank_accounts_updated_at
    BEFORE UPDATE ON provider_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_bank_accounts_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_bank_accounts TO authenticated;
GRANT SELECT ON provider_bank_accounts TO anon;
