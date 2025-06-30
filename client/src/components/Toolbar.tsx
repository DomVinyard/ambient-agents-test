import { Button, Box, Flex, Heading, Text, Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react';
import { FileUser, MoreVertical, LogOut } from 'lucide-react';

interface ToolbarProps {
  onCreateBasicProfile: () => void;
  onLogout: () => void;
  isLoading?: boolean;
  status?: string;
}

export default function Toolbar({ onCreateBasicProfile, onLogout, isLoading = false, status = '' }: ToolbarProps) {
  return (
    <Box 
      borderBottom="1px solid"
      borderColor="gray.200"
      px={4}
      py={3}
      bg="white"
    >
      <Flex justify="space-between" align="center">
        <Flex align="center" gap={4}>
          <Heading size="md" color="gray.800">
            Sauna Profiler
          </Heading>
        </Flex>
        
        <Flex align="center" gap={3}>
          {status && (
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              {status.length > 100 ? status.substring(0, 100) + '...' : status}
            </Text>
          )}
          
          <Button
            leftIcon={<FileUser size={16} />}
            colorScheme="blue"
            size="sm"
            onClick={onCreateBasicProfile}
            isLoading={isLoading}
            loadingText="Analyzing..."
          >
            Basic Profile
          </Button>
          
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<MoreVertical size={16} />}
              size="sm"
              variant="ghost"
              aria-label="Menu"
            />
            <MenuList>
              <MenuItem icon={<LogOut size={16} />} onClick={onLogout}>
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    </Box>
  );
} 