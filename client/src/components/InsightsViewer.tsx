import { Box, VStack, Button, Text, Badge, List, ListItem, Spinner, Alert, AlertIcon, IconButton, Flex } from '@chakra-ui/react';
import { FileText, Lightbulb, X } from 'lucide-react';
import { Insight } from '../types';

interface InsightsViewerProps {
  insights: Insight[];
  onApplyToBio: () => void;
  isLoading: boolean;
  isExtracting?: boolean;
  error: string | null;
  onClose?: () => void;
}

export default function InsightsViewer({ 
  insights, 
  onApplyToBio, 
  isLoading, 
  isExtracting = false,
  error,
  onClose
}: InsightsViewerProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      professional: 'blue',
      personal: 'green',
      communication: 'purple',
      behavioral: 'orange',
      technical: 'teal',
      general: 'gray'
    };
    return colors[category.toLowerCase()] || 'gray';
  };

  return (
    <Box w="100%" h="100%" bg="white" borderRight="1px solid" borderColor="gray.200">
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
              loadingText="Applying..."
              isDisabled={insights.length === 0 || isExtracting}
              flex="1"
            >
              Apply to Bio →
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
            <Box textAlign="center" py={8}>
              <Lightbulb size={48} color="#CBD5E0" />
              <Text mt={4} fontSize="md" color="gray.500">
                No insights extracted yet
              </Text>
              <Text fontSize="sm" color="gray.400">
                Select an email and click "Extract Insights" to see AI analysis
              </Text>
            </Box>
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
                          <Badge 
                            colorScheme={getCategoryColor(insight.category)} 
                            size="sm" 
                            mb={2}
                          >
                            {insight.category.toUpperCase()}
                          </Badge>
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
                ))}
              </List>

              <Box mt={4} p={3} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.200">
                <Text fontSize="xs" color="purple.700">
                  💡 These insights will be added to your bio when you click "Apply to Bio". 
                  You can review and edit them in the bio column.
                </Text>
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
} 