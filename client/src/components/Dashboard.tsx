import { Box, Flex, useToast } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import Toolbar from './Toolbar';
import FileExplorer from './FileExplorer';
import MarkdownEditor from './MarkdownEditor';
import { PusherReceiver } from './PusherReceiver';
import axios from 'axios';

interface FileItem {
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'ambient-agents-files';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [status, setStatus] = useState<string>('');
  const toast = useToast();

  // Load files from localStorage on mount
  useEffect(() => {
    const savedFiles = localStorage.getItem(STORAGE_KEY);
    console.log('Loading files from localStorage:', savedFiles ? 'Found data' : 'No data');
    
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        console.log('Parsed files:', Object.keys(parsedFiles));
        setFiles(parsedFiles);
        // Auto-select the first file if any exist
        const fileNames = Object.keys(parsedFiles);
        if (fileNames.length > 0) {
          setSelectedFile(fileNames[0]);
        }
      } catch (error) {
        console.error('Error loading files from localStorage:', error);
      }
    }
    setHasLoadedFromStorage(true);
  }, []);

  // Save files to localStorage whenever files change (but not on initial load)
  useEffect(() => {
    if (hasLoadedFromStorage) {
      console.log('Saving files to localStorage:', Object.keys(files));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    }
  }, [files, hasLoadedFromStorage]);

  const createOrUpdateFile = (fileName: string, content: string) => {
    const now = new Date().toISOString();
    const existingFile = files[fileName];
    
    const fileItem: FileItem = {
      name: fileName,
      content,
      createdAt: existingFile?.createdAt || now,
      updatedAt: now
    };

    setFiles(prev => ({
      ...prev,
      [fileName]: fileItem
    }));

    // Auto-select the new/updated file
    setSelectedFile(fileName);
  };

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(fileName);
  };

  const handleDeleteFile = (fileName: string) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[fileName];
      return newFiles;
    });

    // If we deleted the selected file, select another one or none
    if (selectedFile === fileName) {
      const remainingFiles = Object.keys(files).filter(name => name !== fileName);
      setSelectedFile(remainingFiles.length > 0 ? remainingFiles[0] : null);
    }

    toast({
      title: 'File deleted',
      description: `${fileName} has been deleted.`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleSaveFile = (fileName: string, content: string) => {
    createOrUpdateFile(fileName, content);
    toast({
      title: 'File saved',
      description: `${fileName} has been saved successfully.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleCreateBasicProfile = async () => {
    setIsLoading(true);
    try {
      // Get tokens from localStorage
      const authData = localStorage.getItem('ambient-agents-auth');
      if (!authData) {
        throw new Error('Not authenticated');
      }
      
      const { tokens: tokenString } = JSON.parse(authData);
      if (!tokenString) {
        throw new Error('No tokens found');
      }
      
      // Parse the tokens if they're still a string (from URL encoding)
      const tokens = typeof tokenString === 'string' ? JSON.parse(decodeURIComponent(tokenString)) : tokenString;

      // Call the API to get recent emails and create profile
      const response = await axios.post('http://localhost:3001/api/gmail/basic-profile', {
        tokens,
        sessionId: 'default' // Using default session for now
      });

      const profileContent = response.data.profileContent;
      
      // Create the profile.md file
      createOrUpdateFile('profile.md', profileContent);
      
      toast({
        title: 'Basic Profile Created',
        description: 'Your profile has been generated from recent emails.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Error creating basic profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to create basic profile. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFileItem = selectedFile ? files[selectedFile] : null;

  return (
    <Box h="100vh" bg="gray.50">
      <PusherReceiver 
        sessionId="default"
        onStatusUpdate={setStatus}
      />
      
      <Toolbar 
        onCreateBasicProfile={handleCreateBasicProfile}
        onLogout={onLogout}
        isLoading={isLoading}
        status={status}
      />
      
      <Flex h="calc(100vh - 60px)">
        <FileExplorer
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onFileDelete={handleDeleteFile}
          files={files}
        />
        
        <MarkdownEditor
          file={selectedFileItem}
          onSave={handleSaveFile}
        />
      </Flex>
    </Box>
  );
} 