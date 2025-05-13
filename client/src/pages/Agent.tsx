import { useParams } from 'react-router-dom';
import { Heading, Box, Text } from '@chakra-ui/react';

function Agent() {
  const { agent_id } = useParams();
  return (
    <Box>
      <Heading size="lg" color="white">Agent Page Placeholder</Heading>
      <Text color="gray.300">Agent ID: {agent_id}</Text>
    </Box>
  );
}

export default Agent; 