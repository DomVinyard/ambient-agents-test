import { Box, VStack, Input, Button, Text, Flex, useToast } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatProps {
  agentId: string;
  initialMessage?: string;
}

export default function AgentChat({ agentId, initialMessage }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (initialMessage) {
      setMessages([{
        role: 'assistant',
        content: initialMessage
      }]);
    }
  }, [initialMessage]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          message: userMessage.content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box mt={4} borderTop="1px" borderColor="gray.700" pt={4}>
      <VStack spacing={4} align="stretch" maxH="400px" overflowY="auto">
        {messages.map((message, index) => (
          <Box
            key={index}
            alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
            maxW="80%"
          >
            <Box
              bg={message.role === 'user' ? 'blue.500' : 'gray.700'}
              color="white"
              p={3}
              borderRadius="lg"
            >
              <Text>{message.content}</Text>
            </Box>
          </Box>
        ))}
      </VStack>
      <Flex mt={4} gap={2}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          bg="gray.700"
          color="white"
          _placeholder={{ color: 'gray.400' }}
          disabled={isLoading}
        />
        <Button
          colorScheme="blue"
          onClick={handleSend}
          isLoading={isLoading}
          leftIcon={<FiSend />}
        >
          Send
        </Button>
      </Flex>
    </Box>
  );
} 