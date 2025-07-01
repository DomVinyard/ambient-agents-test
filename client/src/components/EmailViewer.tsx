import { Box, VStack, Button, Text, Divider, Badge, Alert, AlertIcon, IconButton, Flex } from '@chakra-ui/react';
import { Brain, Mail, X } from 'lucide-react';
import { Email } from '../types';

interface EmailViewerProps {
  email: Email | null;
  onExtractInsights: () => void;
  isLoading: boolean;
  error: string | null;
  onClose?: () => void;
  showCloseButton?: boolean;
  hasInsights?: boolean;
}

export default function EmailViewer({ 
  email, 
  onExtractInsights, 
  isLoading, 
  error,
  onClose,
  showCloseButton = false,
  hasInsights = false
}: EmailViewerProps) {
  return (
    <Box w="100%" h="100%" bg="white" borderRight="1px solid" borderColor="gray.200">
      <VStack spacing={0} h="100%">
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor="gray.200" w="100%">
          <Flex gap={2} align="center">
            <Button
              leftIcon={<Brain size={16} />}
              colorScheme="green"
              size="sm"
              onClick={onExtractInsights}
              isLoading={isLoading}
              loadingText={hasInsights ? "Reextracting..." : "Extracting..."}
              isDisabled={!email}
              flex="1"
            >
              {hasInsights ? 'Reextract Insights →' : 'Extract Insights →'}
            </Button>
            {showCloseButton && onClose && (
              <IconButton
                icon={<X size={16} />}
                size="sm"
                variant="ghost"
                aria-label="Close"
                onClick={onClose}
              />
            )}
          </Flex>
        </Box>

        {/* Content */}
        <Box flex="1" w="100%" overflowY="auto" p={4}>
          {error && (
            <Alert status="error" size="sm" mb={4}>
              <AlertIcon />
              <Text fontSize="sm">{error}</Text>
            </Alert>
          )}

          {!email && (
            <Box textAlign="center" py={8}>
              <Mail size={48} color="#CBD5E0" />
              <Text mt={4} fontSize="md" color="gray.500">
                Select an email to view
              </Text>
              <Text fontSize="sm" color="gray.400">
                Choose an email from the list to see its content
              </Text>
            </Box>
          )}

          {email && (
            <VStack spacing={4} align="stretch">
              {/* Email Header */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" color="gray.800" mb={2} wordBreak="break-word">
                  {email.subject}
                </Text>
                
                <VStack spacing={2} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.600" wordBreak="break-word">
                      <Text as="span" fontWeight="medium">From:</Text> {email.from}
                    </Text>
                  </Box>
                  
                  {email.to && (
                    <Box>
                      <Text fontSize="sm" color="gray.600" wordBreak="break-word">
                        <Text as="span" fontWeight="medium">To:</Text> {email.to}
                      </Text>
                    </Box>
                  )}
                  
                  {email.cc && (
                    <Box>
                      <Text fontSize="sm" color="gray.600" wordBreak="break-word">
                        <Text as="span" fontWeight="medium">CC:</Text> {email.cc}
                      </Text>
                    </Box>
                  )}
                  
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      <Text as="span" fontWeight="medium">Date:</Text> {new Date(email.date).toLocaleString()}
                    </Text>
                  </Box>
                  
                  <Box>
                    <Badge colorScheme="blue" size="sm">
                      ID: {email.id.substring(0, 8)}...
                    </Badge>
                  </Box>
                </VStack>
              </Box>

              <Divider />

              {/* Email Content */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
                  Email Content:
                </Text>
                <Box 
                  p={3} 
                  bg="gray.50" 
                  borderRadius="md" 
                  border="1px solid" 
                  borderColor="gray.200"
                  maxH="400px"
                  overflowY="auto"
                >
                  <Text fontSize="sm" color="gray.700" lineHeight="1.6" whiteSpace="pre-wrap" wordBreak="break-word">
                    {email.fullBody || email.snippet || 'No content available'}
                  </Text>
                </Box>
              </Box>

              <Box mt={4}>
                <Text fontSize="xs" color="gray.500">
                  Click "Extract Insights" to analyze this email with AI and extract key information about you.
                </Text>
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
} 