import { useState, useEffect } from 'react';
import { Box, Button, VStack, Text, Heading } from '@chakra-ui/react';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check localStorage for existing authentication
    const savedAuth = localStorage.getItem('ambient-agents-auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setIsAuthenticated(authData.isAuthenticated);
    }

    // Check URL params for authentication success
    const urlParams = new URLSearchParams(window.location.search);
    const gmailStatus = urlParams.get('gmail');
    const tokens = urlParams.get('tokens');
    
    if (gmailStatus === 'success' && tokens) {
      setIsAuthenticated(true);
      // Save to localStorage
      localStorage.setItem('ambient-agents-auth', JSON.stringify({
        isAuthenticated: true,
        tokens: tokens
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
  }, []);

  const handleGoogleLogin = () => {
    // Redirect to the server's OAuth endpoint
    window.location.href = 'http://localhost:3001/auth/gmail';
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ambient-agents-auth');
  };

  if (isAuthenticated) {
    return <Dashboard onLogout={handleLogout} />;
  }

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
      <VStack spacing={8} maxW="md" w="full">
        <Heading size="xl" textAlign="center" color="gray.900">
        Sauna Profile Builder
        </Heading>
        
        <VStack spacing={6}>
          <Text fontSize="lg" textAlign="center" color="gray.600">
            Connect your Gmail to get started
          </Text>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleGoogleLogin}
            px={8}
          >
            Sign in with Google
          </Button>
        </VStack>
      </VStack>
      
      {/* Admin Mode text at bottom */}
      <Text
        position="absolute"
        bottom={4}
        fontSize="sm"
        color="gray.400"
        cursor="pointer"
        onClick={handleGoogleLogin}
        _hover={{ color: "gray.600", textDecoration: "underline" }}
        userSelect="none"
      >
        Admin Mode
      </Text>
    </Box>
  );
}

export default App; 