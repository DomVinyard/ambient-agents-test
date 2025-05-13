import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import { useEffect } from 'react';
import Actions from './pages/Actions';
import Memory from './pages/Memory';
import Connection from './pages/Connection';
import Agent from './pages/Agent';
import Sidebar from './components/Sidebar';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/actions');
    }
  }, [location.pathname, navigate]);

  return (
    <Flex minH="100vh" w="100vw" bg="gray.900">
      <Sidebar />
      <Box flex="1" p={6}>
        <Routes>
          <Route path="/actions" element={<Actions />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/connection/:connection_id" element={<Connection />} />
          <Route path="/agent/:agent_id" element={<Agent />} />
          <Route path="/" element={<Actions />} />
        </Routes>
      </Box>
    </Flex>
  );
}

export default App; 