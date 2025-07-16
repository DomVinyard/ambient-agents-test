import {
  Alert,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  HStack,
  List,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Mail, Zap } from "lucide-react";
import { useState } from "react";
import { Email } from "../types";
import EmailItem from "./EmailItem";
import EmptyState from "./EmptyState";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (emailId: string) => void;
  onFetchEmails: (options: {
    buildProfile: boolean;
    sentCount: number;
    receivedCount: number;
    deleteProfileFiles: boolean;
  }) => void;
  isLoading: boolean;
  processingEmailIds: Set<string>;
  queuedEmailIds: Set<string>;
  error: string | null;
  insightsByEmail: Record<string, any[]>;
}

export default function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
  onFetchEmails,
  isLoading,
  processingEmailIds,
  queuedEmailIds,
  error,
  insightsByEmail,
}: EmailListProps) {
  const [totalEmails, setTotalEmails] = useState(100);
  const [fetchOnly, setFetchOnly] = useState(false);

  const emailCounts = [10, 100, 500, 1000, 2000];

  // Split emails evenly between sent and received
  const sentCount = Math.floor(totalEmails / 2);
  const receivedCount = totalEmails - sentCount;

  const handleFetch = () => {
    onFetchEmails({
      buildProfile: !fetchOnly,
      sentCount,
      receivedCount,
      deleteProfileFiles: true,
    });
  };

  return (
    <Box
      flex="1"
      h="100%"
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
    >
      <VStack spacing={0} h="100%">
        {/* Header with Controls */}
        <Box p={3} borderBottom="1px solid" borderColor="gray.200" w="100%">
          <VStack spacing={3} align="stretch">
            {/* Checkbox and Buttons Side by Side */}
            <HStack spacing={2} align="start">
              <ButtonGroup size="xs" isAttached variant="outline" flex="1">
                {emailCounts.map((count) => (
                  <Button
                    key={count}
                    onClick={() => setTotalEmails(count)}
                    colorScheme={totalEmails === count ? "blue" : "gray"}
                    variant={totalEmails === count ? "solid" : "outline"}
                    flex="1"
                  >
                    {count === 1000 ? "1k" : count === 2000 ? "2k" : count}
                  </Button>
                ))}
              </ButtonGroup>

              <Checkbox
                isChecked={fetchOnly}
                onChange={(e) => setFetchOnly(e.target.checked)}
                colorScheme="blue"
                size="sm"
                mt={1}
              >
                <Text fontSize="xs" fontWeight="medium">
                  Fetch only
                </Text>
              </Checkbox>
            </HStack>

            <Button
              leftIcon={fetchOnly ? <Mail size={14} /> : <Zap size={14} />}
              colorScheme={fetchOnly ? "blue" : "purple"}
              size="sm"
              onClick={handleFetch}
              isLoading={isLoading}
              loadingText={fetchOnly ? "Fetching..." : "Fetching & Building..."}
              w="100%"
            >
              {emails.length > 0
                ? fetchOnly
                  ? "Refetch"
                  : "Regenerate"
                : fetchOnly
                ? "Fetch"
                : "Generate"}
            </Button>
          </VStack>
        </Box>

        {/* Content */}
        <Box flex="1" w="100%" overflowY="auto">
          {error && (
            <Alert status="error" size="sm" m={2}>
              <AlertIcon />
              <Text fontSize="sm">{error}</Text>
            </Alert>
          )}

          {!isLoading && emails.length === 0 && !error && (
            <EmptyState
              icon={Mail}
              title="No emails loaded"
              description="Configure options above and click 'Generate' to start."
              iconSize={24}
            />
          )}

          {emails.length > 0 && (
            <List spacing={0}>
              {emails.map((email) => {
                const isProcessing = processingEmailIds.has(email.id);
                const isQueued = queuedEmailIds.has(email.id);
                const insightCount = insightsByEmail[email.id]?.length || 0;
                const hasInsights = insightCount > 0;

                return (
                  <EmailItem
                    key={email.id}
                    email={email}
                    isSelected={selectedEmailId === email.id}
                    isProcessing={isProcessing}
                    isQueued={isQueued}
                    insightCount={insightCount}
                    hasInsights={hasInsights}
                    onEmailSelect={onEmailSelect}
                  />
                );
              })}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
