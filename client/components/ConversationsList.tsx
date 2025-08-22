import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Plus,
  Search,
  Clock,
  User,
  X,
  RefreshCw
} from 'lucide-react';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
// import ConversationChat from './ConversationChat';

interface ConversationsListProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConversationsList = ({ isOpen, onClose }: ConversationsListProps) => {
  const {
    conversations,
    loading,
    loadConversations
  } = useConversations();

  const [searchTerm, setSearchTerm] = useState('');
  // const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  // const [isChatOpen, setIsChatOpen] = useState(false);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.friendlyName.toLowerCase().includes(searchLower) ||
      conv.lastMessage?.body.toLowerCase().includes(searchLower) ||
      conv.attributes.bookingId?.toLowerCase().includes(searchLower)
    );
  });

  const handleConversationClick = (conversationSid: string) => {
    // Temporarily disabled to prevent circular dependency
    console.log('Conversation clicked:', conversationSid);
    // setSelectedConversation(conversationSid);
    // setIsChatOpen(true);
  };

  // const handleChatClose = () => {
  //   setIsChatOpen(false);
  //   setSelectedConversation(null);
  //   // Refresh conversations when chat closes to update unread counts
  //   loadConversations();
  // };

  const handleRefresh = () => {
    loadConversations();
  };

  const formatLastMessageTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    const attrs = conversation.attributes || {};
    if (attrs.bookingId) {
      return `Booking ${attrs.bookingId}`;
    }
    return conversation.friendlyName || 'Conversation';
  };

  const getConversationType = (conversation: Conversation) => {
    const attrs = conversation.attributes || {};
    return attrs.type || 'chat';
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Conversations
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {loading && conversations.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading conversations...
                  </div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{searchTerm ? 'No conversations found' : 'No conversations yet'}</p>
                    <p className="text-xs">
                      {searchTerm ? 'Try a different search term' : 'Conversations will appear here when you start chatting'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredConversations.map((conversation) => (
                    <Card
                      key={conversation.sid}
                      className="cursor-pointer hover:shadow-md transition-shadow border"
                      onClick={() => handleConversationClick(conversation.sid)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 mt-1">
                            <AvatarFallback>
                              {getConversationType(conversation) === 'booking-chat' ? (
                                <MessageCircle className="w-5 h-5" />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-sm truncate">
                                {getConversationTitle(conversation)}
                              </h3>
                              <div className="flex items-center gap-2">
                                {conversation.unreadMessagesCount > 0 && (
                                  <Badge variant="destructive" className="text-xs px-2">
                                    {conversation.unreadMessagesCount}
                                  </Badge>
                                )}
                                {conversation.lastMessage && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatLastMessageTime(conversation.lastMessage.dateCreated)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {conversation.lastMessage ? (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium text-xs text-gray-500">
                                  {conversation.lastMessage.author}:
                                </span>
                                <span className="ml-1 truncate block">
                                  {conversation.lastMessage.body.length > 60
                                    ? `${conversation.lastMessage.body.substring(0, 60)}...`
                                    : conversation.lastMessage.body}
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">
                                No messages yet
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {getConversationType(conversation).replace('-', ' ')}
                              </Badge>
                              {conversation.attributes.bookingId && (
                                <Badge variant="secondary" className="text-xs">
                                  ID: {conversation.attributes.bookingId}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal - Removed to prevent circular dependency */}
      {/* <ConversationChat
        isOpen={isChatOpen}
        onClose={handleChatClose}
        conversationSid={selectedConversation || undefined}
      /> */}
    </>
  );
};

export default ConversationsList;
