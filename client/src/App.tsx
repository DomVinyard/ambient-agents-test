import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import AdminDashboard from "./components/AdminDashboard";

// Gmail icon component
const GmailIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z"
      fill="currentColor"
    />
  </svg>
);

function LoginPage() {
  const handleGoogleLogin = () => {
    // Redirect to the server's OAuth endpoint for admin mode only
    window.location.href = `${
      import.meta.env.VITE_SERVER_URI
    }/auth/gmail?mode=admin`;
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
      <VStack spacing={8} maxW="md" w="full">
        <Heading size="xl" textAlign="center" color="gray.900">
          AI Insight Extract
        </Heading>

        <VStack spacing={6}>
          <Text fontSize="lg" textAlign="center" color="gray.600">
            Admin Dashboard Access
          </Text>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleGoogleLogin}
            px={8}
            leftIcon={<GmailIcon size={20} />}
          >
            Sign in with Google
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
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
    const savedAuth = localStorage.getItem("ambient-agents-auth");
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      const savedMode = authData.mode || "admin";

      if (authData.isAuthenticated && savedMode === "admin") {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
    }

    // Check URL params for authentication success
    const urlParams = new URLSearchParams(window.location.search);
    const gmailStatus = urlParams.get("gmail");
    const tokens = urlParams.get("tokens");
    const authMode = urlParams.get("mode");

    if (gmailStatus === "success" && tokens && authMode === "admin") {
      setIsAuthenticated(true);
      // Save to localStorage with mode
      localStorage.setItem(
        "ambient-agents-auth",
        JSON.stringify({
          isAuthenticated: true,
          tokens: tokens,
          mode: authMode,
        })
      );
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (gmailStatus === "error") {
      // Clear any existing auth on error
      localStorage.removeItem("ambient-agents-auth");
      setIsAuthenticated(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("ambient-agents-auth");
    window.location.href = "/admin";
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

  return <AdminDashboard onLogout={handleLogout} />;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminRoute />} />
        {/* Catch all other routes and redirect to admin */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
