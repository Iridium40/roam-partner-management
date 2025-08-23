import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { businessId } = req.params;

  if (typeof businessId !== 'string') {
    return res.status(400).json({ error: 'Invalid business ID' });
  }

  if (req.method === 'GET') {
    try {
      // Handle test business IDs specially (but not the real test UUID)
      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        console.log('Test mode: Returning mock business profile for', businessId);
        return res.status(200).json({
          businessName: 'Test Business',
          detailedDescription: 'This is a test business for image upload testing.',
          websiteUrl: 'https://testbusiness.com',
          socialMediaLinks: {},
          logoUrl: undefined,
          coverImageUrl: undefined,
          businessCategoryRefined: undefined
        });
      }

      // In development mode, return mock data for any business ID
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Returning mock business profile for Stripe Connect');
        return res.status(200).json({
          businessName: 'Test Business',
          detailedDescription: 'This is a test business for Stripe Connect testing.',
          websiteUrl: 'https://testbusiness.com',
          socialMediaLinks: {},
          logoUrl: undefined,
          coverImageUrl: undefined,
          businessCategoryRefined: undefined,
          email: 'test@example.com',
          business_type: 'llc',
          verification_status: 'approved',
          identity_verified: true,
          bank_connected: true
        });
      }

      const { data: business, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('Error fetching business profile:', error);
        return res.status(404).json({ error: 'Business profile not found' });
      }

      return res.status(200).json({
        businessName: business.business_name,
        detailedDescription: business.business_description || '', // Map to existing column
        websiteUrl: business.website_url || '',
        socialMediaLinks: business.social_media || {}, // Map to existing column
        logoUrl: business.logo_url,
        coverImageUrl: business.cover_image_url,
        businessCategoryRefined: business.business_category_refined
      });
    } catch (error) {
      console.error('Error in business profile GET:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        businessName,
        detailedDescription,
        websiteUrl,
        socialMediaLinks,
        logoUrl,
        coverImageUrl,
        businessCategoryRefined
      } = req.body;

      // Handle test business IDs specially (but not the real test UUID)
      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        console.log('Test mode: Simulating business profile save for', businessId);
        console.log('Business data:', {
          businessName,
          detailedDescription,
          websiteUrl,
          socialMediaLinks,
          logoUrl,
          coverImageUrl
        });
        return res.status(200).json({
          success: true,
          message: 'Test business profile saved successfully',
          testMode: true
        });
      }

      // Check if business profile exists
      const { data: existingBusiness } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('id', businessId)
        .single();

      if (!existingBusiness) {
        return res.status(404).json({ error: 'Business profile not found' });
      }

      // Update business profile
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({
          business_name: businessName,
          business_description: detailedDescription, // Use existing column name
          website_url: websiteUrl,
          social_media: socialMediaLinks, // Use existing column name
          logo_url: logoUrl,
          cover_image_url: coverImageUrl
          // Note: removed business_category_refined and updated_at as they don't exist in current schema
        })
        .eq('id', businessId);

      if (updateError) {
        console.error('Error updating business profile:', updateError);
        return res.status(500).json({ error: 'Failed to update business profile' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in business profile PUT:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
