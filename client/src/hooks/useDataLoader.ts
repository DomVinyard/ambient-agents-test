import { useState, useEffect } from 'react';
import { Email, Insight } from '../types';
import { storageService } from '../services/storage.service';

interface UserInfo {
  email: string;
  firstName: string;
  lastName: string;
}

export function useDataLoader() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsByEmail, setInsightsByEmail] = useState<Record<string, Insight[]>>({});
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Load stored data on mount
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const [storedEmails, storedUserInfo, storedInsights] = await Promise.all([
          storageService.getEmails(),
          storageService.getUserInfo(),
          storageService.getInsights(),
        ]);

        if (storedEmails.length > 0) {
          setEmails(storedEmails);
        }

        if (storedUserInfo) {
          setUserInfo(storedUserInfo);
        }

        if (Object.keys(storedInsights).length > 0) {
          setInsightsByEmail(storedInsights);
        }
      } catch (error) {
        console.error("Error loading data from storage:", error);
        try {
          await storageService.clearAll();
        } catch (clearError) {
          console.error("Error clearing corrupted storage:", clearError);
        }
      }
    };

    loadStoredData();
  }, []);

  // Update current insights when selectedEmailId changes
  useEffect(() => {
    if (selectedEmailId && insightsByEmail[selectedEmailId]) {
      setInsights(insightsByEmail[selectedEmailId]);
    } else {
      setInsights([]);
    }
  }, [selectedEmailId, insightsByEmail]);

  const selectedEmail = selectedEmailId
    ? emails.find((e) => e.id === selectedEmailId) || null
    : null;

  const clearAllData = async () => {
    setEmails([]);
    setSelectedEmailId(null);
    setInsights([]);
    setInsightsByEmail({});
    setUserInfo(null);
    await storageService.clearAll();
  };

  const resetEmailData = () => {
    setEmails([]);
    setSelectedEmailId(null);
    setInsights([]);
    setInsightsByEmail({});
  };

  return {
    // State
    emails,
    setEmails,
    selectedEmailId,
    setSelectedEmailId,
    insights,
    setInsights,
    insightsByEmail,
    setInsightsByEmail,
    userInfo,
    setUserInfo,
    selectedEmail,
    
    // Actions
    clearAllData,
    resetEmailData,
  };
} 