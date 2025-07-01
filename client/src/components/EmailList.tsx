import { Box, VStack, Button, Text, List, ListItem, Spinner, Alert, AlertIcon, Badge, Flex } from '@chakra-ui/react';
import { Mail, RefreshCw } from 'lucide-react';
import { Email } from '../types';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  onOpenFetchModal: () => void;
  isLoading: boolean;
  processingEmailIds: Set<string>;
  error: string | null;
  insightsByEmail: Record<string, any[]>;
}

export default function EmailList({ 
  emails, 
  selectedEmailId, 
  onEmailSelect, 
  onOpenFetchModal,
  isLoading,
  processingEmailIds,
  error,
  insightsByEmail
}: EmailListProps) {
  return (
    <Box flex="1" h="100%" bg="white" borderRight="1px solid" borderColor="gray.200">
      <VStack spacing={0} h="100%">
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor="gray.200" w="100%">
          <Button
            leftIcon={<RefreshCw size={16} />}
            colorScheme="blue"
            size="sm"
            onClick={onOpenFetchModal}
            isLoading={isLoading}
            loadingText={emails.length > 0 ? "Processing..." : "Fetching..."}
            w="100%"
          >
            {emails.length > 0 ? 'Refetch Emails' : 'Fetch Emails'}
          </Button>
        </Box>

        {/* Content */}
        <Box flex="1" w="100%" overflowY="auto">
          {error && (
            <Alert status="error" size="sm" m={2}>
              <AlertIcon />
              <Text fontSize="sm">{error}</Text>
            </Alert>
          )}

          {isLoading && (
            <Box p={4} textAlign="center">
              <Spinner size="md" color="blue.500" />
              <Text mt={2} fontSize="sm" color="gray.600">
                Fetching emails...
              </Text>
            </Box>
          )}

          {!isLoading && emails.length === 0 && !error && (
            <Box p={6} textAlign="center">
              <Flex justify="center" mb={3}>
                <Mail size={24} color="#A0AEC0" />
              </Flex>
              <Text fontSize="sm" color="gray.500" lineHeight="1.4" maxW="200px" mx="auto">
                No emails loaded. Click "Fetch Emails" to start.
              </Text>
            </Box>
          )}

          {emails.length > 0 && (
            <List spacing={0}>
              {emails.map((email) => {
                const isProcessing = processingEmailIds.has(email.id);
                const insightCount = insightsByEmail[email.id]?.length || 0;
                const hasInsights = insightCount > 0;
                
                return (
                  <ListItem
                    key={email.id}
                    p={3}
                    borderBottom="1px solid"
                    borderColor="gray.100"
                    cursor="pointer"
                    bg={selectedEmailId === email.id ? 'blue.50' : (isProcessing ? 'purple.50' : 'white')}
                    _hover={{ bg: selectedEmailId === email.id ? 'blue.50' : (isProcessing ? 'purple.50' : 'gray.50') }}
                    onClick={() => onEmailSelect(email.id)}
                    opacity={isProcessing ? 0.8 : 1}
                  >
                    <Flex justify="space-between" align="center">
                      <Flex align="center" gap={2} flex="1">
                        {hasInsights && (
                          <Box
                            bg="red.500"
                            color="white"
                            borderRadius="full"
                            minW="18px"
                            h="18px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="xs"
                            fontWeight="bold"
                          >
                            {insightCount}
                          </Box>
                        )}
                        <Text fontSize="sm" fontWeight="medium" color="gray.800" noOfLines={1} flex="1">
                          {email.subject}
                        </Text>
                      </Flex>
                      <Flex align="center" gap={2}>
                        {isProcessing && <Spinner size="sm" color="purple.500" />}
                        <Badge 
                          colorScheme={email.emailType === 'sent' ? 'green' : 'blue'} 
                          size="sm"
                        >
                          {email.emailType === 'sent' ? 'SENT' : 'INBOX'}
                        </Badge>
                      </Flex>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="xs" color="gray.600" noOfLines={1} flex="1" mr={2}>
                        {email.from}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {new Date(email.date).toLocaleDateString()}
                      </Text>
                    </Flex>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
} 