import {
  Box,
  VStack,
  Button,
  Text,
  List,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
  Flex,
} from "@chakra-ui/react";
import { FileText, Lightbulb, X } from "lucide-react";
import { Insight } from "../types";
import EmptyState from "./EmptyState";
import InsightItem from "./InsightItem";

interface InsightsViewerProps {
  insights: Insight[];
  onApplyToBio: () => void;
  isLoading: boolean;
  isExtracting?: boolean;
  error: string | null;
  onClose?: () => void;
  hasAttemptedExtraction?: boolean;
}

export default function InsightsViewer({
  insights,
  onApplyToBio,
  isLoading,
  isExtracting = false,
  error,
  onClose,
  hasAttemptedExtraction = false,
}: InsightsViewerProps) {
  return (
    <Box
      w="100%"
      h="100%"
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
    >
      <VStack spacing={0} h="100%">
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor="gray.200" w="100%">
          <Flex gap={2} align="center">
            <Button
              leftIcon={<FileText size={16} />}
              colorScheme="purple"
              size="sm"
              onClick={onApplyToBio}
              isLoading={isLoading}
              loadingText="Building..."
              isDisabled={insights.length === 0 || isExtracting}
              flex="1"
            >
              Build Profile →
            </Button>
            {onClose && (
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

          {isExtracting && (
            <Box textAlign="center" py={8}>
              <Spinner size="lg" color="green.500" />
              <Text mt={4} fontSize="sm" color="gray.600">
                Extracting insights...
              </Text>
            </Box>
          )}

          {insights.length === 0 && !isLoading && !isExtracting && (
            <EmptyState
              icon={Lightbulb}
              title={
                hasAttemptedExtraction
                  ? "No insights found"
                  : "No insights extracted yet"
              }
              description={
                hasAttemptedExtraction
                  ? "The AI analysis completed but didn't find any high-confidence insights in this email"
                  : 'Select an email and click "Extract Insights" to see AI analysis'
              }
            />
          )}

          {insights.length > 0 && !isExtracting && (
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontSize="md" fontWeight="bold" color="gray.800" mb={2}>
                  Extracted Insights ({insights.length})
                </Text>
                <Text fontSize="sm" color="gray.600">
                  AI-generated insights about you from the selected email
                </Text>
              </Box>

              <List spacing={3}>
                {insights.map((insight, index) => (
                  <InsightItem key={index} insight={insight} index={index} />
                ))}
              </List>
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
