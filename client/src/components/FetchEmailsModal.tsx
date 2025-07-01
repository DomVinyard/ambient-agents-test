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
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
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
  const [totalEmails, setTotalEmails] = useState(100);
  const [deleteProfileFiles, setDeleteProfileFiles] = useState(true);

  // Split emails evenly between sent and received
  const sentCount = Math.floor(totalEmails / 2);
  const receivedCount = totalEmails - sentCount;

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
              <FormLabel fontSize="sm" fontWeight="medium">
                Total Emails: {totalEmails} ({receivedCount} received, {sentCount} sent)
              </FormLabel>
                             <Slider
                 value={totalEmails}
                 onChange={setTotalEmails}
                 min={10}
                 max={1000}
                 step={10}
                 colorScheme="blue"
               >
                 <SliderTrack>
                   <SliderFilledTrack />
                 </SliderTrack>
                 <SliderThumb />
               </Slider>
               <HStack justify="space-between" mt={1}>
                 <Text fontSize="xs" color="gray.500">10</Text>
                 <Text fontSize="xs" color="gray.500">1000</Text>
               </HStack>
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