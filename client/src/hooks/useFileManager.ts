import { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { FileItem } from '../types';
import { storageService } from '../services/storage.service';

const STORAGE_KEY = 'ambient-agents-files';

export function useFileManager() {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const toast = useToast();

  // Load files from storage on mount
  useEffect(() => {
    const savedFiles = storageService.getItem(STORAGE_KEY);
    console.log('Loading files from storage:', savedFiles ? 'Found data' : 'No data');
    
    if (savedFiles) {
      try {
        console.log('Parsed files:', Object.keys(savedFiles));
        setFiles(savedFiles);
        // Auto-select the first file if any exist
        const fileNames = Object.keys(savedFiles);
        if (fileNames.length > 0) {
          setSelectedFile(fileNames[0]);
        }
      } catch (error) {
        console.error('Error loading files from storage:', error);
      }
    }
    setHasLoadedFromStorage(true);
  }, []);

  // Save files to storage whenever files change (but not on initial load)
  useEffect(() => {
    if (hasLoadedFromStorage) {
      console.log('Saving files to storage:', Object.keys(files));
      storageService.setItem(STORAGE_KEY, files);
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

  const clearAllFiles = () => {
    setFiles({});
    setSelectedFile(null);
  };

  const selectedFileItem = selectedFile ? files[selectedFile] : null;

  return {
    files,
    selectedFile,
    selectedFileItem,
    createOrUpdateFile,
    handleFileSelect,
    handleDeleteFile,
    handleSaveFile,
    clearAllFiles
  };
} 