import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id, step, data } = req.body;

    if (!business_id || !step) {
      return res.status(400).json({ error: 'Missing business_id or step' });
    }

    // Handle test business IDs specially (but not the real test UUID)
    if (business_id.startsWith('test-') && business_id !== '12345678-1234-1234-1234-123456789abc') {
      console.log('Test mode: Simulating progress save for', business_id, 'step:', step);
      console.log('Step data:', data);
      return res.status(200).json({
        success: true,
        message: `Test progress saved for step: ${step}`,
        testMode: true
      });
    }

    // Prepare update data
    const updateData = {
      [`${step}_completed`]: true,
      [`${step}_data`]: data || {},
      current_step: step,
      updated_at: new Date().toISOString()
    };

    // Try to update existing record first
    const { data: existingProgress } = await supabase
      .from('business_setup_progress')
      .select('id')
      .eq('business_id', business_id)
      .single();

    if (existingProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('business_setup_progress')
        .update(updateData)
        .eq('business_id', business_id);

      if (updateError) {
        console.error('Error updating progress:', updateError);
        return res.status(500).json({ error: 'Failed to update progress' });
      }
    } else {
      // Create new record
      const insertData = {
        business_id,
        ...updateData,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('business_setup_progress')
        .insert(insertData);

      if (insertError) {
        console.error('Error creating progress:', insertError);
        return res.status(500).json({ error: 'Failed to create progress' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in save-phase2-progress handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
