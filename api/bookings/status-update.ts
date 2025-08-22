import type { VercelRequest } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase client for Edge Runtime
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request: VercelRequest, res: any) {
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { 
      bookingId, 
      newStatus, 
      updatedBy, 
      reason, 
      notifyCustomer = true,
      notifyProvider = true 
    } = body;

    // Validate required fields
    if (!bookingId || !newStatus || !updatedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update booking status in Supabase
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: newStatus,
        updated_at: new Date().toISOString(),
        status_updated_by: updatedBy,
        status_update_reason: reason
      })
      .eq('id', bookingId)
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        providers (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        ),
        business_profiles (
          id,
          name,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    // Create status update record
    const { error: historyError } = await supabase
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: newStatus,
        changed_by: updatedBy,
        reason: reason,
        changed_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Error creating status history:', historyError);
    }

    // Send real-time notifications
    const notifications = [];

    // Notify customer
    if (notifyCustomer && booking.customers) {
      notifications.push({
        type: 'booking_status_update',
        userId: booking.customer_id,
        userType: 'customer',
        bookingId,
        message: `Your booking status has been updated to: ${newStatus}`,
        data: {
          bookingId,
          newStatus,
          serviceName: booking.service_name,
          providerName: booking.providers?.first_name + ' ' + booking.providers?.last_name,
          businessName: booking.business_profiles?.name
        }
      });
    }

    // Notify provider
    if (notifyProvider && booking.providers) {
      notifications.push({
        type: 'booking_status_update',
        userId: booking.providers.user_id,
        userType: 'provider',
        bookingId,
        message: `Booking status updated to: ${newStatus}`,
        data: {
          bookingId,
          newStatus,
          serviceName: booking.service_name,
          customerName: booking.customers?.first_name + ' ' + booking.customers?.last_name
        }
      });
    }

    // Send notifications via Edge Function
    for (const notification of notifications) {
      try {
        await fetch(`${process.env.VERCEL_URL}/api/notifications/edge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }

    // Send to Twilio Conversations if status is confirmed/in_progress
    if (['confirmed', 'in_progress'].includes(newStatus)) {
      try {
        await sendTwilioNotification(booking, newStatus);
      } catch (error) {
        console.error('Error sending Twilio notification:', error);
      }
    }

    return res.status(200).json({ 
      success: true, 
      booking,
      notificationsSent: notifications.length 
    });

  } catch (error) {
    console.error('Status update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function sendTwilioNotification(booking: any, status: string) {
  // This would integrate with your existing Twilio Conversations setup
  // to notify participants about status changes
  console.log('Sending Twilio notification for booking:', booking.id, 'status:', status);
}

// Webhook endpoint for external status updates - removed for Vercel compatibility
// export async function PUT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { bookingId, status, source } = body;

//     // Validate webhook signature if needed
//     // const signature = request.headers.get('x-webhook-signature');
//     // if (!verifyWebhookSignature(signature, body)) {
//     //   return new Response('Invalid signature', { status: 401 });
//     // }

//     // Process external status update
//     const response = await POST(request);
//     return response;

//   } catch (error) {
//     console.error('Webhook error:', error);
//     return new Response('Webhook processing failed', { status: 500 });
//   }
// }
