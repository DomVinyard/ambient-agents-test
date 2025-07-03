import { Modal, ModalOverlay, ModalContent, Box } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import AnimatedProfileTransition from "./AnimatedProfileTransition";
import AutomationListView from "./AutomationListView";

// Using AutomationListView component from user flow instead of custom implementation

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

  // Parse automation content if it's an automation file
  let automationData: { summary: string; automations: any[] } | null = null;
  if (isAutomationFile && content) {
    try {
      automationData = JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse automation JSON:", error);
    }
  }

  const getStatusMessage = () => {
    if (isAutomationFile && !isEditMode) {
      return "What can I help you with?";
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

  // For automation files in preview mode, show custom automation list
  const displayContent =
    isAutomationFile && !isEditMode
      ? "" // We'll use a custom component instead of the markdown editor
      : currentContent;

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
        {isAutomationFile && !isEditMode && automationData ? (
          // Use the same AutomationListView as the user flow
          <AutomationListView
            automationData={automationData}
            onContinue={handleEnterEditMode}
            onLogout={onClose}
            userInfo={{
              firstName: "Admin",
              lastName: "User",
              email: "admin@example.com",
            }}
          />
        ) : (
          // Original AnimatedProfileTransition for profile content and edit mode
          <AnimatedProfileTransition
            overallProgress={100}
            statusMessage={getStatusMessage()}
            error={null}
            profileContent={displayContent}
            onContentChange={handleContentChange}
            onConfirm={handleConfirm}
            onLogout={onClose}
            isComplete={true}
            isPreviewMode={true}
            onEnterEditMode={handleEnterEditMode}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
