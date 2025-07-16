import { useCallback, useEffect, useState } from 'react';
import { isAuthenticated } from '../utils/auth.utils';

export interface FileItem {
  name: string;
  content: string;
  lastModified: Date;
}

const STORAGE_KEY = 'profile-files';

export const useDataLoader = () => {
  // Core state
  const [emails, setEmails] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authenticationStatus, setAuthenticationStatus] = useState<'authenticated' | 'unauthenticated' | 'checking'>('checking');
  const [error, setError] = useState<string | null>(null);

  // File management state
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [selectedFileItem, setSelectedFileItem] = useState<FileItem | null>(null);

  // IndexedDB state
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);


  const dbName = 'ambient-agents-db';
  const dbVersion = 1;

  // Generic localStorage methods
  const setItem = useCallback((key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to store ${key} in localStorage:`, error);
    }
  }, []);

  const getItem = useCallback((key: string): any | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to retrieve ${key} from localStorage:`, error);
      return null;
    }
  }, []);

  const removeItem = useCallback((key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  }, []);

  // IndexedDB initialization
  const initDB = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setDb(request.result);
        setIsInitialized(true);
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!database.objectStoreNames.contains('emails')) {
          database.createObjectStore('emails', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('insights')) {
          database.createObjectStore('insights');
        }
        
        if (!database.objectStoreNames.contains('userInfo')) {
          database.createObjectStore('userInfo');
        }
      };
    });
  }, []);

  // Initialize IndexedDB on mount
  useEffect(() => {
    if (!isInitialized) {
      initDB();
    }
  }, [initDB, isInitialized]);

  // Auth checking
  const checkAuth = async () => {
    try {
      const isAuth = isAuthenticated();
      setAuthenticationStatus(isAuth ? 'authenticated' : 'unauthenticated');
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthenticationStatus('unauthenticated');
    }
  };

  // Load stored data from IndexedDB
  const loadStoredData = async () => {
    try {
      setIsLoading(true);
      
      if (!db) await initDB();
      
      const [storedEmails, storedUserInfo] = await Promise.all([
        new Promise<any[]>((resolve, reject) => {
          const transaction = db!.transaction(['emails'], 'readonly');
          const store = transaction.objectStore('emails');
          const request = store.getAll();
          
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
        new Promise<any>((resolve, reject) => {
          const transaction = db!.transaction(['userInfo'], 'readonly');
          const store = transaction.objectStore('userInfo');
          const request = store.get('current');
          
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        })
      ]);

      setEmails(storedEmails);
      setUserInfo(storedUserInfo);
      
      // Load files from localStorage
      const storedFiles = getItem(STORAGE_KEY);
      if (storedFiles) {
        // Convert stored dates back to Date objects
        const filesWithDates = Object.entries(storedFiles).reduce((acc, [key, file]: [string, any]) => {
          acc[key] = {
            ...file,
            lastModified: new Date(file.lastModified)
          };
          return acc;
        }, {} as Record<string, FileItem>);
        
        setFiles(filesWithDates);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
      setError('Failed to load stored data');
    } finally {
      setIsLoading(false);
    }
  };

  // File management methods
  const createOrUpdateFile = useCallback((fileName: string, content: string) => {
    const fileItem: FileItem = {
      name: fileName,
      content,
      lastModified: new Date()
    };

    setFiles(prev => {
      const newFiles = {
        ...prev,
        [fileName]: fileItem
      };
      
      // Persist to localStorage
      setItem(STORAGE_KEY, newFiles);
      
      return newFiles;
    });

    console.log(`📁 Created/updated file: ${fileName}`);
  }, [setItem]);

  const handleFileSelect = useCallback((fileName: string) => {
    const file = files[fileName];
    if (file) {
      setSelectedFileItem(file);
    }
  }, [files]);

  const handleSaveFile = useCallback((fileName: string, content: string) => {
    createOrUpdateFile(fileName, content);
    
    // Update selected file if it's the one being saved
    if (selectedFileItem?.name === fileName) {
      setSelectedFileItem({
        ...selectedFileItem,
        content,
        lastModified: new Date()
      });
    }
  }, [createOrUpdateFile, selectedFileItem]);

  const handleDeleteFile = useCallback((fileName: string) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[fileName];
      
      // Persist to localStorage
      setItem(STORAGE_KEY, newFiles);
      
      return newFiles;
    });

    // Clear selection if deleted file was selected
    if (selectedFileItem?.name === fileName) {
      setSelectedFileItem(null);
    }

    console.log(`🗑️ Deleted file: ${fileName}`);
  }, [setItem, selectedFileItem]);

  const clearAllFiles = useCallback(() => {
    setFiles({});
    setSelectedFileItem(null);
    removeItem(STORAGE_KEY);
    console.log('🗑️ All files cleared');
  }, [removeItem]);

  // Clear all data from IndexedDB
  const clearAllData = useCallback(async (): Promise<void> => {
    if (!db) await initDB();
    
    const transaction = db!.transaction(['emails', 'insights', 'userInfo'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('emails').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('insights').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('userInfo').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    // Clear in-memory state
    setEmails([]);
    setUserInfo(null);
    
    console.log('🗑️ All data cleared from IndexedDB');
  }, [db, initDB]);

  const handleDeleteAllData = useCallback(async () => {
    if (
      window.confirm(
        "Are you sure you want to delete ALL data? This will remove emails, insights, and profile files. This action cannot be undone."
      )
    ) {
      try {
        await clearAllData();
        clearAllFiles();
        console.log("All data deleted successfully");
      } catch (error) {
        console.error("Error clearing data:", error);
      }
    }
  }, [clearAllData, clearAllFiles]);

  useEffect(() => {
    checkAuth();
    loadStoredData();
  }, []);

  return {
    // Core state
    emails,
    userInfo,
    isLoading,
    authenticationStatus,
    error,
    
    // File management state
    files,
    selectedFileItem,
    
    // IndexedDB state
    isInitialized,
    db,
    initDB,
    
    // Data loading
    loadStoredData,
    
    // File management methods
    createOrUpdateFile,
    handleFileSelect,
    handleSaveFile,
    handleDeleteFile,
    clearAllFiles,
    setSelectedFileItem,
    
    // Data management methods
    clearAllData,
    handleDeleteAllData,
    
    // Generic localStorage methods
    setItem,
    getItem,
    removeItem,
  };
}; 