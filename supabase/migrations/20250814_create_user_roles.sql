-- Create user_roles table for role-based access control
-- This table manages user roles across the platform (admin, owner, dispatcher, provider, customer)

-- Create enum for user roles
CREATE TYPE user_role_type AS ENUM (
    'admin',
    'owner', 
    'dispatcher',
    'provider',
    'customer'
);

-- Create user_roles table
CREATE TABLE user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role_type NOT NULL,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES business_locations(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique role per user per business context
    UNIQUE(user_id, role, business_id),
    
    -- Admin roles don't need business_id
    CONSTRAINT check_admin_no_business CHECK (
        (role = 'admin' AND business_id IS NULL) OR 
        (role != 'admin')
    ),
    
    -- Customer roles don't need business_id or location_id
    CONSTRAINT check_customer_no_business CHECK (
        (role = 'customer' AND business_id IS NULL AND location_id IS NULL) OR 
        (role != 'customer')
    )
);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_user_roles_business_id ON user_roles(business_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_roles_user_business ON user_roles(user_id, business_id);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
            AND ur.is_active = true
        )
    );

-- Business owners can view roles within their business
CREATE POLICY "Business owners can view business roles" ON user_roles
    FOR SELECT USING (
        business_id IN (
            SELECT ur.business_id 
            FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'owner'
            AND ur.is_active = true
        )
    );

-- Dispatchers can view roles within their business
CREATE POLICY "Dispatchers can view business roles" ON user_roles
    FOR SELECT USING (
        business_id IN (
            SELECT ur.business_id 
            FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('owner', 'dispatcher')
            AND ur.is_active = true
        )
    );

-- Admins can insert/update/delete any roles
CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
            AND ur.is_active = true
        )
    );

-- Business owners can manage roles within their business (except admin roles)
CREATE POLICY "Business owners can manage business roles" ON user_roles
    FOR ALL USING (
        role != 'admin' AND
        business_id IN (
            SELECT ur.business_id 
            FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'owner'
            AND ur.is_active = true
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_roles_updated_at();

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(check_user_id UUID, check_role user_role_type, check_business_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id 
        AND role = check_role
        AND is_active = true
        AND (check_business_id IS NULL OR business_id = check_business_id)
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(check_user_id UUID)
RETURNS TABLE(role user_role_type, business_id UUID, business_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.role,
        ur.business_id,
        bp.business_name
    FROM user_roles ur
    LEFT JOIN business_profiles bp ON ur.business_id = bp.id
    WHERE ur.user_id = check_user_id 
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default admin role (replace with actual admin user ID)
-- INSERT INTO user_roles (user_id, role, granted_by) 
-- VALUES ('your-admin-user-id-here', 'admin', 'your-admin-user-id-here');

-- Comments
COMMENT ON TABLE user_roles IS 'Manages user roles and permissions across the platform';
COMMENT ON COLUMN user_roles.role IS 'User role: admin, owner, dispatcher, provider, or customer';
COMMENT ON COLUMN user_roles.business_id IS 'Associated business (null for admin and customer roles)';
COMMENT ON COLUMN user_roles.location_id IS 'Associated location (optional, for location-specific roles)';
COMMENT ON COLUMN user_roles.expires_at IS 'Role expiration date (null for permanent roles)';
COMMENT ON FUNCTION user_has_role IS 'Check if user has specific role, optionally within business context';
COMMENT ON FUNCTION get_user_roles IS 'Get all active roles for a user with business context';
