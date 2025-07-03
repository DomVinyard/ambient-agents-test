import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import BeautifulMarkdownEditor from "./BeautifulMarkdownEditor";

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
  files?: Record<string, any>;
}

export default function ProfilePreviewModal({
  isOpen,
  onClose,
  fileName,
  content,
  files = {},
}: ProfilePreviewModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const toast = useToast();

  const isAutomationFile = fileName === "automation.md";

  const handleEnterEditMode = () => {
    setEditedContent(content);
    setIsEditMode(true);
  };

  const handleSave = () => {
    // In admin mode, we don't actually save from the preview modal
    // The FileEditor component handles actual saving
    toast({
      title: "Note",
      description: "Use the File Editor in the main dashboard to save changes.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
    onClose();
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedContent(content);
  };

  const formatAutomationContent = (jsonContent: string) => {
    try {
      const automationData = JSON.parse(jsonContent);
      if (automationData.summary && automationData.automations) {
        return (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="xl" fontWeight="bold" mb={3}>
                Summary
              </Text>
              <Text>{automationData.summary}</Text>
            </Box>

            <Box>
              <Text fontSize="xl" fontWeight="bold" mb={3}>
                Automations ({automationData.automations.length})
              </Text>
              <VStack spacing={4} align="stretch">
                {automationData.automations.map(
                  (automation: any, index: number) => (
                    <Box key={index} p={4} bg="gray.50" borderRadius="md">
                      <Text fontWeight="semibold" fontSize="lg">
                        {automation.name}
                      </Text>
                      <Text color="gray.600" mt={1}>
                        {automation.description}
                      </Text>
                      <HStack mt={2} spacing={2}>
                        <Text
                          fontSize="sm"
                          px={2}
                          py={1}
                          bg="blue.100"
                          borderRadius="sm"
                        >
                          {automation.category}
                        </Text>
                        <Text
                          fontSize="sm"
                          px={2}
                          py={1}
                          bg="orange.100"
                          borderRadius="sm"
                        >
                          {automation.priority} priority
                        </Text>
                      </HStack>
                    </Box>
                  )
                )}
              </VStack>
            </Box>
          </VStack>
        );
      }
    } catch (error) {
      // Fall back to raw content if parsing fails
    }

    return (
      <Box>
        <Text fontSize="sm" color="gray.500" mb={2}>
          Raw JSON Content:
        </Text>
        <Textarea
          value={jsonContent}
          readOnly
          height="400px"
          fontFamily="monospace"
          fontSize="sm"
        />
      </Box>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="4xl" maxH="90vh">
        <ModalHeader>
          Preview: {fileName}
          {!isEditMode && (
            <Button
              size="sm"
              ml={4}
              onClick={handleEnterEditMode}
              colorScheme="blue"
            >
              Edit Mode
            </Button>
          )}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          {isEditMode ? (
            <VStack spacing={4} align="stretch">
              <BeautifulMarkdownEditor
                value={editedContent}
                onChange={setEditedContent}
                placeholder="Edit your content..."
              />
              <HStack justify="flex-end">
                <Button onClick={handleCancel}>Cancel</Button>
                <Button colorScheme="blue" onClick={handleSave}>
                  Note: Use File Editor to Save
                </Button>
              </HStack>
            </VStack>
          ) : (
            <Box maxH="70vh" overflowY="auto">
              {isAutomationFile ? (
                formatAutomationContent(content)
              ) : (
                <BeautifulMarkdownEditor
                  value={content}
                  onChange={() => {}} // Read-only in preview mode
                  placeholder="Content preview..."
                />
              )}
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
