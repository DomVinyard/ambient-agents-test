import { Box, Stack, Text, Button, Badge, Icon, Image, Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react';
import { FiMail, FiZap, FiCloudLightning, FiSearch, FiSettings, FiRefreshCw } from 'react-icons/fi';
import { FaBrain } from 'react-icons/fa';
import { GiBrain } from 'react-icons/gi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../state/AppStateContext';
import axios from 'axios';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetDemo, actions, connections, agentsActive, agentSuggestions, setAgentSuggestions } = useAppState();

  // Handler to fetch and add a mock agent
  const handleRefreshMockAgent = async () => {
    try {
      const res = await axios.get('/api/mock-agent');
      console.log('Fetched mock agent:', res.data);
      const updatedSuggestions = [res.data, ...agentSuggestions];
      setAgentSuggestions(updatedSuggestions);
      console.log('Updated agentSuggestions:', updatedSuggestions);
    } catch (err) {
      // Optionally handle error
      console.error('Failed to fetch mock agent', err);
    }
  };

  return (
    <Box w="64" bg="gray.800" p={4} borderRight="1px" borderColor="gray.700">
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
            agentsActive.map((agent, idx) => (
              <Button
                key={agent.id || agent.title || idx}
                variant="ghost"
                colorScheme="whiteAlpha"
                color="white"
                justifyContent="flex-start"
                leftIcon={<Icon as={FiZap} />}
                onClick={() => navigate(`/agent/${agent.id || agent.title || 'unknown'}`)}
                pl={2}
              >
                {agent.title || agent.id || 'Unknown Agent'}
              </Button>
            ))
          )}
        </Stack>
        {/* Suggested Agents Section */}
        <Stack spacing={2} align="stretch">
          <Box display="flex" alignItems="center" pl={2}>
            <Text color="gray.400" fontSize="sm" fontWeight="medium" mr={2}>Suggested Agents</Text>
            <IconButton
              aria-label="Refresh Suggested Agents"
              icon={<FiRefreshCw />}
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
              onClick={handleRefreshMockAgent}
              ml={1}
            />
          </Box>
          {agentSuggestions.length === 0 ? (
            <Text color="gray.500" fontSize="sm" pl={4}>None</Text>
          ) : (
            agentSuggestions.map((agent, idx) => (
              <Button
                key={agent.id || agent.title || idx}
                variant="ghost"
                colorScheme="whiteAlpha"
                color="white"
                justifyContent="flex-start"
                leftIcon={<Icon as={FiCloudLightning} />}
                onClick={() => navigate(`/agent/${agent.id || agent.title || 'unknown'}`)}
                pl={2}
              >
                {agent.title || agent.name || agent.id || 'Unknown Agent'}
              </Button>
            ))
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export default Sidebar; 