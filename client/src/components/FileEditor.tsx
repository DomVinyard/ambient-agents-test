import { Box, VStack, Text } from '@chakra-ui/react';
import { Edit } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import { FileItem } from '../types';

interface FileEditorProps {
  file: FileItem | null;
  onSave: (fileName: string, content: string) => void;
}

export default function FileEditor({ file, onSave }: FileEditorProps) {

  return (
    <Box flex="1" h="100%" bg="gray.50">
      <VStack spacing={0} h="100%">
        {/* Content */}
        <Box flex="1" w="100%">
          {!file ? (
            <Box p={4} textAlign="center" py={8}>
              <Edit size={32} color="#9CA3AF" />
              <Text mt={3} fontSize="sm" color="gray.500">
                Select a file to edit
              </Text>
            </Box>
          ) : (
            <MarkdownEditor
              file={file}
              onSave={onSave}
            />
          )}
        </Box>
      </VStack>
    </Box>
  );
} 