import { useParams } from 'react-router-dom';
import { Heading, Box, Text, Code, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Button, Flex, useToast, VStack } from '@chakra-ui/react';
import { useAppState } from '../state/AppStateContext';
import { useState } from 'react';
import { getOrCreateSessionId } from '../state/session';

function Connection() {
  const { connection_id } = useParams();
  const { connections, setConnections } = useAppState();
  const connection = connections.find(c => c.id === connection_id);
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    if (!connection || !connection.connection_details?.tokens) {
      toast({ status: 'error', title: 'No tokens found for this connection.' });
      return;
    }
    setLoading(true);

    // Immediately clear the data for this connection
    setConnections(connections.map(c =>
      c.id === connection_id ? { ...c, data: [] } : c
    ));

    try {
      const res = await fetch('http://localhost:3001/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: connection.connection_details.tokens, sessionId: getOrCreateSessionId() }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnections(connections.map(c =>
          c.id === connection_id ? { ...c, data: data.emails } : c
        ));
        toast({ status: 'success', title: 'Synced latest emails!' });
      } else {
        toast({ status: 'error', title: 'Sync failed', description: data.error });
      }
    } catch (err) {
      toast({ status: 'error', title: 'Sync failed', description: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Flex align="center" justify="space-between">
        <Heading size="lg" color="white">Connection Details</Heading>
        {connection && connection.connection_details?.tokens && (
          <Button colorScheme="blue" size="sm" onClick={handleSync} isLoading={loading} loadingText="Syncing..." isDisabled={loading}>
            Sync
          </Button>
        )}
      </Flex>
      <Text color="gray.300">Connection ID: {connection_id}</Text>
      {connection ? (
        <>
          <Accordion allowToggle defaultIndex={[]}> 
            <AccordionItem color={"white"}>
              <AccordionButton>
                <Box as="span" flex="1" textAlign="left">
                  Show Connection Info
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel p={0}>
                <Box maxW="100%" overflowX="auto">
                  <Code
                    p={4}
                    whiteSpace="pre-wrap"
                    display="block"
                    fontSize="sm"
                    width="100%"
                    maxWidth="100%"
                    boxSizing="border-box"
                    borderRadius="md"
                    sx={{
                      overflowWrap: 'break-word',
                      wordBreak: 'break-all',
                      background: 'white',
                      color: 'black',
                    }}
                  >
                    {JSON.stringify(connection.connection_details, null, 2)}
                  </Code>
                </Box>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          {/* Display emails if present */}
          {Array.isArray(connection.data) && connection.data.length > 0 && (
            <Box mt={6}>
              <Heading size="md" color="white" mb={2}>Latest Emails</Heading>
              <VStack align="stretch" spacing={3}>
                {connection.data.map((email: any, idx: number) => (
                  <Box key={email.id || idx} p={3} bg="gray.700" borderRadius="md">
                    <Text color="white" fontWeight="bold">Snippet:</Text>
                    <Text color="gray.200" fontSize="sm" mb={1}>{email.snippet}</Text>
                    <Text color="gray.400" fontSize="xs">Date: {email.internalDate ? new Date(Number(email.internalDate)).toLocaleString() : 'N/A'}</Text>
                    <Text color="gray.400" fontSize="xs">ID: {email.id}</Text>
                    {email.wordware && (
                      <Box mt={2}>
                        <Text color="white" fontWeight="bold">Processed (Wordware):</Text>
                        <Code
                          p={2}
                          whiteSpace="pre-wrap"
                          display="block"
                          fontSize="xs"
                          width="100%"
                          maxWidth="100%"
                          boxSizing="border-box"
                          borderRadius="md"
                          sx={{
                            overflowWrap: 'break-word',
                            wordBreak: 'break-all',
                            background: 'white',
                            color: 'black',
                          }}
                        >
                          {JSON.stringify(email.wordware, null, 2)}
                        </Code>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </>
      ) : (
        <Text color="red.400" mt={4}>Connection not found.</Text>
      )}
    </Box>
  );
}

export default Connection; 