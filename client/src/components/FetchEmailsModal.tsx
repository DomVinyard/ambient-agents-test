import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Checkbox,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { Mail, Zap } from 'lucide-react';
import { useState } from 'react';

interface FetchEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetchEmails: (options: {
    buildProfile: boolean;
    sentCount: number;
    receivedCount: number;
    deleteProfileFiles: boolean;
  }) => void;
  isLoading: boolean;
  hasExistingEmails: boolean;
  hasExistingProfileFiles: boolean;
}

export default function FetchEmailsModal({
  isOpen,
  onClose,
  onFetchEmails,
  isLoading,
  hasExistingEmails,
  hasExistingProfileFiles
}: FetchEmailsModalProps) {
  const [buildProfile, setBuildProfile] = useState(true);
  const [sentCount, setSentCount] = useState(10);
  const [receivedCount, setReceivedCount] = useState(10);
  const [deleteProfileFiles, setDeleteProfileFiles] = useState(true);

  const handleSubmit = () => {
    onFetchEmails({
      buildProfile,
      sentCount,
      receivedCount,
      deleteProfileFiles
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Mail size={20} />
            <Text>{hasExistingEmails ? 'Refetch Emails' : 'Fetch Emails'}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={5} align="stretch">
            <Alert status="info" size="sm">
              <AlertIcon />
              <Text fontSize="sm">
                {hasExistingEmails 
                  ? 'This will replace your current emails with fresh data from Gmail.'
                  : 'Connect to Gmail and fetch your recent emails for analysis.'
                }
              </Text>
            </Alert>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium">Email Count Settings</FormLabel>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">Received emails (Inbox):</Text>
                  <NumberInput
                    value={receivedCount}
                    onChange={(_, value) => setReceivedCount(value || 10)}
                    min={1}
                    max={50}
                    size="sm"
                    width="80px"
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm">Sent emails:</Text>
                  <NumberInput
                    value={sentCount}
                    onChange={(_, value) => setSentCount(value || 10)}
                    min={1}
                    max={50}
                    size="sm"
                    width="80px"
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
              </VStack>
            </FormControl>

            <Divider />

            <FormControl>
              <Checkbox
                isChecked={buildProfile}
                onChange={(e) => setBuildProfile(e.target.checked)}
                colorScheme="purple"
              >
                <VStack align="start" spacing={1}>
                  <HStack>
                    <Zap size={16} />
                    <Text fontWeight="medium">Auto-build profile after fetching</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.600" ml={5}>
                    Automatically extract insights and generate profile files from all fetched emails
                  </Text>
                </VStack>
              </Checkbox>
            </FormControl>

            {hasExistingProfileFiles && (
              <>
                <Divider />
                <FormControl>
                  <Checkbox
                    isChecked={deleteProfileFiles}
                    onChange={(e) => setDeleteProfileFiles(e.target.checked)}
                    colorScheme="red"
                  >
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">Delete existing profile files first</Text>
                      <Text fontSize="xs" color="gray.600">
                        Clear all current profile files before fetching new emails (recommended for fresh start)
                      </Text>
                    </VStack>
                  </Checkbox>
                </FormControl>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme={buildProfile ? "purple" : "blue"}
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText={buildProfile ? "Fetching & Building..." : "Fetching..."}
            leftIcon={buildProfile ? <Zap size={16} /> : <Mail size={16} />}
          >
            {buildProfile ? 'Fetch & Build Profile' : 'Fetch Emails'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 