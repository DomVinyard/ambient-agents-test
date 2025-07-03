import {
  Box,
  VStack,
  Button,
  Text,
  Badge,
  Alert,
  AlertIcon,
  IconButton,
  Flex,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { Brain, Mail, X, Copy } from "lucide-react";
import { Email } from "../types";
import EmptyState from "./EmptyState";

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
  hasInsights = false,
}: EmailViewerProps) {
  const toast = useToast();

  const copyEmailContent = async () => {
    if (!email) return;

    const content = email.fullBody || email.snippet || "No content available";
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Email content has been copied to your clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy email content to clipboard",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
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
              leftIcon={<Brain size={16} />}
              colorScheme="green"
              size="sm"
              onClick={onExtractInsights}
              isLoading={isLoading}
              loadingText={hasInsights ? "Reextracting..." : "Extracting..."}
              isDisabled={!email}
              flex="1"
            >
              {hasInsights ? "Reextract Insights →" : "Extract Insights →"}
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
        <Box flex="1" w="100%" overflowY="auto">
          {error && (
            <Alert status="error" size="sm" m={4}>
              <AlertIcon />
              <Text fontSize="sm">{error}</Text>
            </Alert>
          )}

          {!email && (
            <EmptyState
              icon={Mail}
              title="Select an email to view"
              description="Choose an email from the list to see its content"
            />
          )}

          {email && (
            <Box p={4}>
              {/* Email Header */}
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text
                    fontSize="xl"
                    fontWeight="bold"
                    color="gray.800"
                    mb={3}
                    lineHeight="1.3"
                  >
                    {email.subject}
                  </Text>

                  <VStack spacing={2} align="stretch" mb={3}>
                    <Text fontSize="sm" color="gray.600">
                      <Text as="span" fontWeight="medium">
                        From:
                      </Text>{" "}
                      {email.from}
                    </Text>

                    {email.to && (
                      <Text fontSize="sm" color="gray.600">
                        <Text as="span" fontWeight="medium">
                          To:
                        </Text>{" "}
                        {email.to}
                      </Text>
                    )}

                    {email.cc && (
                      <Text fontSize="sm" color="gray.600">
                        <Text as="span" fontWeight="medium">
                          CC:
                        </Text>{" "}
                        {email.cc}
                      </Text>
                    )}

                    <Text fontSize="sm" color="gray.600">
                      <Text as="span" fontWeight="medium">
                        Date:
                      </Text>{" "}
                      {new Date(email.date).toLocaleString()}
                    </Text>
                  </VStack>

                  {/* Classification and ID in one line */}
                  <Flex gap={2} align="center" mb={4}>
                    {email.classification && (
                      <Badge
                        size="sm"
                        variant="solid"
                        colorScheme={
                          email.classification.emailType === "personal"
                            ? "blue"
                            : email.classification.emailType === "professional"
                            ? "purple"
                            : email.classification.emailType === "newsletter"
                            ? "green"
                            : email.classification.emailType === "service"
                            ? "orange"
                            : "gray"
                        }
                      >
                        {email.classification.emailType} (
                        {Math.round(email.classification.confidence * 100)}%)
                      </Badge>
                    )}
                    <Text fontSize="xs" color="gray.400">
                      {email.id.substring(0, 8)}...
                    </Text>
                  </Flex>

                  {/* Classification reasoning */}
                  {email.classification?.reasoning && (
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      mb={4}
                      fontStyle="italic"
                    >
                      {email.classification.reasoning}
                    </Text>
                  )}
                </Box>

                <Divider />

                {/* Email Content - Clean and Simple */}
                <Box>
                  <Flex align="center" gap={2} mb={3}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      Email Content:
                    </Text>
                    <IconButton
                      icon={<Copy size={14} />}
                      size="xs"
                      variant="ghost"
                      aria-label="Copy email content"
                      onClick={copyEmailContent}
                      colorScheme="gray"
                      title="Copy email content to clipboard"
                    />
                  </Flex>
                  <Text
                    fontSize="sm"
                    color="gray.700"
                    lineHeight="1.6"
                    whiteSpace="pre-wrap"
                    wordBreak="break-word"
                  >
                    {email.fullBody || email.snippet || "No content available"}
                  </Text>
                </Box>
              </VStack>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
