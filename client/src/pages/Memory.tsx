import { Heading, Box, VStack, Text, Input, Button, useToast, Spinner, Code } from '@chakra-ui/react';
import { useState } from 'react';
import { getOrCreateSessionId } from '../state/session';

interface Memory {
  content: string;
  metadata: {
    source: string;
    timestamp: string;
    score: number;
    validAt?: string;
  };
  relevance: number;
}

interface QueryResponse {
  answer: string;
  memories: Memory[];
}

function Memory() {
  const [query, setQuery] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleQuery = async () => {
    if (!query.trim()) {
      toast({
        status: 'warning',
        title: 'Please enter a query',
        duration: 2000
      });
      return;
    }

    setLoading(true);
    setAnswer(null);
    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch('http://localhost:3001/api/zep/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), sessionId })
      });
      
      if (res.ok) {
        const data: QueryResponse = await res.json();
        setMemories(data.memories);
        setAnswer(data.answer);
      } else {
        const error = await res.json();
        toast({
          status: 'error',
          title: 'Failed to query memories',
          description: error.error || 'Please try again later'
        });
      }
    } catch (err) {
      toast({
        status: 'error',
        title: 'Error querying memories',
        description: String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Heading size="lg" color="white" mb={6}>Memory Query</Heading>
      
      <Box mb={6}>
        <Input
          placeholder="Ask a question about your data..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
          bg="gray.700"
          color="white"
          _placeholder={{ color: 'gray.400' }}
          mb={2}
        />
        <Button
          colorScheme="blue"
          onClick={handleQuery}
          isLoading={loading}
          loadingText="Searching..."
        >
          Search
        </Button>
      </Box>

      {loading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.400" mt={4}>Searching memories...</Text>
        </Box>
      ) : (
        <VStack align="stretch" spacing={6}>
          {answer && (
            <Box p={4} bg="blue.900" borderRadius="md">
              <Text color="white" fontWeight="bold" mb={2}>Answer:</Text>
              <Text color="gray.200">{answer}</Text>
            </Box>
          )}
          
          {memories.length === 0 ? (
            <Text color="gray.400">No memories found. Try a different query.</Text>
          ) : (
            <>
              <Text color="white" fontWeight="bold">Supporting Memories:</Text>
              {memories.map((memory, idx) => (
                <Box key={idx} p={4} bg="gray.700" borderRadius="md">
                  <Text color="white" fontWeight="bold">Memory:</Text>
                  <Text color="gray.200" mb={2}>{memory.content}</Text>
                  <Text color="gray.400" fontSize="sm">Source: {memory.metadata.source}</Text>
                  <Text color="gray.400" fontSize="sm">Date: {memory.metadata.validAt ? new Date(memory.metadata.validAt).toLocaleString() : 'Unknown'}</Text>
                </Box>
              ))}
            </>
          )}
        </VStack>
      )}
    </Box>
  );
}

export default Memory; 