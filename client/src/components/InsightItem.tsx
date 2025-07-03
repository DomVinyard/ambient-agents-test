import { ListItem, Box, VStack, Text, Badge, Flex } from "@chakra-ui/react";
import { Insight } from "../types";
import { getCategoryColor } from "../utils/categories";

interface InsightItemProps {
  insight: Insight;
  index: number;
}

export default function InsightItem({ insight, index }: InsightItemProps) {
  return (
    <ListItem key={index}>
      <Box
        p={3}
        bg="gray.50"
        borderRadius="md"
        border="1px solid"
        borderColor="gray.200"
      >
        <VStack spacing={2} align="stretch">
          <Box>
            <Flex gap={1} mb={2} flexWrap="wrap">
              {insight.categories.map((category, categoryIndex) => (
                <Badge
                  key={categoryIndex}
                  colorScheme={getCategoryColor(category)}
                  size="sm"
                >
                  {category.toUpperCase()}
                </Badge>
              ))}
            </Flex>
            <Text fontSize="sm" fontWeight="medium" color="gray.800">
              {insight.insight}
            </Text>
          </Box>

          {insight.evidence && (
            <Box>
              <Text fontSize="xs" color="gray.600" fontWeight="medium">
                Evidence:
              </Text>
              <Text fontSize="xs" color="gray.600" fontStyle="italic">
                "{insight.evidence}"
              </Text>
            </Box>
          )}

          <Box>
            <Text fontSize="xs" color="gray.500">
              Confidence: {Math.round(insight.confidence * 100)}%
            </Text>
          </Box>
        </VStack>
      </Box>
    </ListItem>
  );
}
