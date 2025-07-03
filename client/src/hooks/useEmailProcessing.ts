import { useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { Email, Insight } from '../types';
import { storageService } from '../services/storage.service';
import axios from 'axios';

export function useEmailProcessing() {
  const [extractingInsights, setExtractingInsights] = useState(false);
  const [processingEmailIds, setProcessingEmailIds] = useState<Set<string>>(new Set());
  const [queuedEmailIds, setQueuedEmailIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  const getAuthTokens = () => {
    const authData = localStorage.getItem("ambient-agents-auth");
    if (!authData) {
      throw new Error("Not authenticated");
    }

    const { tokens: tokenString } = JSON.parse(authData);
    if (!tokenString) {
      throw new Error("No tokens found");
    }

    return typeof tokenString === "string"
      ? JSON.parse(decodeURIComponent(tokenString))
      : tokenString;
  };

  const handleExtractInsights = async (
    selectedEmailId: string | null,
    selectedEmail: Email | null,
    userInfo: any,
    emails: Email[],
    insightsByEmail: Record<string, Insight[]>,
    setEmails: (emails: Email[]) => void,
    setInsightsByEmail: (insights: Record<string, Insight[]>) => void,
    setInsights: (insights: Insight[]) => void,
    setInsightError: (error: string | null) => void
  ) => {
    if (!selectedEmailId) return;

    setExtractingInsights(true);
    setInsightError(null);

    // Clear previous insights when reextracting
    if (insightsByEmail[selectedEmailId]) {
      setInsights([]);
      const clearedInsights = { ...insightsByEmail };
      delete clearedInsights[selectedEmailId];
      setInsightsByEmail(clearedInsights);
      await storageService.setInsights(clearedInsights);
    }

    try {
      const tokens = getAuthTokens();

      const response = await axios.post(
        "http://localhost:3001/api/gmail/extract-insights",
        {
          tokens,
          emailId: selectedEmailId,
          emailData: selectedEmail,
          userInfo: userInfo,
          sessionId: "default",
        }
      );

      const newInsights = response.data.insights;
      const classification = response.data.classification;

      // Update insights for this specific email
      const updatedInsightsByEmail = {
        ...insightsByEmail,
        [selectedEmailId]: newInsights,
      };
      setInsightsByEmail(updatedInsightsByEmail);
      setInsights(newInsights);

      // Update email with classification data if available
      if (classification && selectedEmail) {
        const updatedEmails = emails.map((email) =>
          email.id === selectedEmailId ? { ...email, classification } : email
        );
        setEmails(updatedEmails);

        // Store updated emails in IndexedDB
        await storageService.setEmails(updatedEmails);
      }

      // Store insights in IndexedDB
      await storageService.setInsights(updatedInsightsByEmail);
    } catch (error) {
      console.error("Error extracting insights:", error);
      setInsightError("Failed to extract insights. Please try again.");
      toast({
        title: "Error",
        description: "Failed to extract insights. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setExtractingInsights(false);
    }
  };

  return {
    extractingInsights,
    processingEmailIds,
    queuedEmailIds,
    setProcessingEmailIds,
    setQueuedEmailIds,
    handleExtractInsights,
    getAuthTokens
  };
} 