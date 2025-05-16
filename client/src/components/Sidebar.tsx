import { Box, Stack, Text, Button, Badge, Icon, Image, Menu, MenuButton, MenuList, MenuItem, IconButton, Spinner } from '@chakra-ui/react';
import { FiMail, FiZap, FiCloudLightning, FiSearch, FiSettings, FiRefreshCw } from 'react-icons/fi';
import { FaBrain } from 'react-icons/fa';
import { GiBrain } from 'react-icons/gi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../state/AppStateContext';
import axios from 'axios';
import { useState } from 'react';
import { getOrCreateSessionId } from '../state/session';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetDemo, actions, connections, agentsActive, agentSuggestions, setAgentSuggestions } = useAppState();
  const [refreshLoading, setRefreshLoading] = useState(false);

  // Handler to fetch and add agent suggestions
  const handleRefreshMockAgent = async () => {
    setRefreshLoading(true);
    try {
      setAgentSuggestions([]);
      // Use getOrCreateSessionId to ensure correct sessionId
      const sessionId = getOrCreateSessionId();
      const res = await axios.post('http://localhost:3001/api/mock-agent', { sessionId });
      console.log('Fetched agent suggestions:', res.data);
      const suggestions = Array.isArray(res.data) ? res.data : [res.data];
      setAgentSuggestions(suggestions);
      console.log('Updated agentSuggestions:', suggestions);
      navigate('/');
    } catch (err) {
      console.error('Failed to fetch agent suggestions', err);
    } finally {
      setRefreshLoading(false);
    }
  };

  return (
    <Box 
      w="350px" 
      bg="gray.800" 
      p={4} 
      borderRight="1px" 
      borderColor="gray.700"
      flexShrink={0}
      overflowX="hidden"
      overflowY="auto"
      maxH="100vh"
    >
      <Stack spacing={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Image src="/logo.png" alt="Logo" maxW="100px" objectFit="contain" />
          <Menu>
            <MenuButton as={IconButton} aria-label="Settings" icon={<FiSettings />} variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} />
            <MenuList>
              <MenuItem onClick={resetDemo} icon={<FiSettings />}>Reset Demo</MenuItem>
            </MenuList>
          </Menu>
        </Box>
        {/* Actions and Memory Section */}
        <Stack spacing={1} align="stretch">
          <Button 
            variant="ghost" 
            colorScheme="whiteAlpha" 
            color="white"
            justifyContent="flex-start"
            leftIcon={<Icon as={FiZap} />}
            onClick={() => navigate('/actions')}
            pl={2}
            bg={location.pathname === '/actions' ? 'whiteAlpha.200' : 'transparent'}
          >
            Actions
            <Badge ml={2} colorScheme="blue">{actions.length}</Badge>
          </Button>
          <Button 
            variant="ghost" 
            colorScheme="whiteAlpha" 
            color="white"
            justifyContent="flex-start"
            leftIcon={<Icon as={GiBrain} />}
            onClick={() => navigate('/memory')}
            pl={2}
            bg={location.pathname === '/memory' ? 'whiteAlpha.200' : 'transparent'}
          >
            Memory
          </Button>
        </Stack>
        {/* Connections Section */}
        <Stack spacing={2} align="stretch">
          <Text color="gray.400" fontSize="sm" fontWeight="medium" pl={2}>Connections</Text>
          {connections.length === 0 ? (
            <Text color="gray.500" fontSize="sm" pl={4}>None</Text>
          ) : (
            connections.map((conn, idx) => (
              <Button
                key={conn.id || conn.name || idx}
                variant="ghost"
                colorScheme="whiteAlpha"
                color="white"
                justifyContent="flex-start"
                leftIcon={<Icon as={FiMail} />}
                onClick={() => navigate(`/connection/${conn.id || conn.name || 'unknown'}`)}
                pl={2}
              >
                {conn.name || conn.id || 'Unknown Connection'}
              </Button>
            ))
          )}
        </Stack>
        {/* Active Agents Section */}
        <Stack spacing={2} align="stretch">
          <Text color="gray.400" fontSize="sm" fontWeight="medium" pl={2}>Active Agents</Text>
          {agentsActive.length === 0 ? (
            <Text color="gray.500" fontSize="sm" pl={4}>None</Text>
          ) : (
            agentsActive.map((agent, idx) => {
              const isSelected = location.pathname === `/agent/${agent.id || agent.title || 'unknown'}`;
              return (
                <Box
                  key={agent.id || agent.title || idx}
                  border="1px"
                  borderColor={isSelected ? "blue.400" : "gray.600"}
                  borderRadius="md"
                  p={2}
                  cursor="pointer"
                  onClick={() => navigate(`/agent/${agent.id || agent.title || 'unknown'}`)}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  bg={isSelected ? "whiteAlpha.100" : "transparent"}
                >
                  <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={1} mb={1}>
                    {agent.name || agent.Name || agent.title || agent.id || 'Unknown Agent'}
                  </Text>
                  {agent.description && (
                    <Text color="gray.400" fontSize="xs" noOfLines={2}>
                      {agent.description}
                    </Text>
                  )}
                </Box>
              );
            })
          )}
        </Stack>
        {/* Suggested Agents Section */}
        <Stack spacing={3} align="stretch">
          <Box display="flex" alignItems="center" pl={2}>
            <Text color="gray.400" fontSize="sm" fontWeight="medium" mr={2}>Suggested Agents</Text>
            <IconButton
              aria-label="Refresh Suggested Agents"
              icon={refreshLoading ? <Spinner size="xs" /> : <FiRefreshCw />}
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
              onClick={handleRefreshMockAgent}
              ml={1}
              isDisabled={refreshLoading}
            />
          </Box>
          {agentSuggestions.length === 0 ? (
            <Text color="gray.500" fontSize="sm" pl={4}>None</Text>
          ) : (
            agentSuggestions.map((agent, idx) => {
              const isSelected = location.pathname === `/agent/${agent.id || agent.title || 'unknown'}`;
              return (
                <Box
                  key={agent.id || agent.title || idx}
                  border="1px"
                  borderColor={isSelected ? "blue.400" : "gray.600"}
                  borderRadius="md"
                  p={2}
                  cursor="pointer"
                  onClick={() => navigate(`/agent/${agent.id || agent.title || 'unknown'}`)}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  bg={isSelected ? "whiteAlpha.100" : "transparent"}
                >
                  <Text color="white" fontWeight="medium" fontSize="sm" noOfLines={1} mb={1}>
                    {agent.name || agent.Name || agent.title || agent.id || 'Unknown Agent'}
                  </Text>
                  {agent.justification && (
                    <Text color="gray.400" fontSize="xs" noOfLines={2}>
                      {agent.justification}
                    </Text>
                  )}
                </Box>
              );
            })
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export default Sidebar; 