import { Box, Stack, Text, Button, Badge, Icon, Image, Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react';
import { FiMail, FiZap, FiCloudLightning, FiSearch, FiSettings } from 'react-icons/fi';
import { FaBrain } from 'react-icons/fa';
import { GiBrain } from 'react-icons/gi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../state/AppStateContext';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetDemo, actions, connections, agentsActive, agentSuggestions } = useAppState();

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
          <Text color="gray.400" fontSize="sm" fontWeight="medium" pl={2}>Suggested Agents</Text>
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
                {agent.title || agent.id || 'Unknown Agent'}
              </Button>
            ))
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export default Sidebar; 