import { useState, useEffect } from 'react';
import { Box, Button, VStack, Text, Heading, HStack, Badge } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import UserProfileView from './components/UserProfileView';
import MockFlow from './components/MockFlow';
import SaunaAvatar from './components/SaunaAvatar';

// Gmail icon component
const GmailIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z" fill="currentColor"/>
  </svg>
);

function LoginPage() {
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin';

  const handleGoogleLogin = (mode: 'user' | 'admin' = 'user') => {
    // Redirect to the server's OAuth endpoint with mode parameter
    window.location.href = `http://localhost:3001/auth/gmail?mode=${mode}`;
  };

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
      {!isAdminRoute ? (
                 // Normal user flow - conversational AI design
         <VStack spacing={6} maxW="md" w="full">
           {/* AI Avatar with soft faded edges */}
           <Box position="relative">
             <SaunaAvatar size="48px" showPulse={true} />
           </Box>

          {/* Speech bubble */}
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

          {/* Action button */}
          <Button
            bg="black"
            color="white"
            size="lg"
            onClick={() => handleGoogleLogin('user')}
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

          {/* Admin Mode text at bottom */}
          <Text
            position="absolute"
            bottom={4}
            fontSize="sm"
            color="gray.400"
            cursor="pointer"
            onClick={() => handleGoogleLogin('admin')}
            _hover={{ color: "gray.600", textDecoration: "underline" }}
            userSelect="none"
          >
            Admin
          </Text>
        </VStack>
      ) : (
        // Admin route - simpler design
        <VStack spacing={8} maxW="md" w="full">
          <Heading size="xl" textAlign="center" color="gray.900">
          Sauna Onboard
          </Heading>
          
          <VStack spacing={6}>
            <Text fontSize="lg" textAlign="center" color="gray.600">
              Admin Access
            </Text>
            <Button
              colorScheme="blue"
              size="lg"
              onClick={() => handleGoogleLogin('admin')}
              px={8}
            >
              Sign in with Google
            </Button>
          </VStack>
        </VStack>
      )}
    </Box>
  );
}

function UserRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFreshOAuth, setIsFreshOAuth] = useState(false);

  useEffect(() => {
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthentication = () => {
    console.log('UserRoute: Checking authentication...');
    
    // Check URL params for authentication success first
    const urlParams = new URLSearchParams(window.location.search);
    const gmailStatus = urlParams.get('gmail');
    const tokens = urlParams.get('tokens');
    const authMode = urlParams.get('mode');
    
    console.log('UserRoute: URL params:', { gmailStatus, tokens: !!tokens, authMode });
    
    if (gmailStatus === 'success' && tokens && authMode === 'user') {
      console.log('UserRoute: OAuth success detected, saving auth...');
      // Save authentication
      localStorage.setItem('ambient-agents-auth', JSON.stringify({
        isAuthenticated: true,
        tokens: tokens,
        mode: 'user'
      }));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsAuthenticated(true);
      setIsFreshOAuth(true); // Mark as fresh OAuth
      setIsLoading(false);
      console.log('UserRoute: Authentication set to true (fresh OAuth)');
      return;
    } 
    
    if (gmailStatus === 'error') {
      console.log('UserRoute: OAuth error detected');
      // Clear any existing auth on error
      localStorage.removeItem('ambient-agents-auth');
      setIsAuthenticated(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoading(false);
      return;
    }

    // Check localStorage for existing authentication
    const savedAuth = localStorage.getItem('ambient-agents-auth');
    console.log('UserRoute: Checking saved auth:', !!savedAuth);
    
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      console.log('UserRoute: Saved auth data:', { isAuthenticated: authData.isAuthenticated, mode: authData.mode });
      
      if (authData.isAuthenticated && authData.mode === 'user') {
        console.log('UserRoute: Found valid saved auth');
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
    }

    // If no URL params and no saved auth, show login page
    console.log('UserRoute: No authentication found, showing login');
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ambient-agents-auth');
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <Box 
        minH="100vh" 
        bg="gray.50" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <UserProfileView onLogout={handleLogout} isFreshOAuth={isFreshOAuth} />;
}

function AdminRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthentication = () => {
    // Check localStorage for existing authentication for admin
    const savedAuth = localStorage.getItem('ambient-agents-auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      const savedMode = authData.mode || 'user';
      
      if (authData.isAuthenticated && savedMode === 'admin') {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
    }

    // Check URL params for authentication success
    const urlParams = new URLSearchParams(window.location.search);
    const gmailStatus = urlParams.get('gmail');
    const tokens = urlParams.get('tokens');
    const authMode = urlParams.get('mode');
    
    if (gmailStatus === 'success' && tokens && authMode === 'admin') {
      setIsAuthenticated(true);
      // Save to localStorage with mode
      localStorage.setItem('ambient-agents-auth', JSON.stringify({
        isAuthenticated: true,
        tokens: tokens,
        mode: authMode
      }));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (gmailStatus === 'error') {
      // Clear any existing auth on error
      localStorage.removeItem('ambient-agents-auth');
      setIsAuthenticated(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ambient-agents-auth');
    window.location.href = '/admin';
  };

  if (isLoading) {
    return (
      <Box 
        minH="100vh" 
        bg="gray.50" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (!isAuthenticated) {
    // If user lands at /admin without being logged in, redirect to root
    // unless they're coming from an OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.get('gmail') || urlParams.get('tokens');
    
    if (!hasOAuthParams) {
      window.location.href = '/';
      return null;
    }
    
    return <LoginPage />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function App() {
  // Check for mock mode flag - but don't activate if we're in an OAuth callback
  const [mockMode, setMockMode] = useState(() => {
    // Don't activate mock mode if we're handling OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = urlParams.get('gmail') || urlParams.get('tokens');
    
    if (isOAuthCallback) {
      return false;
    }
    
    return localStorage.getItem('ambient-agents-mock-mode') === 'true';
  });

  // Add developer helpers
  useEffect(() => {
    // Make toggle function available globally for console access
    (window as any).toggleMockMode = () => {
      const newMode = !mockMode;
      setMockMode(newMode);
      localStorage.setItem('ambient-agents-mock-mode', newMode.toString());
      console.log(`🧪 Mock Mode ${newMode ? 'ENABLED' : 'DISABLED'}`);
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Mock Mode Helpers:');
      console.log('  - Click the "Mock Mode" button (bottom left)');
      console.log('  - Or run: toggleMockMode() in console');
      console.log(`  - Current state: ${mockMode ? 'ENABLED' : 'DISABLED'}`);
    }
  }, [mockMode]);

  const toggleMockMode = () => {
    const newMockMode = !mockMode;
    setMockMode(newMockMode);
    localStorage.setItem('ambient-agents-mock-mode', newMockMode.toString());
  };

  const exitMockMode = () => {
    setMockMode(false);
    localStorage.setItem('ambient-agents-mock-mode', 'false');
  };

  // If mock mode is enabled, show the mock flow instead
  // But not if we're in an OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  const isOAuthCallback = urlParams.get('gmail') || urlParams.get('tokens');
  
  if (mockMode && !isOAuthCallback) {
    return <MockFlow onExit={exitMockMode} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserRoute />} />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
      
      {/* Mock Mode Toggle - floating button (hide during OAuth) */}
      {!isOAuthCallback && (
        <HStack
          position="fixed"
          bottom={4}
          left={4}
          spacing={2}
          zIndex={1000}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMockMode}
            leftIcon={<Settings size={14} />}
            bg="whiteAlpha.900"
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor="gray.200"
            _hover={{ bg: 'gray.100' }}
          >
            Mock Mode
          </Button>
          
          {mockMode && (
            <Badge colorScheme="orange" variant="solid">
              🧪 MOCK
            </Badge>
          )}
        </HStack>
      )}
    </Router>
  );
}

export default App; 