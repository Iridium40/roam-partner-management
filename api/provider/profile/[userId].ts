import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'GET') {
    try {
      // Handle test user IDs specially
      if (userId.startsWith('test-')) {
        console.log('Test mode: Returning mock provider profile for', userId);
        return res.status(200).json({
          professionalTitle: 'Test Provider',
          professionalBio: 'This is a test professional bio for image upload testing. I am testing the personal profile setup component with mock data.',
          yearsExperience: 5,
          specialties: ['Test Specialty 1', 'Test Specialty 2'],
          certifications: [],
          education: [],
          awards: [],
          socialLinks: {},
          avatarUrl: undefined,
          coverImageUrl: undefined
        });
      }

      const { data: profile, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching provider profile:', error);
        return res.status(500).json({ error: 'Failed to fetch provider profile' });
      }

      if (!profile) {
        // Return empty profile for new users
        return res.status(200).json({
          professionalTitle: '',
          professionalBio: '',
          yearsExperience: 0,
          specialties: [],
          certifications: [],
          education: [],
          awards: [],
          socialLinks: {},
          avatarUrl: undefined,
          coverImageUrl: undefined
        });
      }

      return res.status(200).json({
        professionalTitle: profile.professional_title || '',
        professionalBio: profile.professional_bio || '',
        yearsExperience: profile.years_experience || 0,
        specialties: profile.specialties || [],
        certifications: profile.certifications || [],
        education: profile.education || [],
        awards: profile.awards || [],
        socialLinks: profile.social_links || {},
        avatarUrl: profile.avatar_url,
        coverImageUrl: profile.cover_image_url
      });
    } catch (error) {
      console.error('Error in provider profile GET:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        businessId,
        professionalTitle,
        professionalBio,
        yearsExperience,
        specialties,
        certifications,
        education,
        awards,
        socialLinks,
        avatarUrl,
        coverImageUrl
      } = req.body;

      // Handle test user IDs specially
      if (userId.startsWith('test-')) {
        console.log('Test mode: Simulating provider profile save for', userId);
        console.log('Provider data:', {
          professionalTitle,
          professionalBio,
          yearsExperience,
          specialties,
          avatarUrl,
          coverImageUrl
        });
        return res.status(200).json({
          success: true,
          message: 'Test provider profile saved successfully',
          testMode: true
        });
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const profileData = {
        user_id: userId,
        business_id: businessId,
        professional_title: professionalTitle,
        professional_bio: professionalBio,
        years_experience: yearsExperience,
        specialties: specialties,
        certifications: certifications,
        education: education,
        awards: awards,
        social_links: socialLinks,
        avatar_url: avatarUrl,
        cover_image_url: coverImageUrl,
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('provider_profiles')
          .update(profileData)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating provider profile:', updateError);
          return res.status(500).json({ error: 'Failed to update provider profile' });
        }
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('provider_profiles')
          .insert({
            ...profileData,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating provider profile:', insertError);
          return res.status(500).json({ error: 'Failed to create provider profile' });
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in provider profile PUT:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
