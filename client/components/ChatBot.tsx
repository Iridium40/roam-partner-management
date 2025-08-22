import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, MessageCircle, X, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm here to help answer questions about ROAM. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // This would integrate with Vercel AI SDK
      // For now, we'll simulate a response
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: getSimulatedResponse(input),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botResponse]);
        setIsLoading(false);
      }, 1000);

      // TODO: Replace with actual Vercel AI SDK implementation
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     messages: [...messages, userMessage],
      //   }),
      // });

      // const data = await response.json();
      // setMessages(prev => [...prev, data.message]);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }
  };

  const getSimulatedResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("booking") || lowerInput.includes("appointment")) {
      return "To make a booking, you can browse our services and select a provider that fits your needs. Each provider's profile shows their availability and pricing. Would you like help finding a specific type of service?";
    }

    if (lowerInput.includes("provider") || lowerInput.includes("join")) {
      return "Interested in becoming a provider? Great! You can apply through our 'Become a Provider' page. We welcome verified professionals in beauty, fitness, wellness, and healthcare. The application process includes verification steps to ensure quality service.";
    }

    if (lowerInput.includes("payment") || lowerInput.includes("cost")) {
      return "ROAM offers secure payment processing. You can see exact pricing on each provider's profile before booking. We accept major credit cards and digital payments. There are no hidden fees - what you see is what you pay.";
    }

    if (lowerInput.includes("cancel") || lowerInput.includes("refund")) {
      return "Cancellation policies vary by provider, but most allow cancellations up to 24 hours before your appointment. You can manage your bookings in the 'My Bookings' section. For specific refund questions, please contact the provider directly or reach out to our support team.";
    }

    if (lowerInput.includes("location") || lowerInput.includes("area")) {
      return "ROAM connects you with local service providers in your area. Our providers offer both in-home services and studio appointments. You can filter by location and see each provider's service radius on their profile.";
    }

    return "I'm here to help with questions about ROAM's services, booking process, becoming a provider, payments, and more. Could you please be more specific about what you'd like to know?";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end p-4 z-50">
      <Card className="w-full max-w-md h-[500px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-roam-blue text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5" />
            ROAM Assistant
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-roam-blue" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-roam-blue text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-roam-blue/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-roam-blue" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about ROAM..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
