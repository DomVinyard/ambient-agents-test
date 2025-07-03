import { Box, Text, Flex } from "@chakra-ui/react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  iconSize?: number;
  iconColor?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  iconSize = 48,
  iconColor = "#CBD5E0",
}: EmptyStateProps) {
  return (
    <Box p={6} textAlign="center">
      <Flex justify="center" mb={3}>
        <Icon size={iconSize} color={iconColor} />
      </Flex>
      <Text
        fontSize="md"
        color="gray.500"
        fontWeight="medium"
        mb={description ? 2 : 0}
      >
        {title}
      </Text>
      {description && (
        <Text
          fontSize="sm"
          color="gray.400"
          lineHeight="1.4"
          maxW="200px"
          mx="auto"
        >
          {description}
        </Text>
      )}
    </Box>
  );
}
