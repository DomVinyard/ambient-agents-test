import { useParams } from 'react-router-dom';
import { Heading, Box, Text, Divider, VStack, Tag, Button, Flex } from '@chakra-ui/react';
import { useAppState } from '../state/AppStateContext';
import { useMemo } from 'react';

function Agent() {
  const { agent_id } = useParams();
  const { agentSuggestions, setAgentSuggestions, agentsActive, setAgentsActive } = useAppState();
  // Try to find by id, name, or title
  const agent = useMemo(() => agentSuggestions.find(
    a => a.id === agent_id || a.name === agent_id || a.title === agent_id || a.Name === agent_id
  ) || agentsActive.find(
    a => a.id === agent_id || a.name === agent_id || a.title === agent_id || a.Name === agent_id
  ), [agent_id, agentSuggestions, agentsActive]);

  const isActive = useMemo(() => agentsActive.some(
    a => a.id === agent_id || a.name === agent_id || a.title === agent_id || a.Name === agent_id
  ), [agent_id, agentsActive]);

  if (!agent) {
    return (
      <Box>
        <Heading size="lg" color="white">Agent Not Found</Heading>
        <Text color="gray.300">No agent found for ID: {agent_id}</Text>
      </Box>
    );
  }

  const handleHire = () => {
    setAgentSuggestions(agentSuggestions.filter(a => a !== agent));
    setAgentsActive([agent, ...agentsActive]);
  };

  const handleFire = () => {
    setAgentsActive(agentsActive.filter(a => a !== agent));
    setAgentSuggestions([agent, ...agentSuggestions]);
  };

  return (
    <>
      <Box maxW="2xl" mx="auto" mb={2} display="flex" justifyContent="flex-end">
        {isActive ? (
          <Button colorScheme="red" size="sm" fontWeight="bold" onClick={handleFire}>
            Fire agent
          </Button>
        ) : (
          <Button colorScheme="orange" size="sm" fontWeight="bold" onClick={handleHire}>
            Hire agent ${agent.daily_cost ?? '?'} /day
          </Button>
        )}
      </Box>
      <Box maxW="2xl" mx="auto" p={6} bg="gray.800" borderRadius="lg" boxShadow="lg">
        <Flex justify="space-between" align="flex-start" mb={2}>
          <Box>
            <Heading size="lg" color="white" mb={1}>{agent.name || agent.Name || agent.title || agent.id || 'Agent'}</Heading>
            <Tag colorScheme="blue" size="md" mb={2}>{agent.id}</Tag>
          </Box>
        </Flex>
        <VStack align="stretch" spacing={4}>
          <Divider />
          {agent.description && (
            <Box>
              <Text color="gray.400" fontWeight="bold" mb={1}>Description</Text>
              <Text color="gray.200">{agent.description}</Text>
            </Box>
          )}
          {agent.trigger && (
            <Box>
              <Text color="gray.400" fontWeight="bold" mb={1}>Trigger</Text>
              <Text color="gray.200">{agent.trigger}</Text>
            </Box>
          )}
          {agent.prompt && (
            <Box>
              <Text color="gray.400" fontWeight="bold" mb={1}>Prompt</Text>
              <Text color="gray.200" fontFamily="mono" whiteSpace="pre-wrap">{agent.prompt}</Text>
            </Box>
          )}
          {agent.human_loop && (
            <Box>
              <Text color="gray.400" fontWeight="bold" mb={1}>Human In Loop</Text>
              <Text color="gray.200">{agent.human_loop}</Text>
            </Box>
          )}
          {agent.tools && Array.isArray(agent.tools) && agent.tools.length > 0 && (
            <Box>
              <Text color="gray.400" fontWeight="bold" mb={2}>Tools</Text>
              <VStack align="stretch" spacing={2}>
                {agent.tools.map((tool: any, idx: number) => (
                  <Box key={tool.tool_id || idx} p={3} bg="gray.700" borderRadius="md">
                    <Text color="blue.200" fontWeight="bold">{tool.tool_id || tool.id || 'Tool'}</Text>
                    {tool.description && <Text color="gray.300" fontSize="sm" mt={1}>{tool.description}</Text>}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </Box>
    </>
  );
}

export default Agent; 