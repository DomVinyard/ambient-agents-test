import { Box, VStack, Text, Button } from '@chakra-ui/react';
import SaunaAvatar from './SaunaAvatar';

interface ProfileLoadingScreenProps {
  overallProgress: number;
  error?: string | null;
  onRetry?: () => void;
  onClick?: () => void;
  showCompletionMessage?: boolean;
  statusMessage?: string;
}

export default function ProfileLoadingScreen({ 
  overallProgress, 
  error, 
  onRetry, 
  onClick,
  showCompletionMessage = false,
  statusMessage = "Checking your emails..."
}: ProfileLoadingScreenProps) {
  const isComplete = overallProgress >= 100;

  return (
    <Box 
      minH="100vh" 
      bg="gray.50" 
      color="gray.800"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      position="relative"
      cursor={isComplete && onClick ? 'pointer' : 'default'}
      onClick={onClick}
    >
      <VStack spacing={6} maxW="md" w="full">
        {/* AI Avatar with soft faded edges */}
        <Box position="relative">
          <SaunaAvatar size="48px" showPulse={true} />
        </Box>

        {/* Speech bubble with loading message */}
        <Box position="relative" maxW="320px">
          <Box
            bg="white"
            borderRadius="20px"
            p={6}
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
            
            <Text fontSize="lg" fontWeight="medium" color="gray.800" textAlign="center" lineHeight="1.6">
              {statusMessage}
            </Text>
          </Box>
        </Box>

        {/* Progress bar */}
        <VStack spacing={3} w="full" maxW="280px">
          <Box
            w="full"
            h="12px"
            bg="gray.200"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              h="full"
              bg="linear-gradient(90deg, #5BA163, #FFC116)"
              borderRadius="full"
              width={`${overallProgress}%`}
              transition="width 0.3s ease"
            />
          </Box>
          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            {overallProgress}%
          </Text>

          {showCompletionMessage && isComplete && (
            <VStack spacing={2} mt={4}>
              <Text color="green.600" fontWeight="medium" fontSize="sm">
                ✨ Complete! Click anywhere to continue
              </Text>
            </VStack>
          )}
        </VStack>
      </VStack>
      
      {error && (
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