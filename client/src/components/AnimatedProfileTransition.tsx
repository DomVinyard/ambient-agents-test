import { useState, useEffect } from 'react';
import { Box, VStack, Text, Button, useToast } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import BeautifulMarkdownEditor from './BeautifulMarkdownEditor';
import SaunaAvatar from './SaunaAvatar';

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
  
  // Optional mock mode indicator
  showMockIndicator?: boolean;
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
  showMockIndicator = false
}: AnimatedProfileTransitionProps) {
  const [showProfile, setShowProfile] = useState(false);

  // Start transition when complete
  useEffect(() => {
    if (isComplete) {
      // Small delay before starting transition
      const timer = setTimeout(() => {
        setShowProfile(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

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
                  
                  <Text fontSize="md" fontWeight="medium" color="gray.800" textAlign="center" lineHeight="1.6">
                    Here's what I found, you can edit out anything you don't want me to know
                  </Text>
                </Box>
              </Box>
            </motion.div>
          )}

          {/* Speech bubble that expands into editor */}
          <motion.div
            layoutId="speech-bubble"
            style={{ 
              position: 'relative',
              width: showProfile ? '100%' : '320px',
              height: showProfile ? '60vh' : 'auto',
              flexShrink: showProfile ? 1 : 0,
              minHeight: showProfile ? '400px' : 'auto'
            }}
            transition={{ type: "spring", stiffness: 150, damping: 25 }}
          >
            <Box
              bg="white"
              borderRadius={showProfile ? "12px" : "20px"}
              p={showProfile ? 0 : 6}
              boxShadow="0 4px 20px rgba(0,0,0,0.1)"
              position="relative"
              border="1px solid"
              borderColor="gray.200"
              h={showProfile ? "100%" : "auto"}
              overflow="hidden"
            >
              {/* Speech bubble tail - only show during loading */}
              <AnimatePresence>
                {!showProfile && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content inside the bubble */}
              <AnimatePresence mode="wait">
                {!showProfile ? (
                  // Loading text
                  <motion.div
                    key="loading-text"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Text fontSize="lg" fontWeight="medium" color="gray.800" textAlign="center" lineHeight="1.6">
                      {statusMessage}
                    </Text>
                  </motion.div>
                ) : (
                  // Editor content
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    style={{ height: '100%' }}
                  >
                    <BeautifulMarkdownEditor
                      value={profileContent}
                      onChange={onContentChange}
                      placeholder="Your profile will appear here..."
                      height="100%"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
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
                    height: '100%',
                    background: 'linear-gradient(90deg, #5BA163, #FFC116)',
                    borderRadius: '9999px',
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
                onClick={onConfirm}
                isDisabled={!profileContent}
                px={8}
                _hover={{ 
                  bg: "gray.800",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
                }}
                _active={{ transform: "translateY(0)" }}
                transition="all 0.2s"
              >
                Looks good →
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
          <Text color="red.500" mb={4}>{error}</Text>
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