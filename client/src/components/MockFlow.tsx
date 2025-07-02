import { useState, useEffect } from 'react';
import { Box, VStack, Text, Button, useToast, Flex, Progress, HStack } from '@chakra-ui/react';
import MasterProgressBar from './MasterProgressBar';
import BeautifulMarkdownEditor from './BeautifulMarkdownEditor';
import ProfileLoadingScreen from './ProfileLoadingScreen';
import AnimatedProfileTransition from './AnimatedProfileTransition';
import { getStatusMessage } from '../utils/getStatusMessage';
import SaunaAvatar from './SaunaAvatar';

type MockState = 'login' | 'oauth' | 'loading' | 'profile';

interface MockFlowProps {
  onExit: () => void;
}

const mockProfileContent = `# Profile of John Doe

**Date:** 2025-07-01

## Core Identity and Current Role

John Doe is a dynamic individual with a keen interest in technology and innovation. As of July 1, 2025, John is actively engaged in app and API development, currently focusing on a significant project known as the 'Agentic Product.' This role highlights not only John's technical skills but also a commitment to professional growth and collaboration within the tech industry.

## Professional Foundation

John has cultivated a network of professional relationships with individuals such as Ellie Ludkin, Shahid Warranch, Zari Shirmohamadali, and Ian Brown, all of whom contribute to various service-related endeavors. John's professional interests extend beyond development; they are also keenly involved in market research and survey tools, subscribing to newsletters that provide insights into platforms like SurveyMonkey and trends in marketing, particularly those highlighted during events like the Cannes Lions.

## Personal Dimension

On a personal level, John is an avid traveler, with plans to visit England soon, as mentioned in recent communications. This passion for travel is complemented by a broader interest in home decor and technology, as evidenced by subscriptions to newsletters discussing furniture options and the latest electronics.

## Future Trajectory

Looking ahead, John has outlined several goals and aspirations. In the short term, they plan to travel to England, coordinate tenant safety measures, and organize an onboarding event for a new team member. Medium-term goals include searching for a deal on a BMW 430 and considering the purchase of a 2025 BMW 2 Series.`;

export default function MockFlow({ onExit }: MockFlowProps) {
  const [currentState, setCurrentState] = useState<MockState>('login');
  const [profileContent, setProfileContent] = useState(mockProfileContent);
  
  // Mock loading progress
  const [masterProgress, setMasterProgress] = useState({
    fetchProgress: null as { processed: number; total: number } | null,
    insightsProgress: null as { processed: number; total: number } | null,
    profileProgress: null as { processed: number; total: number } | null,
    compileProgress: null as { processed: number; total: number } | null,
    isEndToEndProcess: false
  });

  const toast = useToast();

  // OAuth transition effect
  useEffect(() => {
    if (currentState === 'oauth') {
      const timer = setTimeout(() => {
        setCurrentState('loading');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentState]);

  // Mock loading sequence
  useEffect(() => {
    if (currentState !== 'loading') return;

    const sequence = async () => {
      setMasterProgress(prev => ({ ...prev, isEndToEndProcess: true }));
      
      // Stage 1: Fetch emails (0.5 seconds)
      setMasterProgress(prev => ({ ...prev, fetchProgress: { processed: 0, total: 25 } }));
      for (let i = 0; i <= 25; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        setMasterProgress(prev => ({ ...prev, fetchProgress: { processed: i, total: 25 } }));
      }

      // Stage 2: Extract insights (0.75 seconds)
      setMasterProgress(prev => ({ ...prev, insightsProgress: { processed: 0, total: 25 } }));
      for (let i = 0; i <= 25; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        setMasterProgress(prev => ({ ...prev, insightsProgress: { processed: i, total: 25 } }));
      }

      // Stage 3: Generate profiles (0.5 seconds)
      setMasterProgress(prev => ({ ...prev, profileProgress: { processed: 0, total: 8 } }));
      for (let i = 0; i <= 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 60));
        setMasterProgress(prev => ({ ...prev, profileProgress: { processed: i, total: 8 } }));
      }

      // Stage 4: Compile (0.25 seconds)
      setMasterProgress(prev => ({ ...prev, compileProgress: { processed: 0, total: 2 } }));
      for (let i = 0; i <= 2; i++) {
        await new Promise(resolve => setTimeout(resolve, 125));
        setMasterProgress(prev => ({ ...prev, compileProgress: { processed: i, total: 2 } }));
      }

      // Animation component will handle the transition automatically
    };

    sequence();
  }, [currentState, toast]);

  const handleLogin = () => {
    // Go directly to OAuth simulation
    setCurrentState('oauth');
  };



  const handleProfileConfirm = () => {
    toast({
      title: 'Profile Saved!',
      description: 'Your profile has been confirmed',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleContentChange = (value: string) => {
    setProfileContent(value);
  };

  // Gmail icon component (copied from App.tsx)
  const GmailIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z" fill="currentColor"/>
    </svg>
  );

  // Login State - reusing exact design from App.tsx
  if (currentState === 'login') {
    return (
      <Box 
        minH="100vh" 
        bg="gray.50" 
        color="gray.800"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        position="relative"
      >
        {/* Exit Mock Mode Button */}
        <Button
          position="absolute"
          top={4}
          right={4}
          variant="ghost"
          size="sm"
          onClick={onExit}
        >
          Exit Mock Mode
        </Button>

        <VStack spacing={6} maxW="md" w="full">
          {/* AI Avatar with soft faded edges - exact copy from App.tsx */}
          <Box position="relative">
            <SaunaAvatar size="48px" showPulse={true} />
          </Box>

          {/* Speech bubble - exact copy from App.tsx */}
          <Box position="relative" maxW="320px">
            <Box
              bg="white"
              borderRadius="20px"
              p={6}
              boxShadow="0 4px 20px rgba(0,0,0,0.1)"
              position="relative"
              border="1px solid"
              borderColor="gray.100"
            >
              {/* Speech bubble tail pointing up at avatar */}
              <Box
                position="absolute"
                top="-8px"
                left="50%"
                w="16px"
                h="16px"
                bg="white"
                borderLeft="1px solid"
                borderTop="1px solid"
                borderColor="gray.200"
                borderRadius="2px"
                transform="translateX(-50%) rotate(45deg)"
                zIndex={1}
              />
              
              <Text fontSize="lg" fontWeight="medium" color="gray.800" textAlign="center" lineHeight="1.6">
                Hey, I'm <Text as="span" color="#906FE4" fontWeight="bold">Sauna</Text>. Can I read your email to learn a bit about you?
              </Text>
            </Box>
          </Box>

          {/* Action button - exact copy from App.tsx */}
          <Button
            bg="black"
            color="white"
            size="lg"
            onClick={handleLogin}
            px={8}
            py={6}
            borderRadius="12px"
            fontSize="md"
            fontWeight="semibold"
            _hover={{ 
              bg: "gray.800",
              transform: "translateY(-1px)",
              boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
            }}
            _active={{ transform: "translateY(0)" }}
            transition="all 0.2s"
            leftIcon={<GmailIcon size={20} />}
          >
            Sure, go ahead
          </Button>

          {/* Mock Mode Indicator - replaces Admin Mode text */}
          <Text
            position="absolute"
            bottom={4}
            fontSize="sm"
            color="gray.400"
            userSelect="none"
          >
            🧪 Mock Mode Active - No real OAuth
          </Text>
        </VStack>
      </Box>
    );
  }

  // OAuth Simulation State - full screen like real Google OAuth
  if (currentState === 'oauth') {
    return (
      <Box 
        minH="100vh" 
        bg="white"
        display="flex"
        flexDirection="column"
        position="relative"
      >
        {/* Exit Mock Mode Button */}
        <Button
          position="absolute"
          top={4}
          right={4}
          variant="ghost"
          size="sm"
          onClick={onExit}
          zIndex={10}
        >
          Exit Mock Mode
        </Button>

        {/* Google-like header */}
        <Flex 
          alignItems="center" 
          px={6} 
          py={4} 
          borderBottom="1px solid" 
          borderColor="gray.200"
        >
          <HStack spacing={2}>
            <Box w="24px" h="24px" bg="blue.500" borderRadius="2px" />
            <Text fontWeight="medium" color="gray.700">Google</Text>
          </HStack>
        </Flex>

        {/* OAuth Content */}
        <Box 
          flex="1" 
          display="flex" 
          alignItems="center" 
          justifyContent="center"
          bg="gray.50"
        >
          <Box 
            bg="white" 
            borderRadius="lg" 
            boxShadow="0 4px 20px rgba(0,0,0,0.1)"
            p={8}
            maxW="400px"
            w="full"
            mx={4}
          >
            <VStack spacing={6}>
              {/* Google logo area */}
              <VStack spacing={4}>
                <Box 
                  w="48px" 
                  h="48px" 
                  bg="blue.500" 
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontWeight="bold" fontSize="xl">G</Text>
                </Box>
                <Text fontSize="xl" fontWeight="medium" color="gray.800">
                  Sign in with Google
                </Text>
              </VStack>

              {/* Loading animation */}
              <VStack spacing={4} w="full">
                <Box w="full" h="1px" bg="gray.200" position="relative" overflow="hidden">
                  <Box
                    position="absolute"
                    top="0"
                    left="-100%"
                    w="100%"
                    h="full"
                    bg="blue.500"
                    animation="slide 1.5s ease-in-out infinite"
                    sx={{
                      '@keyframes slide': {
                        '0%': { left: '-100%' },
                        '100%': { left: '100%' }
                      }
                    }}
                  />
                </Box>
                
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Connecting to your Google account...
                </Text>
              </VStack>

              {/* Mock permissions */}
              <VStack spacing={2} w="full" fontSize="sm" color="gray.600">
                <Text fontWeight="medium">Sauna would like to:</Text>
                <VStack spacing={1} align="start" w="full" pl={4}>
                  <Text>• Read your Gmail messages</Text>
                  <Text>• View your email address</Text>
                  <Text>• View your basic profile info</Text>
                </VStack>
              </VStack>

              <Text fontSize="xs" color="gray.400" textAlign="center">
                🧪 Mock OAuth - Redirecting back to Sauna...
              </Text>
            </VStack>
          </Box>
        </Box>
      </Box>
    );
  }

  // Calculate overall progress percentage for mock mode
  // Realistic stage distribution: 10/70/10/10 based on actual processing time
  const calculateOverallProgress = () => {
    let totalProgress = 0;
    
    // Stage 1: Fetch emails (0-10%) - quick
    if (masterProgress.fetchProgress) {
      const fetchPercent = (masterProgress.fetchProgress.processed / masterProgress.fetchProgress.total) * 10;
      totalProgress = fetchPercent;
    }
    
    // Stage 2: Extract insights (10-80%) - longest stage
    if (masterProgress.insightsProgress) {
      const insightsPercent = (masterProgress.insightsProgress.processed / masterProgress.insightsProgress.total) * 70;
      totalProgress = 10 + insightsPercent;
    }
    
    // Stage 3: Generate profiles (80-90%) - moderate
    if (masterProgress.profileProgress) {
      const profilePercent = (masterProgress.profileProgress.processed / masterProgress.profileProgress.total) * 10;
      totalProgress = 80 + profilePercent;
    }
    
    // Stage 4: Compile (90-100%) - quick
    if (masterProgress.compileProgress) {
      const compilePercent = (masterProgress.compileProgress.processed / masterProgress.compileProgress.total) * 10;
      totalProgress = 90 + compilePercent;
    }
    
    return Math.round(Math.min(totalProgress, 100));
  };



  // Loading State with animated transition to profile
  if (currentState === 'loading' || currentState === 'profile') {
    const allComplete = masterProgress.compileProgress?.processed === 2;
    const overallProgress = calculateOverallProgress();
    
    return (
      <>
        {/* Exit Mock Mode Button */}
        <Button
          position="fixed"
          top={4}
          right={4}
          variant="ghost"
          size="sm"
          onClick={onExit}
          zIndex={10}
        >
          Exit Mock Mode
        </Button>

        <AnimatedProfileTransition
          overallProgress={overallProgress}
          statusMessage={getStatusMessage(masterProgress)}
          profileContent={profileContent}
          onContentChange={handleContentChange}
          onConfirm={handleProfileConfirm}
          onLogout={onExit}
          isComplete={allComplete}
          showMockIndicator={true}
        />
      </>
    );
  }

  // Should not reach here anymore since we handle both loading and profile states above
  return null;
} 