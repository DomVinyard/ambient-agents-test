import { useState, useCallback } from 'react';
import { useDataLoader } from './useDataLoader';

export interface FetchEmailsRequest {
  sentCount: number;
  receivedCount: number;
}

export interface FetchEmailsResponse {
  emails: any[];
  userInfo: any;
}

export interface EmailManagerOptions {
  onProgressUpdate?: (stage: string, progress: { processed: number; total: number }) => void;
}

/**
 * Email manager hook that handles email data operations
 */
export const useEmailManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingEmailIds, setProcessingEmailIds] = useState<Set<string>>(new Set());
  const [queuedEmailIds, setQueuedEmailIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  const dataLoader = useDataLoader();

  // IndexedDB methods for emails
  const setEmailsInDB = useCallback(async (emailsData: any[]): Promise<void> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    const transaction = dataLoader.db!.transaction(['emails'], 'readwrite');
    const store = transaction.objectStore('emails');
    
    // Clear existing emails first
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Add all new emails
    for (const email of emailsData) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add(email);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }, [dataLoader.db, dataLoader.initDB]);

  const getEmailsFromDB = useCallback(async (): Promise<any[]> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = dataLoader.db!.transaction(['emails'], 'readonly');
      const store = transaction.objectStore('emails');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }, [dataLoader.db, dataLoader.initDB]);

  // IndexedDB methods for user info
  const setUserInfoInDB = useCallback(async (userInfoData: any): Promise<void> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = dataLoader.db!.transaction(['userInfo'], 'readwrite');
      const store = transaction.objectStore('userInfo');
      const request = store.put(userInfoData, 'current');
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, [dataLoader.db, dataLoader.initDB]);

  const getUserInfoFromDB = useCallback(async (): Promise<any | null> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = dataLoader.db!.transaction(['userInfo'], 'readonly');
      const store = transaction.objectStore('userInfo');
      const request = store.get('current');
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }, [dataLoader.db, dataLoader.initDB]);

  // Clear all IndexedDB data
  const clearAllDB = useCallback(async (): Promise<void> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    const transaction = dataLoader.db!.transaction(['emails', 'insights', 'userInfo'], 'readwrite');
    
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
  }, [dataLoader.db, dataLoader.initDB]);

  /**
   * Fetch emails from Gmail API and store them locally
   */
  const fetchEmails = async (request: FetchEmailsRequest): Promise<FetchEmailsResponse> => {
    try {
      setError(null);
      
      console.log(`📧 Fetching ${request.sentCount} sent and ${request.receivedCount} received emails...`);
      
      const response = await fetch(`${import.meta.env.VITE_SERVER_URI}/api/gmail/fetch-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`✅ Fetched ${data.emails.length} emails successfully`);
      
      // Store in IndexedDB
      await Promise.all([
        setEmailsInDB(data.emails),
        setUserInfoInDB(data.userInfo),
      ]);
      
      return data;
      
    } catch (error: any) {
      console.error('❌ Error fetching emails:', error);
      setError(error.message || 'Failed to fetch emails');
      throw error;
    }
  };

  /**
   * Fetch emails and store them with progress tracking
   */
  const fetchAndStoreEmails = async (
    request: FetchEmailsRequest, 
    options?: EmailManagerOptions
  ): Promise<FetchEmailsResponse> => {
    options?.onProgressUpdate?.('fetchProgress', { processed: 0, total: 1 });
    
    const response = await fetchEmails(request);
    
    // Store in IndexedDB
    await Promise.all([
      setEmailsInDB(response.emails),
      setUserInfoInDB(response.userInfo),
    ]);

    options?.onProgressUpdate?.('fetchProgress', { processed: 1, total: 1 });
    
    return response;
  };



  /**
   * Clear all stored email data
   */
  const clearEmailData = async (): Promise<void> => {
    await clearAllDB();
    console.log('🗑️ All data cleared from storage');
  };

  /**
   * Check if a specific email is being processed
   */
  const isEmailProcessing = (emailId: string): boolean => {
    return processingEmailIds.has(emailId);
  };

  const handleFetchEmails = async (
    options: {
      buildProfile: boolean;
      sentCount: number;
      receivedCount: number;
      deleteProfileFiles: boolean;
    },
    dependencies: {
      profileManager: any;
      insightsManager: any;
      progressManager: any;
    }
  ) => {
    const { profileManager, insightsManager, progressManager } = dependencies;
    
    try {
      if (options.buildProfile) {
        progressManager.startEndToEndProcess();
      }

      if (options.deleteProfileFiles) {
        profileManager.clearAllFiles();
      }

      // Clear existing insights
      await insightsManager.clearInsights();

      // Fetch emails
      const data = await fetchAndStoreEmails({ 
        sentCount: options.sentCount, 
        receivedCount: options.receivedCount 
      });

      // Build profile if requested
      if (options.buildProfile) {
        await profileManager.buildProfile({
          clearExistingData: true,
          onProgressUpdate: progressManager.updateProgress,
          onFileCreated: profileManager.createOrUpdateFile,
          insightsManager,
          emailsToProcess: data.emails,
          userInfoToUse: data.userInfo,
        });

        progressManager.completeProcess();
      }
      
      return data;
    } catch (error) {
      console.error("Error in fetch/build process:", error);
      progressManager.clearProgress();
      throw error;
    } finally {
      if (!options.buildProfile) {
        progressManager.clearFetchProgress();
      }
    }
  };





  return {
    // Email data operations
    fetchAndStoreEmails,
    clearEmailData,
    handleFetchEmails,
    getUserInfoFromDB,
    getEmailsFromDB,
    
    // Processing state (for UI feedback)
    isProcessing,
    processingEmailIds,
    queuedEmailIds,
    error,
    isEmailProcessing,
    setIsProcessing,
    setProcessingEmailIds,
    setQueuedEmailIds,
    setError,
  };
}; 