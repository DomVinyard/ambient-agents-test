import { useState, useEffect } from "react";
import { Box, VStack, Text, Button, useToast } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import BeautifulMarkdownEditor from "./BeautifulMarkdownEditor";
import SaunaAvatar from "./SaunaAvatar";

interface AnimatedProfileTransitionProps {
  // Loading props
  overallProgress: number;
  statusMessage: string;
  error?: string | null;
  onRetry?: () => void;

  // Profile props
  profileContent: string;
  onContentChange: (value: string) => void;
  onConfirm: () => void;
  onLogout: () => void;

  // Animation state
  isComplete: boolean;
  skipLoadingDelay?: boolean; // Skip the 500ms delay when transitioning from automations

  // Preview mode props (optional)
  isPreviewMode?: boolean;
  onEnterEditMode?: () => void;
}

export default function AnimatedProfileTransition({
  overallProgress,
  statusMessage,
  error,
  onRetry,
  profileContent,
  onContentChange,
  onConfirm,
  onLogout,
  isComplete,
  skipLoadingDelay = false,
  isPreviewMode = false,
  onEnterEditMode,
}: AnimatedProfileTransitionProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Start transition when complete
  useEffect(() => {
    if (isComplete) {
      if (skipLoadingDelay) {
        // Immediate transition when coming from automations
        setShowProfile(true);
      } else {
        // Small delay before starting transition for normal flow
        const timer = setTimeout(() => {
          setShowProfile(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isComplete, skipLoadingDelay]);

  // Handle button clicks based on current state
  const handleButtonClick = () => {
    if (isPreviewMode && !isEditMode && onEnterEditMode) {
      // Preview mode: transition to edit mode
      setIsEditMode(true);
      onEnterEditMode();
    } else {
      // Edit mode or normal flow: call onConfirm (will close modal in preview context)
      onConfirm();
    }
  };

  return (
    <Box h="100vh" bg="gray.50" position="relative" overflow="hidden">
      {/* Logout button - only show in profile mode */}
      {showProfile && (
        <Button
          position="fixed"
          top={4}
          right={4}
          variant="ghost"
          size="sm"
          onClick={onLogout}
          zIndex={10}
        >
          Logout
        </Button>
      )}

      {/* Main content area */}
      <Box
        h="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        px="6"
        py="6"
      >
        <VStack
          spacing={showProfile ? 4 : 6}
          maxW={showProfile ? "4xl" : "md"}
          w="full"
          h={showProfile ? "full" : "auto"}
          justify="center"
          mt="-8vh"
        >
          {/* Avatar - stays centered above content */}
          <motion.div
            layoutId="avatar"
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            style={{ flexShrink: 0 }}
          >
            <SaunaAvatar
              size="48px"
              showPulse={!showProfile}
              isProfileMode={showProfile}
            />
          </motion.div>

          {/* Additional speech bubble above editor */}
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              style={{ flexShrink: 0 }}
            >
              <Box position="relative" maxW="400px">
                <Box
                  bg="white"
                  borderRadius="20px"
                  p={4}
                  boxShadow="0 4px 20px rgba(0,0,0,0.1)"
                  position="relative"
                  border="1px solid"
                  borderColor="gray.100"
                >
                  {/* Speech bubble tail pointing up at avatar */}
                  <Box
                    position="absolute"
                    top="-8px"
                    left="50%"
                    w="16px"
                    h="16px"
                    bg="white"
                    borderLeft="1px solid"
                    borderTop="1px solid"
                    borderColor="gray.200"
                    borderRadius="2px"
                    transform="translateX(-50%) rotate(45deg)"
                    zIndex={1}
                  />

                  <Text
                    fontSize="md"
                    fontWeight="medium"
                    color="gray.800"
                    textAlign="center"
                    lineHeight="1.6"
                  >
                    {isPreviewMode && !isEditMode
                      ? "What can I help you with?"
                      : "I wrote a bio from your emails, you can edit out anything that I didn't get right."}
                  </Text>
                </Box>
              </Box>
            </motion.div>
          )}

          {/* Speech bubble that expands into editor */}
          <motion.div
            layout
            style={{
              position: "relative",
              width: showProfile ? "100%" : "320px",
              height: showProfile ? "60vh" : "auto",
              flexShrink: showProfile ? 1 : 0,
              minHeight: showProfile ? "400px" : "auto",
            }}
            transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
          >
            <AnimatePresence mode="wait">
              {!showProfile ? (
                // Loading state
                <motion.div
                  key="loading-bubble"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Box
                    bg="white"
                    borderRadius="20px"
                    p={6}
                    boxShadow="0 4px 20px rgba(0,0,0,0.1)"
                    position="relative"
                    border="1px solid"
                    borderColor="gray.200"
                    h="100%"
                    overflow="hidden"
                  >
                    {/* Speech bubble tail - only show during loading */}
                    <Box
                      position="absolute"
                      top="-8px"
                      left="50%"
                      w="16px"
                      h="16px"
                      bg="white"
                      borderLeft="1px solid"
                      borderTop="1px solid"
                      borderColor="gray.200"
                      borderRadius="2px"
                      transform="translateX(-50%) rotate(45deg)"
                      zIndex={2}
                    />

                    <Text
                      fontSize="lg"
                      fontWeight="medium"
                      color="gray.800"
                      textAlign="center"
                      lineHeight="1.6"
                    >
                      {statusMessage}
                    </Text>
                  </Box>
                </motion.div>
              ) : isPreviewMode && !isEditMode ? (
                // Preview mode
                <motion.div
                  key="preview-mode"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Box
                    bg="white"
                    borderRadius="12px"
                    p={0}
                    boxShadow="0 4px 20px rgba(0,0,0,0.1)"
                    position="relative"
                    border="1px solid"
                    borderColor="gray.200"
                    h="100%"
                    overflow="hidden"
                  >
                    <BeautifulMarkdownEditor
                      value={profileContent}
                      onChange={() => {}} // Read-only in preview
                      placeholder="Your profile will appear here..."
                      height="100%"
                    />
                  </Box>
                </motion.div>
              ) : (
                // Edit mode
                <motion.div
                  key="edit-mode"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Box
                    bg="white"
                    borderRadius="12px"
                    p={0}
                    boxShadow="0 4px 20px rgba(0,0,0,0.1)"
                    position="relative"
                    border="1px solid"
                    borderColor="gray.200"
                    h="100%"
                    overflow="hidden"
                  >
                    <BeautifulMarkdownEditor
                      value={profileContent}
                      onChange={onContentChange}
                      placeholder="Your profile will appear here..."
                      height="100%"
                    />
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Loading state progress bar */}
          {!showProfile && (
            <VStack spacing={3} w="full" maxW="280px" flexShrink={0}>
              <Box
                w="full"
                h="12px"
                bg="gray.200"
                borderRadius="full"
                overflow="hidden"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #5BA163, #FFC116)",
                    borderRadius: "9999px",
                  }}
                />
              </Box>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                {overallProgress}%
              </Text>
            </VStack>
          )}

          {/* Profile controls */}
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.0 }}
              style={{ flexShrink: 0 }}
            >
              <Button
                bg="black"
                color="white"
                size="lg"
                onClick={handleButtonClick}
                isDisabled={!profileContent}
                px={8}
                _hover={{
                  bg: "gray.800",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                }}
                _active={{ transform: "translateY(0)" }}
                transition="all 0.2s"
              >
                {isPreviewMode && !isEditMode ? "Next →" : "Look's Good →"}
              </Button>
            </motion.div>
          )}
        </VStack>
      </Box>

      {/* Error handling */}
      {error && !showProfile && (
        <Box
          position="absolute"
          bottom="20%"
          left="50%"
          transform="translateX(-50%)"
          textAlign="center"
        >
          <Text color="red.500" mb={4}>
            {error}
          </Text>
          {onRetry && (
            <Button onClick={onRetry} colorScheme="blue">
              Try Again
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
