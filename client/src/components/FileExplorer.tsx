import { Box, VStack, Text, Button, Flex, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { File, FolderOpen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FileItem {
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface FileExplorerProps {
  selectedFile: string | null;
  onFileSelect: (fileName: string) => void;
  onFileDelete: (fileName: string) => void;
  files: Record<string, FileItem>;
}

export default function FileExplorer({ selectedFile, onFileSelect, onFileDelete, files }: FileExplorerProps) {
  const fileNames = Object.keys(files).sort();
  const [contextMenuFile, setContextMenuFile] = useState<string | null>(null);

  const handleContextMenu = (e: React.MouseEvent, fileName: string) => {
    e.preventDefault();
    setContextMenuFile(fileName);
  };

  const handleDeleteClick = (fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      onFileDelete(fileName);
    }
    setContextMenuFile(null);
  };

  return (
    <Box 
      w="300px" 
      h="100%" 
      borderRight="1px solid"
      borderColor="gray.200"
      bg="gray.50"
      p={4}
    >
      <Flex align="center" mb={4}>
        <FolderOpen size={16} color="#4A5568" />
        <Text ml={2} fontWeight="semibold" color="gray.700">
          Profile Files
        </Text>
      </Flex>
      
      <VStack align="stretch" spacing={1}>
        {fileNames.length === 0 ? (
          <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
            No files yet.
            <br />
            Click "Basic Profile" to get started.
          </Text>
        ) : (
          fileNames.map((fileName) => (
            <Box key={fileName} position="relative">
              <Button
                variant={selectedFile === fileName ? "solid" : "ghost"}
                colorScheme={selectedFile === fileName ? "blue" : "gray"}
                size="sm"
                justifyContent="flex-start"
                leftIcon={<File size={14} />}
                onClick={() => onFileSelect(fileName)}
                onContextMenu={(e) => handleContextMenu(e, fileName)}
                fontWeight="normal"
                px={2}
                w="100%"
              >
                <Text fontSize="sm" isTruncated>
                  {fileName}
                </Text>
              </Button>
              
              {contextMenuFile === fileName && (
                <Menu isOpen={true} onClose={() => setContextMenuFile(null)}>
                  <MenuButton as="div" />
                  <MenuList>
                    <MenuItem 
                      icon={<Trash2 size={14} />} 
                      onClick={() => handleDeleteClick(fileName)}
                      color="red.500"
                    >
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </Box>
          ))
        )}
      </VStack>
      
      {fileNames.length > 0 && (
        <Box mt={6} pt={4} borderTop="1px solid" borderColor="gray.200">
          <Text fontSize="xs" color="gray.500">
            {fileNames.length} file{fileNames.length !== 1 ? 's' : ''}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Right-click to delete
          </Text>
        </Box>
      )}
    </Box>
  );
} 