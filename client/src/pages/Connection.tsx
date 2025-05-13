import { useParams } from 'react-router-dom';
import { Heading, Box, Text } from '@chakra-ui/react';

function Connection() {
  const { connection_id } = useParams();
  return (
    <Box>
      <Heading size="lg" color="white">Connection Page Placeholder</Heading>
      <Text color="gray.300">Connection ID: {connection_id}</Text>
    </Box>
  );
}

export default Connection; 