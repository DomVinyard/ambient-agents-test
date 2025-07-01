import { Box, VStack, Text, List, ListItem, Badge, Flex, Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FileItem } from '../types';

interface FileListProps {
  files: Record<string, FileItem>;
  selectedFile: FileItem | null;
  onFileSelect: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onDeleteAll: () => void;
}

export default function FileList({ files, selectedFile, onFileSelect, onDeleteFile, onDeleteAll }: FileListProps) {
  const fileEntries = Object.entries(files);
  const [contextMenuFile, setContextMenuFile] = useState<string | null>(null);
  
  // Emoji map for profile categories
  const categoryEmojis: Record<string, string> = {
    behavioral: '🎯',
    goals: '🚀', 
    relationships: '👥',
    professional: '💼',
    personal: '❤️',
    accounts: '🔐',
    style: '✨',
    communication: '💬',
    general: '📄',
    bio: '📄'
  };
  
  // Group files by category (extracted from filename)
  const getCategory = (fileName: string) => {
    const baseName = fileName.replace('.md', '');
    return baseName === 'bio' ? 'general' : baseName;
  };

  const getCategoryWithEmoji = (category: string) => {
    const emoji = categoryEmojis[category] || '📄';
    return `${emoji} ${category}`;
  };

  const handleRightClick = (e: React.MouseEvent, fileName: string) => {
    e.preventDefault();
    setContextMenuFile(fileName);
  };

  const handleDeleteFile = (fileName: string) => {
    const category = getCategory(fileName);
    if (window.confirm(`Are you sure you want to delete ${getCategoryWithEmoji(category)}.md? This action cannot be undone.`)) {
      onDeleteFile(fileName);
    }
    setContextMenuFile(null);
  };

  return (
    <Box flex="1" h="100%" bg="gray.50" borderRight="1px solid" borderColor="gray.300">
      <VStack spacing={0} h="100%">
        {/* Delete All Button */}
        {fileEntries.length > 0 && (
          <Box p={2} w="100%">
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={onDeleteAll}
              w="100%"
            >
              Delete All
            </Button>
          </Box>
        )}
        
        {/* Content */}
        <Box flex="1" w="100%" overflowY="auto" pt={fileEntries.length > 0 ? 0 : 4}>
          {fileEntries.length === 0 && (
            <Box p={4} textAlign="center" py={8} mt={'50%'}>
              <FileText size={32} color="#9CA3AF" style={{ margin: '0 auto' }} />
              <Text mt={3} fontSize="sm" color="gray.500">
                No profile yet
              </Text>
            </Box>
          )}

          {fileEntries.length > 0 && (
            <List spacing={0}>
              {fileEntries.map(([fileName, file]) => {
                const category = getCategory(fileName);
                const isSelected = selectedFile?.name === fileName;
                
                return (
                  <Menu 
                    key={fileName} 
                    isOpen={contextMenuFile === fileName}
                    onClose={() => setContextMenuFile(null)}
                    placement="right-start"
                  >
                    <MenuButton
                      as={ListItem}
                      p={3}
                      borderBottom="1px solid"
                      borderColor="gray.100"
                      cursor="pointer"
                      bg={isSelected ? 'blue.50' : 'white'}
                      _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
                      _active={{}}
                      onClick={() => onFileSelect(fileName)}
                      onContextMenu={(e) => handleRightClick(e, fileName)}
                    >
                      <Flex justify="space-between" align="center" mb={1}>
                        <Text fontSize="sm" fontWeight="medium" color="gray.800" noOfLines={1} flex="1">
                          {getCategoryWithEmoji(category)}
                        </Text>
                        <Badge 
                          colorScheme="gray" 
                          size="sm"
                          ml={2}
                        >
                          .md
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" color="gray.500">
                        Updated {new Date(file.updatedAt).toLocaleDateString()}
                      </Text>
                    </MenuButton>
                    <MenuList>
                      <MenuItem 
                        icon={<Trash2 size={16} />} 
                        onClick={() => handleDeleteFile(fileName)}
                        color="red.600"
                      >
                        Delete {getCategoryWithEmoji(category)}.md
                      </MenuItem>
                    </MenuList>
                  </Menu>
                );
              })}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
} 