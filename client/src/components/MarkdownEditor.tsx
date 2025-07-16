import { Box, Text } from "@chakra-ui/react";
import MDEditor from "@uiw/react-md-editor";
import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import { FileItem } from "../types";

interface MarkdownEditorProps {
  file: FileItem | null;
  onSave: (fileName: string, content: string) => void;
}

export default function MarkdownEditor({ file, onSave }: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasChanges(false);
    }
  }, [file]);

  const handleContentChange = (value: string = "") => {
    setContent(value);
    setHasChanges(value !== (file?.content || ""));
  };

  const handleSave = () => {
    if (file && hasChanges) {
      setIsSaving(true);
      onSave(file.name, content);
      setHasChanges(false);
      // Show saving feedback briefly
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Auto-save after 500ms of no changes (more immediate)
  useEffect(() => {
    if (hasChanges && file) {
      const timer = setTimeout(() => {
        handleSave();
      }, 500);
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
          <Edit size={48} color="#CBD5E0" style={{ margin: "0 auto 16px" }} />
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
      <Box h="100%" p={4} overflow="hidden">
        <MDEditor
          value={content}
          onChange={handleContentChange}
          preview="edit"
          hideToolbar={true}
          data-color-mode="light"
          height="calc(100vh - 140px)"
        />
      </Box>

      <Box
        position="absolute"
        bottom={4}
        right={4}
        fontSize="xs"
        color={isSaving ? "blue.500" : hasChanges ? "orange.500" : "gray.400"}
      >
        {isSaving
          ? "Saving..."
          : hasChanges
          ? "Unsaved changes"
          : `Last updated: ${file.lastModified.toLocaleString()}`}
      </Box>
    </Box>
  );
}
