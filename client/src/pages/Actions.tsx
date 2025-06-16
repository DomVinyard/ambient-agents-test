import { Box, Heading, Text, Stack, VStack } from '@chakra-ui/react';
import { useAppState } from '../state/AppStateContext';
import ActionCard, { ActionItem } from '../components/ActionCard';
import { useEffect } from 'react';

function Actions() {
  const { actions, setActions, connections, setConnections } = useAppState();

  // On mount, check for gmail=success in query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'success') {
      let tokens = undefined;
      if (params.get('tokens')) {
        try {
          tokens = JSON.parse(decodeURIComponent(params.get('tokens')!));
        } catch (e) {
          tokens = undefined;
        }
      }
      setConnections([
        ...connections,
        {
          id: 'gmail',
          name: 'Gmail',
          connection_details: { type: 'email', connected: true, tokens },
          raw_data: [],
          processed_data: null
        }
      ]);
      setActions(actions.slice(1));
      // Clean up the URL
      params.delete('gmail');
      params.delete('tokens');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleRespond = (action: ActionItem, response: any) => {
    if (action && action.action) {
      if (
        action.action.type === 'connection' &&
        action.action.service === 'gmail' &&
        response === 'yes'
      ) {
        // Redirect to Gmail OAuth in the same tab (backend URL)
        window.location.href = 'http://localhost:3001/auth/gmail';
        return;
      }
    }
    
    // Remove the action that was responded to
    setActions(actions.filter(a => a.id !== action.id));
    
    // For now, just log the response. Later, you can update state based on the response.
    console.log('User response:', response);
  };

  return (
    <Stack spacing={6}>
      <Heading size="lg" color="white">Actions</Heading>
      {actions.length > 0 ? (
        <VStack spacing={4} align="stretch">
          {actions.map((action, index) => (
            <ActionCard 
              key={action.id || index} 
              action={action as ActionItem} 
              onRespond={(response) => handleRespond(action, response)} 
            />
          ))}
        </VStack>
      ) : (
        <Box boxShadow="xl" p={6} borderRadius="lg" bg="white">
          <Text color="gray.500">No actions available.</Text>
        </Box>
      )}
    </Stack>
  );
}

export default Actions; 