import { ListItem, Text, Badge, Flex, Box, Spinner } from "@chakra-ui/react";
import { Clock } from "lucide-react";
import { Email } from "../types";

interface EmailItemProps {
  email: Email;
  isSelected: boolean;
  isProcessing: boolean;
  isQueued: boolean;
  insightCount: number;
  hasInsights: boolean;
  onEmailSelect: (emailId: string) => void;
}

export default function EmailItem({
  email,
  isSelected,
  isProcessing,
  isQueued,
  insightCount,
  hasInsights,
  onEmailSelect,
}: EmailItemProps) {
  const getBackgroundColor = () => {
    if (isSelected) return "blue.50";
    if (isProcessing) return "purple.50";
    if (isQueued) return "orange.50";
    return "white";
  };

  const getHoverColor = () => {
    if (isSelected) return "blue.50";
    if (isProcessing) return "purple.50";
    if (isQueued) return "orange.50";
    return "gray.50";
  };

  return (
    <ListItem
      p={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      cursor="pointer"
      bg={getBackgroundColor()}
      _hover={{ bg: getHoverColor() }}
      onClick={() => onEmailSelect(email.id)}
      opacity={isProcessing || isQueued ? 0.8 : 1}
    >
      <Flex justify="space-between" align="center">
        <Flex align="center" gap={2} flex="1" minW={0}>
          {isProcessing ? (
            <Box
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Spinner size="xs" color="purple.500" />
            </Box>
          ) : isQueued ? (
            <Box
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Clock size={14} color="#D69E2E" />
            </Box>
          ) : (
            <Box
              bg={hasInsights ? "red.500" : "gray.300"}
              color={hasInsights ? "white" : "gray.600"}
              borderRadius="full"
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
              fontWeight="bold"
              flexShrink={0}
            >
              {insightCount}
            </Box>
          )}
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="gray.800"
            noOfLines={1}
            flex="1"
            minW={0}
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {email.subject}
          </Text>
        </Flex>
        <Flex align="center" gap={2} flexShrink={0}>
          {email.emailType === "sent" && (
            <Badge colorScheme="green" size="sm">
              SENT
            </Badge>
          )}
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
}
