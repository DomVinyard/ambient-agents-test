import { useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { profileService } from '../services/profile.service';
import { Email, Insight } from '../types';
import { storageService } from '../services/storage.service';

interface MasterProgress {
  fetchProgress: { processed: number; total: number } | null;
  insightsProgress: { processed: number; total: number } | null;
  profileProgress: { processed: number; total: number } | null;
  compileProgress: { processed: number; total: number } | null;
  isEndToEndProcess: boolean;
}

export function useProfileBuilder() {
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [masterProgress, setMasterProgress] = useState<MasterProgress>({
    fetchProgress: null,
    insightsProgress: null,
    profileProgress: null,
    compileProgress: null,
    isEndToEndProcess: false,
  });
  const toast = useToast();

  const formatAutomationData = (automationData: {
    summary: string;
    automations: any[];
  }): string => {
    // Return raw JSON for the automation file
    return JSON.stringify(automationData, null, 2);
  };

  const handleBuildProfile = async (
    emails: Email[],
    userInfo: any,
    insightsByEmail: Record<string, Insight[]>,
    setInsightsByEmail: (insights: Record<string, Insight[]>) => void,
    setEmails: (emails: Email[]) => void,
    setProcessingEmailIds: (ids: Set<string>) => void,
    createOrUpdateFile: (fileName: string, content: string) => void,
    clearAllFiles?: () => void
  ) => {
    const currentEmails = emails;
    const currentUserInfo = userInfo;

    if (currentEmails.length === 0) {
      toast({
        title: "No emails available",
        description: "Please fetch emails first.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setBuildingProfile(true);
    
    // Clear existing insights and files if requested
    setInsightsByEmail({});
    await storageService.setInsights({});

    try {
      const result = await profileService.buildProfile({
        emailsToProcess: currentEmails,
        userInfoToUse: currentUserInfo,
        clearExistingData: true,
        onProgressUpdate: (stage: string, progress: { processed: number; total: number }) => {
          setMasterProgress(prev => ({
            ...prev,
            [stage]: progress,
          }));
        },
        onInsightReceived: (insights) => {
          // Real-time insight updates handled by the service
        }
      });

      // Create profile files from the result
      if (result.profileFiles) {
        Object.entries(result.profileFiles).forEach(([fileName, content]) => {
          createOrUpdateFile(fileName, content);
        });
      }

      // Show completion message
      const resultStatus = result.errorCount > 0 ? "warning" : "success";
      
      toast({
        title: "Profile Building Complete",
        description: `Generated ${result.totalCategories} profile files from ${result.successfulEmails}/${result.totalEmails} emails`,
        status: resultStatus,
        duration: 5000,
        isClosable: true,
      });

      // Clear master progress after a delay
      setTimeout(() => {
        setMasterProgress(prev => ({
          ...prev,
          isEndToEndProcess: false,
          fetchProgress: null,
          insightsProgress: null,
          profileProgress: null,
          compileProgress: null,
        }));
      }, 3000);

    } catch (error) {
      console.error("❌ Profile building failed:", error);
      toast({
        title: "Profile Building Failed",
        description: "An error occurred while building the profile.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setBuildingProfile(false);
    }
  };

  return {
    buildingProfile,
    masterProgress,
    setMasterProgress,
    handleBuildProfile,
    formatAutomationData
  };
} 