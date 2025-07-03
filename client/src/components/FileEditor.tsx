import { Box, VStack } from "@chakra-ui/react";
import { Edit } from "lucide-react";
import MarkdownEditor from "./MarkdownEditor";
import EmptyState from "./EmptyState";
import { FileItem } from "../types";

interface FileEditorProps {
  file: FileItem | null;
  hasFiles: boolean;
  onSave: (fileName: string, content: string) => void;
}

export default function FileEditor({
  file,
  hasFiles,
  onSave,
}: FileEditorProps) {
  return (
    <Box flex="1" h="100%" bg="gray.50">
      <VStack spacing={0} h="100%">
        {/* Content */}
        <Box flex="1" w="100%">
          {!file ? (
            hasFiles ? (
              <EmptyState
                icon={Edit}
                title="Select a file to edit"
                description="Choose a file from the sidebar to view and edit its contents"
                iconSize={32}
              />
            ) : null
          ) : (
            <MarkdownEditor file={file} onSave={onSave} />
          )}
        </Box>
      </VStack>
    </Box>
  );
}
