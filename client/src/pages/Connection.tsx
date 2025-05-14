import { useParams } from 'react-router-dom';
import { Heading, Box, Text, Code, Button, Flex, useToast, VStack, Progress, IconButton, Collapse } from '@chakra-ui/react';
import { useAppState } from '../state/AppStateContext';
import { useState, useEffect, useRef } from 'react';
import { getOrCreateSessionId } from '../state/session';
import Pusher from 'pusher-js';
import { FiMail, FiChevronUp, FiInfo } from 'react-icons/fi';
import { useDisclosure } from '@chakra-ui/react';

function Connection() {
  const { connection_id } = useParams();
  const { connections, setConnections } = useAppState();
  const connection = connections.find(c => c.id === connection_id);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>(() => {
    const saved = localStorage.getItem(`progress-${connection_id}`);
    return saved ? JSON.parse(saved) : { current: 0, total: 0 };
  });
  const [deleting, setDeleting] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { isOpen, onToggle } = useDisclosure();
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    if (!connection || !connection.connection_details?.tokens) return;

    // If a sync is in progress on mount, set loading to true
    if (progress.total > 0 && progress.current < progress.total) {
      setLoading(true);
    }

    // Initialize Pusher
    const pusher = new Pusher('edee5dc989021e9397ea', {
      cluster: 'us3'
    });

    const channelName = getOrCreateSessionId();
    const channel = pusher.subscribe(channelName);

    // Track progress state locally
    let currentCount = 0;

    // Handle email-sync-start event
    channel.bind('email-sync-start', (data: any) => {
      setProgress({ current: 0, total: data.total });
      localStorage.setItem(`progress-${connection_id}`, JSON.stringify({ current: 0, total: data.total }));
      currentCount = 0;
    });

    // Handle email-sync events
    channel.bind('email-sync', (data: any) => {
      // Workaround: Read latest connections from localStorage to avoid stale closure
      const latestConnections = JSON.parse(localStorage.getItem('connections') || '[]');
      const updatedConnections = latestConnections.map((c: any) =>
        c.id === connection_id
          ? {
              ...c,
              data: [data.email, ...(c.data || [])],
            }
          : c
      );
      setConnections(updatedConnections);
      // Update progress and persist to localStorage
      setProgress(prev => {
        const next = {
          ...prev,
          current: prev.current + 1,
          total: data.total || prev.total
        };
        localStorage.setItem(`progress-${connection_id}`, JSON.stringify(next));
        // Hide progress bar and re-enable Sync when complete
        if (next.current === next.total) {
          setTimeout(() => {
            setProgress({ current: 0, total: 0 });
            setLoading(false);
            localStorage.removeItem(`progress-${connection_id}`);
          }, 800);
        }
        return next;
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [connection_id, setConnections]);

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
      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err) {
      setLoading(false);
      toast({ status: 'error', title: 'Sync failed', description: String(err) });
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete all data for this connection?')) return;
    setDeleting(true);
    setConnections(connections.map(c =>
      c.id === connection_id ? { ...c, data: [] } : c
    ));
    setDeleting(false);
    toast({ status: 'success', title: 'All data deleted for this connection.' });
  };

  return (
    <Box pt={8}>
      <Box width="100%" maxWidth="900px" mx="auto">
        <Flex align="center" justify="space-between">
          <Heading size="lg" color="white">{connection?.name || 'Connection Details'}</Heading>
          {connection && connection.connection_details?.tokens && (
            <Box display="flex" gap={2} alignItems="center">
              <IconButton
                aria-label="Show Connection Info"
                icon={isOpen ? <FiChevronUp color="white" /> : <FiInfo color="white" />}
                onClick={onToggle}
                size="sm"
                colorScheme="gray"
                variant="outline"
              />
              <Button colorScheme="blue" size="sm" onClick={handleSync} isLoading={loading} loadingText="Syncing..." isDisabled={loading}>
                Sync
              </Button>
              {/* <Button colorScheme="red" size="sm" onClick={handleDelete} isLoading={deleting} ref={confirmRef}>
                Delete Data
              </Button> */}
            </Box>
          )}
        </Flex>
      </Box>
      <Collapse in={isOpen} animateOpacity>
        <Box width="100%" maxWidth="900px" mx="auto">
          <Box mt={2} mb={4} bg="gray.800" borderRadius="md" p={4}>
            <Text color="white" fontWeight="bold" mb={2}>Connection Info</Text>
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
                {JSON.stringify(connection?.connection_details, null, 2)}
              </Code>
            </Box>
          </Box>
        </Box>
      </Collapse>
      {/* <Text color="gray.300">Connection ID: {connection_id}</Text> */}
      {connection ? (
        <>
          {/* Progress bar */}
          {progress.total > 0 && (
            <Box mt={4} width="100%" maxWidth="900px" mx="auto">
              <Text color="white" mb={2}>
                Processing emails: {progress.current} of {progress.total}
              </Text>
              <Progress value={(progress.current / progress.total) * 100} size="sm" colorScheme="blue" />
            </Box>
          )}

          {/* Display emails if present */}
          {Array.isArray(connection.data) && connection.data.length > 0 && (
            <Box mt={6} width="100%" maxWidth="900px" mx="auto">
              <VStack align="stretch" spacing={3} width="100%">
                {connection.data
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((email: any, idx: number) => {
                    // Helper to format date as 'n days ago'
                    const getDaysAgo = (date: string | number | undefined) => {
                      if (!date) return '';
                      const now = new Date();
                      const then = new Date(Number(date));
                      const diff = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff === 0) return 'Today';
                      if (diff === 1) return '1 day ago';
                      return `${diff} days ago`;
                    };
                    return (
                      <Box key={`${email.id}-${idx}`} p={3} bg="gray.700" borderRadius="md" maxWidth="100%" width="100%">
                        <Flex align="center" mb={2} gap={2}>
                          <Box as={FiMail} color="blue.300" boxSize={6} />
                          <Box>
                            <Text color="white" fontWeight="semibold" fontSize="md" noOfLines={2}>{email.subject || '(No Subject)'}</Text>
                            <Text color="gray.400" fontSize="sm">From: {email.from || 'Unknown'}</Text>
                          </Box>
                          <Box flex="1" />
                          <Text color="gray.400" fontSize="sm">{getDaysAgo(email.date)}</Text>
                        </Flex>
                        <Text color="gray.200" fontSize="sm" mb={2}>{email.snippet}</Text>
                        {email.inferences && Array.isArray(email.inferences) && email.inferences.length > 0 && (
                          <Box mt={2} bg="gray.600" borderRadius="md" p={3}>
                            <Box as="ul" pl={4} color="gray.100">
                              {email.inferences.map((inf: string, i: number) => (
                                <li key={i} style={{ fontSize: '0.85em', color: '#cbd5e1' }}>{inf}</li>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
              </VStack>
              <Flex justify="center" mt={4} gap={2}>
                <Button onClick={() => setPage(page - 1)} isDisabled={page === 1} size="sm">Previous</Button>
                <Text color="white" mx={2} fontSize="sm">
                  Page {page} of {Math.max(1, Math.ceil(connection.data.length / pageSize))}
                </Text>
                <Button onClick={() => setPage(page + 1)} isDisabled={page === Math.ceil(connection.data.length / pageSize)} size="sm">Next</Button>
              </Flex>
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