import { useState, useEffect, useCallback } from 'react';
import { useDataLoader } from './useDataLoader';
import { INSIGHTS_BATCH_SIZE } from '../consts';

export interface ExtractInsightsBatchRequest {
  emails: any[];
  userInfo: any;
}

export const useInsightsManager = (selectedEmailId: string | null) => {
  const [insights, setInsights] = useState<any[]>([]);
  const [insightsByEmail, setInsightsByEmail] = useState<Record<string, any[]>>({});
  const [insightError, setInsightError] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);
  
  const dataLoader = useDataLoader();

  // IndexedDB methods for insights
  const setInsightsInDB = useCallback(async (insights: Record<string, any[]>): Promise<void> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = dataLoader.db!.transaction(['insights'], 'readwrite');
      const store = transaction.objectStore('insights');
      const request = store.put(insights, 'all');
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, [dataLoader.db, dataLoader.initDB]);

  const getInsightsFromDB = useCallback(async (): Promise<Record<string, any[]>> => {
    if (!dataLoader.db) await dataLoader.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = dataLoader.db!.transaction(['insights'], 'readonly');
      const store = transaction.objectStore('insights');
      const request = store.get('all');
      
      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(request.error);
    });
  }, [dataLoader.db, dataLoader.initDB]);

  // Load insights from storage on mount and when selectedEmailId changes
  useEffect(() => {
    const loadInsights = async () => {
      try {
        const storedInsights = await getInsightsFromDB();
        setInsightsByEmail(storedInsights);
        
        // Set current insights for selected email
        if (selectedEmailId && storedInsights[selectedEmailId]) {
          setInsights(storedInsights[selectedEmailId]);
        } else {
          setInsights([]);
        }
      } catch (error) {
        console.error('Error loading insights:', error);
        setInsightError('Failed to load insights');
      }
    };

    loadInsights();
  }, [selectedEmailId, getInsightsFromDB]);

  /**
   * Extract insights from a single email using batch processing
   */
  const extractInsightsFromEmail = async (
    email: any,
    userInfo: any,
    callbacks?: {
      onProgressUpdate?: (stage: string, progress: { processed: number; total: number }) => void;
      onInsightReceived?: (insights: any[]) => void;
    }
  ): Promise<any[]> => {
    const result = await extractInsightsBatch(
      { emails: [email], userInfo },
      callbacks
    );
    return result[email.id] || [];
  };

  const extractInsightsBatch = async (
    request: { emails: any[]; userInfo: any },
    callbacks?: {
      onProgressUpdate?: (stage: string, progress: { processed: number; total: number }) => void;
      onInsightReceived?: (insights: any[]) => void;
    }
  ): Promise<Record<string, any[]>> => {
    const { emails, userInfo } = request;
    const totalEmails = emails.length;
    let processedCount = 0;
    const insightsByEmailResult: Record<string, any[]> = {};

    // Process emails in batches
    for (let i = 0; i < emails.length; i += INSIGHTS_BATCH_SIZE) {
      const batch = emails.slice(i, i + INSIGHTS_BATCH_SIZE);
      
      const batchPromises = batch.map(async (email) => {
        try {
          const response = await fetch(`${import.meta.env.VITE_SERVER_URI}/api/insights/extract-insights`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emailId: email.id,
              emailData: email,
              userInfo,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to extract insights: ${response.statusText}`);
          }

          const data = await response.json();
          insightsByEmailResult[email.id] = data.insights;
          
          // Notify callback
          if (callbacks?.onInsightReceived) {
            callbacks.onInsightReceived(data.insights);
          }
          
          processedCount++;
          if (callbacks?.onProgressUpdate) {
            callbacks.onProgressUpdate('insightsProgress', {
              processed: processedCount,
              total: totalEmails,
            });
          }
          
        } catch (error) {
          console.error(`Failed to extract insights for email ${email.id}:`, error);
          processedCount++;
          if (callbacks?.onProgressUpdate) {
            callbacks.onProgressUpdate('insightsProgress', {
              processed: processedCount,
              total: totalEmails,
            });
          }
        }
      });

      await Promise.all(batchPromises);
    }

    // Store all insights
    await setInsightsInDB(insightsByEmailResult);
    setInsightsByEmail(insightsByEmailResult);
    
    return insightsByEmailResult;
  };

  const getInsights = async (): Promise<Record<string, any[]>> => {
    return getInsightsFromDB();
  };

  const clearInsights = async () => {
    await setInsightsInDB({});
    setInsightsByEmail({});
    setInsights([]);
    setInsightError(null);
    console.log('🗑️ All insights cleared');
  };

  /**
   * Group insights by category
   */
  const groupInsightsByCategory = (insightsByEmail: Record<string, any[]>): Record<string, any[]> => {
    const allInsights: any[] = [];
    Object.values(insightsByEmail).forEach((emailInsights) => {
      allInsights.push(...emailInsights);
    });
    
    const insightsByCategoryMap: Record<string, any[]> = {};
    allInsights.forEach(insight => {
      insight.categories.forEach((category: string) => {
        if (!insightsByCategoryMap[category]) {
          insightsByCategoryMap[category] = [];
        }
        insightsByCategoryMap[category].push(insight);
      });
    });
    
    return insightsByCategoryMap;
  };

  const handleInsightSelect = (insight: any) => {
    setSelectedInsight(insight);
  };

  return {
    // State
    insights,
    insightsByEmail,
    insightError,
    selectedInsight,
    
    // Operations
    extractInsightsFromEmail,
    extractInsightsBatch,
    getInsights,
    clearInsights,
    groupInsightsByCategory,
    handleInsightSelect,
    
    // State setters (for external use)
    setInsights,
    setInsightsByEmail,
    setInsightError,
  };
}; 