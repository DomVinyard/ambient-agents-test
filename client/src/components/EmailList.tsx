import { Box, VStack, Button, Text, List, ListItem, Spinner, Alert, AlertIcon, Badge, Flex } from '@chakra-ui/react';
import { Mail, RefreshCw } from 'lucide-react';
import { Email } from '../types';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  onFetchEmails: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function EmailList({ 
  emails, 
  selectedEmailId, 
  onEmailSelect, 
  onFetchEmails, 
  isLoading, 
  error 
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
            onClick={onFetchEmails}
            isLoading={isLoading}
            loadingText={emails.length > 0 ? "Refetching..." : "Fetching..."}
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
              {emails.map((email) => (
                <ListItem
                  key={email.id}
                  p={3}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                  cursor="pointer"
                  bg={selectedEmailId === email.id ? 'blue.50' : 'white'}
                  _hover={{ bg: selectedEmailId === email.id ? 'blue.50' : 'gray.50' }}
                  onClick={() => onEmailSelect(email.id)}
                >
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="medium" color="gray.800" noOfLines={1} flex="1">
                      {email.subject}
                    </Text>
                    <Badge 
                      colorScheme={email.emailType === 'sent' ? 'green' : 'blue'} 
                      size="sm"
                      ml={2}
                    >
                      {email.emailType === 'sent' ? 'SENT' : 'INBOX'}
                    </Badge>
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
              ))}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
} 