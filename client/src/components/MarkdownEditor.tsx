import { Box, Text, Flex } from '@chakra-ui/react';
import MDEditor from '@uiw/react-md-editor';
import { useState, useEffect } from 'react';
import { Edit, Eye } from 'lucide-react';

interface FileItem {
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface MarkdownEditorProps {
  file: FileItem | null;
  onSave: (fileName: string, content: string) => void;
}

export default function MarkdownEditor({ file, onSave }: MarkdownEditorProps) {
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasChanges(false);
    }
  }, [file]);

  const handleContentChange = (value: string = '') => {
    setContent(value);
    setHasChanges(value !== (file?.content || ''));
  };

  const handleSave = () => {
    if (file && hasChanges) {
      onSave(file.name, content);
      setHasChanges(false);
    }
  };

  // Auto-save after 2 seconds of no changes
  useEffect(() => {
    if (hasChanges && file) {
      const timer = setTimeout(() => {
        handleSave();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [content, hasChanges, file]);

  if (!file) {
    return (
      <Box 
        flex="1" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        bg="white"
      >
        <Box textAlign="center">
          <Edit size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
          <Text color="gray.500" fontSize="lg">
            Select a file to edit
          </Text>
          <Text color="gray.400" fontSize="sm" mt={2}>
            Choose a file from the sidebar to view and edit its contents
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flex="1" bg="white" position="relative">
      <Flex 
        align="center" 
        justify="space-between" 
        px={4} 
        py={2} 
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="gray.50"
      >
        <Flex align="center">
          <Edit size={16} color="#4A5568" />
          <Text ml={2} fontWeight="semibold" color="gray.700">
            {file.name}
          </Text>
        </Flex>
        
        {hasChanges && (
          <Text fontSize="xs" color="blue.500">
            Autosaving...
          </Text>
        )}
      </Flex>
      
      <Box h="calc(100% - 60px)" p={4}>
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview="edit"
          hideToolbar={false}
          data-color-mode="light"
          height="100%"
        />
      </Box>
      
      <Box 
        position="absolute" 
        bottom={4} 
        right={4}
        fontSize="xs" 
        color="gray.400"
      >
        Last updated: {new Date(file.updatedAt).toLocaleString()}
      </Box>
    </Box>
  );
} 