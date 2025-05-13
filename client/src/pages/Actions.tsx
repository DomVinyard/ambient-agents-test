import { Box, Heading, Text, Stack } from '@chakra-ui/react';
import { useAppState } from '../state/AppStateContext';
import ActionCard, { ActionItem } from '../components/ActionCard';

function Actions() {
  const { actions } = useAppState();
  const firstAction = actions[0];

  const handleRespond = (response: any) => {
    if (firstAction && firstAction.action) {
      if (firstAction.action.type === 'connection' && firstAction.action.service === 'gmail') {
        // Here you would trigger Gmail OAuth and processing
        console.log('Trigger Gmail OAuth and process data');
        // TODO: Implement actual OAuth and data processing
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