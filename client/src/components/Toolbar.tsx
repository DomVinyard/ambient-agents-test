import { Box, Flex, Heading, Text, Menu, MenuButton, MenuList, MenuItem, IconButton, Progress, VStack } from '@chakra-ui/react';
import { MoreVertical, LogOut, Trash2 } from 'lucide-react';

interface ToolbarProps {
  onLogout: () => void;
  onDeleteAllData: () => void;
  status?: string;
  profileProgress?: {
    currentStep: string;
    processed: number;
    total: number;
    errors: number;
  } | null;
}

export default function Toolbar({ onLogout, onDeleteAllData, status = '', profileProgress }: ToolbarProps) {
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
          Sauna Profile Builder
          </Heading>
        </Flex>
        
        <Flex align="center" gap={3}>
          {profileProgress ? (
            <VStack spacing={1} align="end">
              <Text fontSize="xs" color="purple.600" fontWeight="medium">
                {profileProgress.currentStep}
              </Text>
              <Flex align="center" gap={2}>
                <Text fontSize="xs" color="gray.500">
                  {profileProgress.processed}/{profileProgress.total}
                  {profileProgress.errors > 0 && (
                    <Text as="span" color="red.500" ml={1}>
                      ({profileProgress.errors} failed)
                    </Text>
                  )}
                </Text>
                <Progress 
                  value={(profileProgress.processed / profileProgress.total) * 100} 
                  size="sm" 
                  width="100px"
                  colorScheme={profileProgress.errors > 0 ? "red" : "purple"}
                />
              </Flex>
            </VStack>
          ) : status && (
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              {status.length > 100 ? status.substring(0, 100) + '...' : status}
            </Text>
          )}
          
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