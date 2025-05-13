import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import App from './App';
import './index.css';
import { AppStateProvider } from './state/AppStateContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider>
      <AppStateProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppStateProvider>
    </ChakraProvider>
  </React.StrictMode>
); 