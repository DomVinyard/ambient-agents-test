import { Modal, ModalOverlay, ModalContent } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import AnimatedProfileTransition from "./AnimatedProfileTransition";

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
  files?: Record<string, any>; // Access to all files to get full profile
}

export default function ProfilePreviewModal({
  isOpen,
  onClose,
  fileName,
  content,
  files = {},
}: ProfilePreviewModalProps) {
  const [currentContent, setCurrentContent] = useState(content);
  const [isEditMode, setIsEditMode] = useState(false);

  const isAutomationFile = fileName.includes("automation");
  const fullProfileContent =
    files["full.md"]?.content || "No full profile available yet...";

  const getStatusMessage = () => {
    if (isAutomationFile && !isEditMode) {
      return "Here are your automation opportunities";
    }
    return "Here's your complete profile";
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
    // When entering edit mode from automation, switch to full profile content
    if (isAutomationFile) {
      setCurrentContent(fullProfileContent);
    }
  };

  const handleContentChange = (newContent: string) => {
    setCurrentContent(newContent);
  };

  const handleConfirm = () => {
    // Could save changes here if needed
    onClose();
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentContent(content);
      setIsEditMode(false);
    }
  }, [isOpen, content]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
      <ModalContent
        maxW="100vw"
        maxH="100vh"
        borderRadius="0"
        overflow="hidden"
        bg="gray.50"
        m={0}
      >
        <AnimatedProfileTransition
          overallProgress={100}
          statusMessage={getStatusMessage()}
          error={null}
          profileContent={currentContent}
          onContentChange={handleContentChange}
          onConfirm={handleConfirm}
          onLogout={onClose}
          isComplete={true}
          isPreviewMode={true}
          onEnterEditMode={handleEnterEditMode}
        />
      </ModalContent>
    </Modal>
  );
}
