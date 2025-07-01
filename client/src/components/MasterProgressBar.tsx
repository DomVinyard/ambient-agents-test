import { Box, Progress, Text, Flex } from '@chakra-ui/react';

interface MasterProgressBarProps {
  fetchProgress: { processed: number; total: number } | null;
  insightsProgress: { processed: number; total: number } | null;
  profileProgress: { processed: number; total: number } | null;
  compileProgress: { processed: number; total: number } | null;
  isVisible: boolean;
}

export default function MasterProgressBar({
  fetchProgress,
  insightsProgress,
  profileProgress,
  compileProgress,
  isVisible
}: MasterProgressBarProps) {
  if (!isVisible) {
    return null;
  }

  // Calculate percentage for each stage (10%, 70%, 10%, 10%)
  const stage1Percent = fetchProgress ? Math.min((fetchProgress.processed / fetchProgress.total) * 10, 10) : 0;
  const stage2Percent = insightsProgress ? Math.min((insightsProgress.processed / insightsProgress.total) * 70, 70) : 0;
  const stage3Percent = profileProgress ? Math.min((profileProgress.processed / profileProgress.total) * 10, 10) : 0;
  const stage4Percent = compileProgress ? Math.min((compileProgress.processed / compileProgress.total) * 10, 10) : 0;

  const totalPercent = stage1Percent + stage2Percent + stage3Percent + stage4Percent;

  // Determine current stage name
  let currentStage = '';
  if (stage1Percent < 10) {
    currentStage = 'Fetching emails';
  } else if (stage2Percent < 70) {
    currentStage = 'Extracting insights';
  } else if (stage3Percent < 10) {
    currentStage = 'Generating profiles';
  } else if (stage4Percent < 10) {
    currentStage = 'Compiling profiles';
  } else {
    currentStage = 'Complete';
  }

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      h="40px"
      bg="white"
      borderTop="1px solid"
      borderColor="gray.200"
      zIndex={1000}
      px={4}
    >
      <Flex align="center" h="100%" gap={4}>
        <Box flex="1">
          <Progress 
            value={totalPercent} 
            colorScheme="blue" 
            size="md"
            borderRadius="md"
          />
        </Box>
        <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="150px" textAlign="right">
          {currentStage} - {Math.round(totalPercent)}%
        </Text>
      </Flex>
    </Box>
  );
} 