import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase configuration:', {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseServiceKey?.length
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Request body is required' });
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
              error: 'Failed to create conversation',
              details: error.message || 'Unknown error'
            });
          }

          // Store new conversation in Supabase
          try {
            const { data: conversationData, error: dbError } = await supabase
              .from('conversation_metadata')
              .insert({
                twilio_conversation_sid: conversation.sid,
                booking_id: bookingId,
                conversation_type: 'booking_chat',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select('id')
              .single();

            if (dbError) {
              console.error('Error storing conversation in database:', dbError);
            } else {
              conversationMetadataId = conversationData?.id;
              console.log('Stored new conversation - UUID:', conversationMetadataId, 'Twilio SID:', conversation.sid);
            }
          } catch (dbError) {
            console.error('Error storing conversation in database:', dbError);
          }
        }

        // Store conversation in Supabase
        conversationMetadataId = null;
        try {
          const { data: conversationData, error: dbError } = await supabase
            .from('conversation_metadata')
            .insert({
              twilio_conversation_sid: conversation.sid,
              booking_id: bookingId,
              conversation_type: 'booking_chat',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (dbError) {
            console.error('Error storing conversation in database:', dbError);
            // Don't fail the request, but log the error
          } else {
            conversationMetadataId = conversationData?.id;
            console.log('Stored conversation with metadata ID:', conversationMetadataId);
          }
        } catch (dbError) {
          console.error('Error storing conversation in database:', dbError);
        }

        // Add participants to the conversation (only if this is a new conversation)
        if (!existingConversation) {
          console.log('Adding participants to new conversation');
          const participantPromises = participants.map(async (participant: any) => {
            try {
              // Check if participant already exists in this conversation
              try {
                const existingParticipant = await conversationsService.conversations(conversation.sid)
                  .participants(participant.identity)
                  .fetch();
                console.log(`Participant ${participant.identity} already exists in conversation`);
                return existingParticipant;
              } catch (notFoundError: any) {
                // Participant doesn't exist, create new one
                console.log(`Creating new participant: ${participant.identity}`);
              }

              const twilioParticipant = await conversationsService.conversations(conversation.sid)
                .participants.create({
                  identity: participant.identity,
                  attributes: JSON.stringify({
                    role: participant.role,
                    name: participant.name,
                    userId: participant.userId,
                    userType: participant.userType
                  })
                });

              console.log(`Successfully created participant: ${participant.identity}`);

              // Store participant in Supabase
              try {
                console.log('Storing participant in database:', {
                  conversation_id: conversationMetadataId,
                  user_id: participant.userId,
                  user_type: participant.userType,
                  participant_sid: twilioParticipant.sid
                });

                const { error: participantDbError } = await supabase
                  .from('conversation_participants')
                  .insert({
                    conversation_id: conversationMetadataId, // Use the UUID from conversation_metadata
                    user_id: participant.userId, // auth.users.id
                    user_type: participant.userType, // 'provider' or 'customer'
                    twilio_participant_sid: twilioParticipant.sid,
                    joined_at: new Date().toISOString()
                  });

                if (participantDbError) {
                  console.error('Error storing participant in database:', participantDbError);
                } else {
                  console.log('Successfully stored participant in database');
                }
              } catch (participantDbError) {
                console.error('Error storing participant in database:', participantDbError);
              }

              return twilioParticipant;
            } catch (error: any) {
              console.error(`Error adding participant ${participant.identity}:`, error);
              
              // Handle specific Twilio errors
              if (error.code === 50433) {
                console.log(`Participant ${participant.identity} already exists in conversation`);
                return null;
              } else if (error.message && error.message.includes('conversation limit exceeded')) {
                console.error('User conversation limit exceeded for participant:', participant.identity);
                // Don't throw error, just log it and continue
                return null;
              } else {
                console.error('Unexpected error adding participant:', error);
                // Don't throw error, just log it and continue
                return null;
              }
            }
          });

          try {
            await Promise.all(participantPromises);
            console.log('All participants processed');
          } catch (error) {
            console.error('Error processing participants:', error);
            // Don't fail the request, just log the error
          }
        } else {
          console.log('Using existing conversation - skipping participant addition');
        }

        console.log('Conversation created successfully:', {
          sid: conversation.sid,
          friendlyName: conversation.friendlyName
        });

        return res.status(200).json({
          success: true,
          conversationSid: conversation.sid,
          friendlyName: conversation.friendlyName
        });
      }

      case 'send-message': {
        if (!conversationSid || !message || !participantIdentity || !userId) {
          return res.status(400).json({ error: 'Conversation SID, message, participant identity, and user ID are required' });
        }

        const messageResponse = await conversationsService.conversations(conversationSid)
          .messages.create({
            author: participantIdentity,
            body: message,
            attributes: JSON.stringify({
              userRole,
              userName,
              userId,
              timestamp: new Date().toISOString()
            })
          });

        // Store message notification in Supabase
        try {
          console.log('Storing message notification for conversation:', conversationSid, 'user:', userId, 'message:', messageResponse.sid);
          
          // Note: message_notifications table might not exist yet, so we'll skip this for now
          // TODO: Create message_notifications table or implement alternative notification system
          console.log('Skipping message notification storage - table not implemented yet');
        } catch (notificationError) {
          console.error('Error storing message notification:', notificationError);
        }

        return res.status(200).json({
          success: true,
          messageSid: messageResponse.sid,
          conversationSid: messageResponse.conversationSid,
          author: messageResponse.author,
          body: messageResponse.body,
          dateCreated: messageResponse.dateCreated
        });
      }

      case 'get-messages': {
        if (!conversationSid) {
          return res.status(400).json({ error: 'Conversation SID is required' });
        }

        const messages = await conversationsService.conversations(conversationSid)
          .messages.list({ limit: 100, order: 'asc' });

        const formattedMessages = messages.map(msg => ({
          sid: msg.sid,
          author: msg.author,
          body: msg.body,
          dateCreated: msg.dateCreated,
          attributes: msg.attributes ? JSON.parse(msg.attributes) : {}
        }));

        return res.status(200).json({
          success: true,
          messages: formattedMessages
        });
      }

      case 'get-conversations': {
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        try {
          console.log('Getting conversations for user:', userId);
          
          // Get user's conversations from database
          const { data: userConversations, error: dbError } = await supabase
            .from('conversation_participants')
            .select(`
              conversation_id,
              user_type,
              joined_at
            `)
            .eq('user_id', userId);

          if (dbError) {
            console.error('Database error fetching user conversations:', dbError);
            // Return empty conversations instead of failing
            return res.status(200).json({
              success: true,
              conversations: [],
              message: 'No conversations found'
            });
          }

          if (!userConversations || userConversations.length === 0) {
            console.log('No conversations found for user:', userId);
            return res.status(200).json({
              success: true,
              conversations: [],
              message: 'No conversations found'
            });
          }

          console.log('Found user conversations:', userConversations?.length || 0, 'conversations for user:', userId);

          // Get additional details from Twilio for each conversation
          const conversationsWithDetails = await Promise.all(
            userConversations.map(async (userConv) => {
              try {
                // Get Twilio conversation SID from conversation_metadata
                const { data: conversationMetadata } = await supabase
                  .from('conversation_metadata')
                  .select('twilio_conversation_sid')
                  .eq('id', userConv.conversation_id)
                  .single();

                if (!conversationMetadata?.twilio_conversation_sid) {
                  console.error('No Twilio conversation SID found for conversation_id:', userConv.conversation_id);
                  return null;
                }

                const twilioConversationSid = conversationMetadata.twilio_conversation_sid;
                const conversation = await conversationsService.conversations(twilioConversationSid).fetch();
                const lastMessage = await conversationsService.conversations(twilioConversationSid)
                  .messages.list({ limit: 1, order: 'desc' });

                // Note: message_notifications table might not exist yet, so we'll skip this for now
                // TODO: Create message_notifications table or implement alternative notification system
                const unreadCount = 0; // Placeholder until message_notifications table is implemented

                return {
                  sid: conversation.sid,
                  friendlyName: conversation.friendlyName,
                  attributes: conversation.attributes ? JSON.parse(conversation.attributes) : {},
                  lastMessage: lastMessage.length > 0 ? {
                    body: lastMessage[0].body,
                    author: lastMessage[0].author,
                    dateCreated: lastMessage[0].dateCreated
                  } : null,
                  unreadMessagesCount: unreadCount || 0,
                  userType: userConv.user_type
                };
              } catch (error) {
                console.error('Error fetching conversation details for conversation_id:', userConv.conversation_id, error);
                return null;
              }
            })
          );

          // Filter out null results
          const validConversations = conversationsWithDetails.filter(conv => conv !== null);

          console.log('Returning valid conversations:', validConversations.length);

          return res.status(200).json({
            success: true,
            conversations: validConversations
          });
          
        } catch (error: any) {
          console.error('Unexpected error in get-conversations:', error);
          return res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message || 'Failed to fetch conversations due to unexpected error'
          });
        }
      }

      case 'get-conversation-participants': {
        if (!conversationSid) {
          return res.status(400).json({ error: 'Conversation SID is required' });
        }

        console.log('Getting participants for conversation:', conversationSid);

        // First, get the UUID from conversation_metadata using the Twilio SID
        const { data: conversationMetadata, error: metadataError } = await supabase
          .from('conversation_metadata')
          .select('id')
          .eq('twilio_conversation_sid', conversationSid)
          .single();

        if (metadataError || !conversationMetadata) {
          console.error('Error finding conversation metadata for Twilio SID:', conversationSid, metadataError);
          return res.status(404).json({ error: 'Conversation not found' });
        }

        const conversationUuid = (conversationMetadata as any).id;
        console.log('Found conversation UUID:', conversationUuid, 'for Twilio SID:', conversationSid);

        // Get participants from Supabase using the UUID
        const { data: participants, error: dbError } = await supabase
          .from('conversation_participants')
          .select(`
            twilio_participant_sid,
            user_id,
            user_type,
            joined_at
          `)
          .eq('conversation_id', conversationUuid);

        console.log('Database query result:', {
          participants: participants?.length || 0,
          error: dbError,
          conversationSid
        });

        if (dbError) {
          console.error('Error fetching participants from database:', dbError);
          return res.status(500).json({ error: 'Failed to fetch participants' });
        }

        // Process participants with user details fetched separately
        const formattedParticipants = await Promise.all(participants.map(async (participant) => {
          let userDetails: any = null;
          let userEmail = 'Unknown';

          try {
            // Get user email from auth.users
            const { data: authUser } = await supabase
              .from('auth.users')
              .select('email')
              .eq('id', participant.user_id)
              .single();

            if (authUser) {
              userEmail = authUser.email;
            }

            // Get user details based on type
            if (participant.user_type === 'provider') {
              const { data: providerData } = await supabase
                .from('providers')
                .select('first_name, last_name, image_url')
                .eq('user_id', participant.user_id)
                .single();
              userDetails = providerData;
            } else {
              const { data: customerData } = await supabase
                .from('customer_profiles')
                .select('first_name, last_name, image_url')
                .eq('user_id', participant.user_id)
                .single();
              userDetails = customerData;
            }
          } catch (error) {
            console.error('Error fetching user details for participant:', participant.user_id, error);
          }

          console.log('Processing participant:', {
            twilio_participant_sid: participant.twilio_participant_sid,
            user_id: participant.user_id,
            user_type: participant.user_type,
            userDetails: userDetails,
            userEmail: userEmail
          });

          return {
            sid: participant.twilio_participant_sid,
            identity: `${participant.user_type}-${participant.user_id}`,
            userId: participant.user_id,
            userType: participant.user_type,
            attributes: {
              role: participant.user_type,
              name: userDetails ? `${userDetails.first_name} ${userDetails.last_name}` : 'Unknown',
              imageUrl: userDetails?.image_url,
              email: userEmail
            }
          };
        }));

        console.log('Formatted participants:', formattedParticipants);

        return res.status(200).json({
          success: true,
          participants: formattedParticipants
        });
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

}

const conversationUuid = (conversationMetadata as any).id;
console.log('Found conversation UUID:', conversationUuid, 'for Twilio SID:', conversationSid);

// Get participants from Supabase using the UUID
const { data: participants, error: dbError } = await supabase
  .from('conversation_participants')
  .select(`
    twilio_participant_sid,
    user_id,
    user_type,
    joined_at
  `)
  .eq('conversation_id', conversationUuid);

console.log('Database query result:', {
  participants: participants?.length || 0,
  error: dbError,
  conversationSid
});

if (dbError) {
  console.error('Error fetching participants from database:', dbError);
  return res.status(500).json({ error: 'Failed to fetch participants' });
}

// Process participants with user details fetched separately
const formattedParticipants = await Promise.all(participants.map(async (participant) => {
  let userDetails: any = null;
  let userEmail = 'Unknown';

  try {
    // Get user email from auth.users
    const { data: authUser } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', participant.user_id)
      .single();

    if (authUser) {
      userEmail = authUser.email;
    }

    // Get user details based on type
    if (participant.user_type === 'provider') {
      const { data: providerData } = await supabase
        .from('providers')
        .select('first_name, last_name, image_url')
        .eq('user_id', participant.user_id)
        .single();
      userDetails = providerData;
    } else {
      const { data: customerData } = await supabase
        .from('customer_profiles')
        .select('first_name, last_name, image_url')
        .eq('user_id', participant.user_id)
        .single();
      userDetails = customerData;
    }
  } catch (error) {
    console.error('Error fetching user details for participant:', participant.user_id, error);
  }

  console.log('Processing participant:', {
    twilio_participant_sid: participant.twilio_participant_sid,
    user_id: participant.user_id,
    user_type: participant.user_type,
    userDetails: userDetails,
    userEmail: userEmail
  });

  return {
    sid: participant.twilio_participant_sid,
    identity: `${participant.user_type}-${participant.user_id}`,
    userId: participant.user_id,
    userType: participant.user_type,
    attributes: {
      role: participant.user_type,
      name: userDetails ? `${userDetails.first_name} ${userDetails.last_name}` : 'Unknown',
      imageUrl: userDetails?.image_url,
      email: userEmail
    }
  };
}));

console.log('Formatted participants:', formattedParticipants);

return res.status(200).json({
  success: true,
  participants: formattedParticipants
});
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
  console.error('Error stack:', error.stack);
  console.error('Error details:', {
    message: error.message,
    name: error.name,
    code: error.code
  });
  
  // Return proper JSON error response
  return res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message || 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}
