import { Box, Heading, Text, Stack } from '@chakra-ui/react';
import { useAppState } from '../state/AppStateContext';
import ActionCard, { ActionItem } from '../components/ActionCard';
import { useEffect } from 'react';

function Actions() {
  const { actions, setActions, connections, setConnections } = useAppState();
  const firstAction = actions[0];

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

  const handleRespond = (response: any) => {
    if (firstAction && firstAction.action) {
      if (
        firstAction.action.type === 'connection' &&
        firstAction.action.service === 'gmail' &&
        response === 'yes'
      ) {
        // Redirect to Gmail OAuth in the same tab (backend URL)
        window.location.href = 'http://localhost:3001/auth/gmail';
        return;
      }
    }
    // For now, just log the response. Later, you can update state or move to next action.
    console.log('User response:', response);
  };

  return (
    <Stack spacing={6}>
      <Heading size="lg" color="white">Actions</Heading>
      {firstAction ? (
        <ActionCard action={firstAction as ActionItem} onRespond={handleRespond} />
      ) : (
        <Box boxShadow="xl" p={6} borderRadius="lg" bg="white">
          <Text color="gray.500">No actions available.</Text>
        </Box>
      )}
    </Stack>
  );
}

export default Actions; 