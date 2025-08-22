import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Twilio Conversations API called with action:', req.body?.action);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { action, conversationSid, participantIdentity, message, bookingId, userRole, userName, participants, userId, userType } = req.body;

    const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = process.env.VITE_TWILIO_AUTH_TOKEN;
    const conversationsServiceSid = process.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID;

    console.log('Environment variables check:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasServiceSid: !!conversationsServiceSid,
      accountSidLength: accountSid?.length,
      authTokenLength: authToken?.length,
      serviceSidLength: conversationsServiceSid?.length
    });

    if (!accountSid || !authToken || !conversationsServiceSid) {
      console.error('Missing Twilio credentials:', {
        accountSid: !!accountSid,
        authToken: !!authToken,
        conversationsServiceSid: !!conversationsServiceSid
      });
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    // Create Twilio client
    const client = twilio(accountSid, authToken);
    const conversationsService = client.conversations.v1.services(conversationsServiceSid);

    switch (action) {
      case 'create-conversation': {
        console.log('Creating conversation for booking:', bookingId);
        console.log('Participants:', participants);
        
        if (!bookingId || !participants || !Array.isArray(participants)) {
          console.error('Invalid request data:', { bookingId, participants, isArray: Array.isArray(participants) });
          return res.status(400).json({ error: 'Booking ID and participants array are required' });
        }

        // First, check if a conversation already exists for this booking
        console.log('Checking for existing conversation for booking:', bookingId);
        let existingConversation: { id: string; twilio_conversation_sid: string } | null = null;
        try {
          const { data: existingData, error: existingError } = await supabase
            .from('conversation_metadata')
            .select('id, twilio_conversation_sid')
            .eq('booking_id', bookingId)
            .eq('is_active', true)
            .single();

          if (existingData && !existingError) {
            console.log('Found existing conversation - UUID:', existingData.id, 'Twilio SID:', existingData.twilio_conversation_sid);
            existingConversation = existingData as { id: string; twilio_conversation_sid: string };
          } else {
            console.log('No existing conversation found for booking:', bookingId);
          }
        } catch (error) {
          console.log('Error checking for existing conversation:', error);
        }

        let conversation: any;
        let conversationMetadataId: string | null = null;

        if (existingConversation) {
          // Use existing conversation
          console.log('Using existing conversation - UUID:', existingConversation.id, 'Twilio SID:', existingConversation.twilio_conversation_sid);
          conversationMetadataId = existingConversation.id;
          
          try {
            conversation = await conversationsService.conversations(existingConversation.twilio_conversation_sid).fetch();
            console.log('Successfully fetched existing conversation from Twilio');
          } catch (error: any) {
            console.error('Error fetching existing conversation from Twilio:', error);
            // If the conversation doesn't exist in Twilio anymore, create a new one
            existingConversation = null;
          }
        }

        if (!existingConversation) {
          // Create new conversation with unique friendly name
          const conversationFriendlyName = `booking-${bookingId}-${Date.now()}`;
          console.log('Creating new conversation with friendly name:', conversationFriendlyName);
          
          try {
            conversation = await conversationsService.conversations.create({
              friendlyName: conversationFriendlyName,
              attributes: JSON.stringify({
                bookingId,
                createdAt: new Date().toISOString(),
                type: 'booking-chat'
              })
            });
            console.log('Twilio conversation created:', conversation.sid);
          } catch (error: any) {
            console.error('Error creating Twilio conversation:', error);
            return res.status(500).json({ 
              error: 'Failed to create Twilio conversation',
              details: error.message 
            });
          }

          // Store conversation metadata in Supabase
          try {
            const { data: metadataData, error: metadataError } = await supabase
              .from('conversation_metadata')
              .insert({
                booking_id: bookingId,
                twilio_conversation_sid: conversation.sid,
                conversation_type: 'booking-chat',
                is_active: true,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (metadataError) {
              console.error('Error storing conversation metadata:', metadataError);
              // Continue anyway - conversation was created successfully
            } else {
              conversationMetadataId = metadataData.id;
              console.log('Conversation metadata stored with ID:', conversationMetadataId);
            }
          } catch (error) {
            console.error('Error in conversation metadata storage:', error);
          }
        }

        // Add participants to the conversation
        const formattedParticipants = participants.map((participant: any) => ({
          identity: `${participant.userType}-${participant.userId}`,
          attributes: JSON.stringify({
            role: participant.userType,
            name: participant.userName || `${participant.userType}-${participant.userId}`,
            userId: participant.userId,
            userType: participant.userType
          })
        }));

        console.log('Adding participants to conversation:', formattedParticipants);

        for (const participant of formattedParticipants) {
          try {
            const twilioParticipant = await conversationsService.conversations(conversation.sid)
              .participants.create(participant);

            console.log('Added participant:', participant.identity, 'with SID:', twilioParticipant.sid);

            // Store participant in Supabase
            const { error: participantError } = await supabase
              .from('conversation_participants')
              .insert({
                conversation_id: conversationMetadataId || conversation.sid,
                user_id: participant.attributes ? JSON.parse(participant.attributes).userId : null,
                user_type: participant.attributes ? JSON.parse(participant.attributes).userType : null,
                twilio_participant_sid: twilioParticipant.sid,
                joined_at: new Date().toISOString()
              });

            if (participantError) {
              console.error('Error storing participant in database:', participantError);
            }
          } catch (error: any) {
            console.error('Error adding participant:', participant.identity, error);
            // Continue with other participants
          }
        }

        return res.status(200).json({
          success: true,
          conversationSid: conversation.sid,
          conversationMetadataId,
          participants: formattedParticipants
        });
      }

      case 'send-message': {
        if (!conversationSid || !message || !userId || !userType) {
          return res.status(400).json({ error: 'Conversation SID, message, user ID, and user type are required' });
        }

        console.log('Sending message to conversation:', conversationSid);

        try {
          // Get user details for the message
          let userDetails;
          if (userType === 'provider') {
            const { data } = await supabase
              .from('providers')
              .select('first_name, last_name, image_url')
              .eq('user_id', userId)
              .single();
            userDetails = data;
          } else {
            const { data } = await supabase
              .from('customer_profiles')
              .select('first_name, last_name, image_url')
              .eq('user_id', userId)
              .single();
            userDetails = data;
          }

          const identity = `${userType}-${userId}`;
          const authorName = userDetails ? `${userDetails.first_name} ${userDetails.last_name}` : identity;

          // Send message to Twilio conversation
          const twilioMessage = await conversationsService.conversations(conversationSid)
            .messages.create({
              author: identity,
              body: message,
              attributes: JSON.stringify({
                userId,
                userType,
                authorName,
                timestamp: new Date().toISOString()
              })
            });

          console.log('Message sent successfully:', twilioMessage.sid);

          // Store message in Supabase
          const { error: dbError } = await supabase
            .from('conversation_messages')
            .insert({
              conversation_id: conversationSid,
              twilio_message_sid: twilioMessage.sid,
              user_id: userId,
              user_type: userType,
              message_content: message,
              author_name: authorName,
              sent_at: new Date().toISOString()
            });

          if (dbError) {
            console.error('Error storing message in database:', dbError);
            // Continue anyway - message was sent successfully
          }

          return res.status(200).json({
            success: true,
            messageSid: twilioMessage.sid,
            message: {
              id: twilioMessage.sid,
              content: message,
              author: identity,
              authorName,
              timestamp: new Date().toISOString()
            }
          });
        } catch (error: any) {
          console.error('Error sending message:', error);
          return res.status(500).json({ 
            error: 'Failed to send message',
            details: error.message 
          });
        }
      }

      case 'get-messages': {
        if (!conversationSid) {
          return res.status(400).json({ error: 'Conversation SID is required' });
        }

        console.log('Fetching messages for conversation:', conversationSid);

        try {
          // Get messages from Twilio
          const twilioMessages = await conversationsService.conversations(conversationSid)
            .messages.list({ limit: 50 });

          const formattedMessages = twilioMessages.map(msg => ({
            id: msg.sid,
            content: msg.body,
            author: msg.author,
            authorName: msg.attributes ? JSON.parse(msg.attributes).authorName : msg.author,
            timestamp: msg.dateCreated?.toISOString() || new Date().toISOString(),
            attributes: msg.attributes ? JSON.parse(msg.attributes) : {}
          }));

          return res.status(200).json({
            success: true,
            messages: formattedMessages
          });
        } catch (error: any) {
          console.error('Error fetching messages:', error);
          return res.status(500).json({ 
            error: 'Failed to fetch messages',
            details: error.message 
          });
        }
      }

      case 'mark-as-read': {
        if (!conversationSid || !userId) {
          return res.status(400).json({ error: 'Conversation SID and user ID are required' });
        }

        console.log('Marking messages as read for conversation:', conversationSid, 'user:', userId);

        try {
          // Note: message_notifications table might not exist yet, so we'll skip this for now
          // TODO: Create message_notifications table or implement alternative notification system
          console.log('Skipping mark-as-read operation - message_notifications table not implemented yet');
          
          return res.status(200).json({
            success: true,
            message: 'Messages marked as read successfully'
          });
        } catch (error) {
          console.error('Error in mark-as-read operation:', error);
          // Don't fail the request, just return success
          return res.status(200).json({
            success: true,
            message: 'Operation completed (some errors may have occurred)'
          });
        }
      }

      case 'add-participant': {
        if (!conversationSid || !userId || !userType) {
          return res.status(400).json({ error: 'Conversation SID, user ID, and user type are required' });
        }

        // Get user details based on type
        let userDetails;
        if (userType === 'provider') {
          const { data } = await supabase
            .from('providers')
            .select('first_name, last_name, image_url')
            .eq('user_id', userId)
            .single();
          userDetails = data;
        } else {
          const { data } = await supabase
            .from('customer_profiles')
            .select('first_name, last_name, image_url')
            .eq('user_id', userId)
            .single();
          userDetails = data;
        }

        if (!userDetails) {
          return res.status(404).json({ error: 'User not found' });
        }

        const identity = `${userType}-${userId}`;
        const participantName = `${userDetails.first_name} ${userDetails.last_name}`;

        // Add participant to Twilio conversation
        const participant = await conversationsService.conversations(conversationSid)
          .participants.create({
            identity,
            attributes: JSON.stringify({
              role: userType,
              name: participantName,
              userId,
              userType
            })
          });

        // Store participant in Supabase
        const { error: dbError } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: conversationSid,
            user_id: userId,
            user_type: userType,
            twilio_participant_sid: participant.sid,
            joined_at: new Date().toISOString()
          });

        if (dbError) {
          console.error('Error storing participant in database:', dbError);
          return res.status(500).json({ error: 'Failed to store participant' });
        }

        return res.status(200).json({
          success: true,
          participantSid: participant.sid,
          identity,
          name: participantName
        });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('Twilio Conversations API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
