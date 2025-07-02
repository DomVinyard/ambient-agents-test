import { Box, Flex, Heading, Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react';
import { MoreVertical, LogOut, Trash2 } from 'lucide-react';

interface ToolbarProps {
  onLogout: () => void;
  onDeleteAllData: () => void;
}

export default function Toolbar({ onLogout, onDeleteAllData }: ToolbarProps) {
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
          Sauna Onboard
          </Heading>
        </Flex>
        
        <Flex align="center" gap={3}>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<MoreVertical size={16} />}
              size="sm"
              variant="ghost"
              aria-label="Menu"
            />
            <MenuList>
              <MenuItem icon={<Trash2 size={16} />} onClick={onDeleteAllData} color="red.600">
                Delete all data
              </MenuItem>
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