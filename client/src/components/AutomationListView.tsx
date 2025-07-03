import {
  Box,
  VStack,
  Text,
  Button,
  Heading,
  Badge,
  HStack,
  Icon,
  Stack,
  Checkbox,
} from "@chakra-ui/react";
import { FaFire, FaBolt, FaLightbulb, FaArrowRight } from "react-icons/fa";
import { useState, useEffect } from "react";
import SaunaAvatar from "./SaunaAvatar";

interface AutomationData {
  summary: string;
  automations: Array<{
    name: string;
    category: string;
    description: string;
    priority: "high" | "medium" | "low";
    complexity: string;
    trigger: string;
    actions: string[];
    evidence: string;
    impact: string;
  }>;
}

interface AutomationListViewProps {
  automationData: AutomationData;
  onContinue: () => void;
  onLogout?: () => void;
  userInfo?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AutomationListView({
  automationData,
  onContinue,
  onLogout,
  userInfo,
}: AutomationListViewProps) {
  // State for checkboxes
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return FaFire;
      case "medium":
        return FaBolt;
      default:
        return FaLightbulb;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "red";
      case "medium":
        return "orange";
      default:
        return "blue";
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      communication: "💬",
      productivity: "⚡",
      finance: "💳",
      health: "🏥",
      learning: "📚",
      relationships: "👥",
      travel: "✈️",
      shopping: "🛒",
    };
    return emojiMap[category] || "🤖";
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      communication: "blue",
      productivity: "green",
      finance: "purple",
      health: "red",
      learning: "orange",
      relationships: "pink",
      travel: "cyan",
      shopping: "yellow",
      professional: "gray",
      lifestyle: "teal",
      creativity: "violet",
      organization: "indigo",
    };
    return colorMap[category] || "gray";
  };

  // Sort automations by priority and limit to 6
  const sortedAutomations = [...automationData.automations]
    .sort((a, b) => {
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      return (
        (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
      );
    })
    .slice(0, 5);

  // Initialize checkboxes array if needed
  useEffect(() => {
    if (checkedItems.length !== sortedAutomations.length) {
      setCheckedItems(new Array(sortedAutomations.length).fill(false));
    }
  }, [sortedAutomations.length, checkedItems.length]);

  // Handle checkbox changes
  const handleCheckboxChange = (index: number, isChecked: boolean) => {
    const newCheckedItems = [...checkedItems];
    newCheckedItems[index] = isChecked;
    setCheckedItems(newCheckedItems);
  };

  // Check if any automations are selected
  const hasSelectedAutomations = checkedItems.some((checked) => checked);

  return (
    <Box
      h="100vh"
      bg="gray.50"
      position="relative"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      px="6"
      py="6"
    >
      {/* Logout button - matching profile editor style */}
      {onLogout && (
        <Button
          position="fixed"
          top={4}
          right={4}
          variant="ghost"
          size="sm"
          onClick={onLogout}
          zIndex={10}
        >
          Logout
        </Button>
      )}
      <VStack spacing={6} maxW="4xl" w="full" justify="center" mt="-8vh">
        {/* AI Avatar - matching profile editor style */}
        <Box flexShrink={0}>
          <SaunaAvatar size="48px" showPulse={false} isProfileMode={true} />
        </Box>

        {/* Header */}
        <Heading
          size="lg"
          color="gray.800"
          textAlign="center"
          fontWeight="semibold"
        >
          Hey {userInfo?.firstName}
        </Heading>

        <Text color="gray.600" textAlign="center" fontSize="lg" mt={-3}>
          How can I make you more productive?
        </Text>

        {/* Automation List */}
        <VStack spacing={3} w="full" maxW="600px">
          {sortedAutomations.map((automation, index) => (
            <Box
              key={index}
              bg="white"
              borderRadius="8px"
              p={4}
              boxShadow="0 2px 8px rgba(0,0,0,0.06)"
              border="1px solid"
              borderColor="gray.100"
              w="full"
            >
              <HStack spacing={3} align="start">
                {/* Checkbox */}
                <Checkbox
                  isChecked={checkedItems[index] || false}
                  onChange={(e) =>
                    handleCheckboxChange(index, e.target.checked)
                  }
                  colorScheme="green"
                  size="lg"
                  mt={1}
                />

                {/* Content */}
                <VStack align="start" spacing={1} flex={1}>
                  <HStack spacing={2} w="full" justify="space-between">
                    <HStack spacing={2}>
                      <Icon
                        as={getPriorityIcon(automation.priority)}
                        color={`${getPriorityColor(automation.priority)}.500`}
                        boxSize={4}
                      />
                      <Text
                        fontWeight="semibold"
                        color="gray.800"
                        fontSize="sm"
                      >
                        {automation.name}
                      </Text>
                    </HStack>
                    <Badge
                      colorScheme={getCategoryColor(automation.category)}
                      variant="subtle"
                      fontSize="xs"
                    >
                      {automation.category.toUpperCase()}
                    </Badge>
                  </HStack>

                  <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                    {automation.description}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>

        {/* Continue Button */}
        <Button
          bg={hasSelectedAutomations ? "black" : "gray.300"}
          color={hasSelectedAutomations ? "white" : "gray.500"}
          size="lg"
          onClick={onContinue}
          isDisabled={!hasSelectedAutomations}
          px={8}
          py={6}
          borderRadius="12px"
          fontSize="md"
          fontWeight="semibold"
          rightIcon={<FaArrowRight />}
          _hover={
            hasSelectedAutomations
              ? {
                  bg: "gray.800",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                }
              : {}
          }
          _active={hasSelectedAutomations ? { transform: "translateY(0)" } : {}}
          _disabled={{
            bg: "gray.300",
            color: "gray.500",
            cursor: "not-allowed",
          }}
          transition="all 0.2s"
        >
          Looks good
        </Button>
      </VStack>
    </Box>
  );
}
