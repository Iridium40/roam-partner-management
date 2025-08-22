import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ConversationMessage {
  sid: string;
  author: string;
  body: string;
  dateCreated: string;
  attributes?: {
    userRole?: string;
    userName?: string;
    userId?: string;
    timestamp?: string;
  };
}

export interface ConversationParticipant {
  sid: string;
  identity: string;
  userId: string;
  userType: string;
  attributes?: {
    role?: string;
    name?: string;
    imageUrl?: string;
    email?: string;
  };
}

export interface Conversation {
  sid: string;
  friendlyName: string;
  attributes: {
    bookingId?: string;
    createdAt?: string;
    type?: string;
  };
  lastMessage?: {
    body: string;
    author: string;
    dateCreated: string;
  };
  unreadMessagesCount: number;
  userType: string;
}

export const useConversations = () => {
  const { user, customer, userType } = useAuth();
  const { toast } = useToast();
  
  // Get the current user data (either provider or customer)
  const currentUser = user || customer;
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  // Generate unique identity for current user
  const getUserIdentity = useCallback(() => {
    if (!currentUser) return null;
    const currentUserType = userType || (currentUser.provider_role ? 'provider' : 'customer');
    return `${currentUserType}-${currentUser.id}`;
  }, [currentUser, userType]);

  // Get user type for API calls
  const getUserType = useCallback(() => {
    if (!currentUser) return null;
    return userType || (currentUser.provider_role ? 'provider' : 'customer');
  }, [currentUser, userType]);

  // Create a new conversation for a booking
  const createConversation = useCallback(async (bookingId: string, participants: Array<{
    identity: string;
    role: string;
    name: string;
    userId: string;
    userType: string;
  }>) => {
    console.log('🚀 createConversation called with:', { bookingId, participants });
    
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        action: 'create-conversation',
        bookingId,
        participants
      };
      console.log('📤 Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create conversation');
      }

      console.log('✅ Conversation created successfully, refreshing conversations list...');
      // Don't call loadConversations here to avoid circular dependency
      // The caller should handle refreshing if needed
      
      return result.conversationSid;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      setError(error.message || 'Failed to create conversation');
      toast({
        title: "Error",
        description: error.message || 'Failed to create conversation',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load conversations for the current user
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    
    console.log('loadConversations called for user:', currentUser.id);
    
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        action: 'get-conversations',
        userId: currentUser.id
      };
      console.log('Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load conversations');
      }

      setConversations(result.conversations || []);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      setError(error.message || 'Failed to load conversations');
      toast({
        title: "Error",
        description: error.message || 'Failed to load conversations',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationSid: string) => {
    console.log('loadMessages called for conversation:', conversationSid);
    
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        action: 'get-messages',
        conversationSid
      };
      console.log('Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load messages');
      }

      setMessages(result.messages || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
      toast({
        title: "Error",
        description: error.message || 'Failed to load messages',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Send a message
  const sendMessage = useCallback(async (conversationSid: string, message: string) => {
    if (!user) return;
    
    console.log('sendMessage called:', { conversationSid, message });
    
    try {
      setSending(true);
      setError(null);
      
      const userType = getUserType();
      const userIdentity = getUserIdentity();
      
      if (!userType || !userIdentity) {
        throw new Error('User not properly authenticated');
      }
      
      const requestBody = {
        action: 'send-message',
        conversationSid,
        message,
        participantIdentity: userIdentity,
        userRole: userType,
        userName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
        userId: currentUser.id
      };
      console.log('Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Add the new message to the current messages list
      const newMessage: ConversationMessage = {
        sid: result.messageSid,
        author: result.author,
        body: result.body,
        dateCreated: result.dateCreated,
        attributes: {
          userRole: userType,
          userName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
          userId: currentUser.id,
          timestamp: new Date().toISOString()
        }
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Don't call loadConversations here to avoid circular dependency
      // The caller should handle refreshing if needed
      
      return result.messageSid;
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
      toast({
        title: "Error",
        description: error.message || 'Failed to send message',
        variant: "destructive",
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [currentUser, getUserType, getUserIdentity, toast]);

  // Load participants for a conversation
  const loadParticipants = useCallback(async (conversationSid: string) => {
    console.log('loadParticipants called for conversation:', conversationSid);
    
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        action: 'get-conversation-participants',
        conversationSid
      };
      console.log('Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load participants');
      }

      setParticipants(result.participants || []);
    } catch (error: any) {
      console.error('Error loading participants:', error);
      setError(error.message || 'Failed to load participants');
      toast({
        title: "Error",
        description: error.message || 'Failed to load participants',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Add a participant to a conversation
  const addParticipant = useCallback(async (conversationSid: string, participantUserId: string, participantUserType: string) => {
    console.log('addParticipant called:', { conversationSid, participantUserId, participantUserType });
    
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        action: 'add-participant',
        conversationSid,
        userId: participantUserId,
        userType: participantUserType
      };
      console.log('Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add participant');
      }

      // Don't call loadParticipants here to avoid circular dependency
      // The caller should handle refreshing if needed
      
      return result.participantSid;
    } catch (error: any) {
      console.error('Error adding participant:', error);
      setError(error.message || 'Failed to add participant');
      toast({
        title: "Error",
        description: error.message || 'Failed to add participant',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationSid: string) => {
    if (!currentUser) return;
    
    console.log('markAsRead called for conversation:', conversationSid);
    
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        action: 'mark-as-read',
        conversationSid,
        userId: currentUser.id
      };
      console.log('Sending request to /api/twilio-conversations:', requestBody);
      
      const response = await fetch('/api/twilio-conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark messages as read');
      }

      // Don't call loadConversations here to avoid circular dependency
      // The caller should handle refreshing if needed
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      setError(error.message || 'Failed to mark messages as read');
      toast({
        title: "Error",
        description: error.message || 'Failed to mark messages as read',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  // Set current conversation
  const setActiveConversation = useCallback((conversationSid: string | null) => {
    console.log('🎯 setActiveConversation called with:', conversationSid);
    setCurrentConversation(conversationSid);
    if (conversationSid) {
      // Call these functions directly to avoid dependency issues
      const loadMessagesDirectly = async () => {
        console.log('📨 Loading messages for conversation:', conversationSid);
        try {
          setLoading(true);
          setError(null);
          
          const requestBody = {
            action: 'get-messages',
            conversationSid
          };
          console.log('📤 Sending request to /api/twilio-conversations:', requestBody);
          
          const response = await fetch('/api/twilio-conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('📥 Response status:', response.status);
          const result = await response.json();
          console.log('📥 Response result:', result);
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to load messages');
          }

          setMessages(result.messages || []);
        } catch (error: any) {
          console.error('Error loading messages:', error);
          setError(error.message || 'Failed to load messages');
          toast({
            title: "Error",
            description: error.message || 'Failed to load messages',
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      const loadParticipantsDirectly = async () => {
        console.log('👥 Loading participants for conversation:', conversationSid);
        try {
          setLoading(true);
          setError(null);
          
          const requestBody = {
            action: 'get-conversation-participants',
            conversationSid
          };
          console.log('📤 Sending request to /api/twilio-conversations:', requestBody);
          
          const response = await fetch('/api/twilio-conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('📥 Response status:', response.status);
          const result = await response.json();
          console.log('📥 Response result:', result);
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to load participants');
          }

          setParticipants(result.participants || []);
        } catch (error: any) {
          console.error('Error loading participants:', error);
          setError(error.message || 'Failed to load participants');
          toast({
            title: "Error",
            description: error.message || 'Failed to load participants',
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      loadMessagesDirectly();
      loadParticipantsDirectly();
    } else {
      setMessages([]);
      setParticipants([]);
    }
  }, [toast]);

  // Load conversations when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 Loading conversations for user:', currentUser.id);
      // Call loadConversations directly instead of through dependency
      const loadConversationsDirectly = async () => {
        if (!currentUser || loading || requestInProgress.current) return;

        try {
          requestInProgress.current = true;
          setLoading(true);
          setError(null);
          
          const requestBody = {
            action: 'get-conversations',
            userId: currentUser.id
          };
          console.log('📤 Sending request to /api/twilio-conversations:', requestBody);
          
          const response = await fetch('/api/twilio-conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('📥 Response status:', response.status);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          let result;
          try {
            result = await response.json();
          } catch (parseError) {
            console.error('Error parsing response JSON:', parseError);
            throw new Error('Invalid response format');
          }

          console.log('📥 Response result:', result);

          if (!result.success) {
            throw new Error(result.error || 'Failed to load conversations');
          }

          setConversations(result.conversations || []);
        } catch (error: any) {
          console.error('Error loading conversations:', error);
          setError(error.message || 'Failed to load conversations');
          toast({
            title: "Error",
            description: error.message || 'Failed to load conversations',
            variant: "destructive",
          });
        } finally {
          setLoading(false);
          requestInProgress.current = false;
        }
      };

      loadConversationsDirectly();
    }
  }, [currentUser]); // Removed toast from dependencies to prevent unnecessary re-renders

  return {
    conversations,
    currentConversation,
    messages,
    participants,
    loading,
    sending,
    error,
    createConversation,
    loadConversations,
    loadMessages,
    sendMessage,
    loadParticipants,
    addParticipant,
    markAsRead,
    setActiveConversation,
    getUserIdentity,
    getUserType
  };
};
