import { useState } from 'react';
import { useDataLoader, FileItem } from './useDataLoader';
import { 
  blendProfile, 
  compileProfile, 
  analyzeAutomation,
  BlendProfileRequest,
  CompileProfileRequest,
  AnalyzeAutomationRequest
} from '../api/profile.api';

export interface ProfileProgress {
  stage: 'idle' | 'fetchProgress' | 'insightsProgress' | 'profileProgress' | 'compileProgress';
  processed: number;
  total: number;
}

export interface ProfileBuildOptions {
  emailsToProcess?: any[];
  userInfoToUse?: any;
  onProgressUpdate?: (stage: string, progress: { processed: number; total: number }) => void;
  onStatusUpdate?: (status: string) => void;
  onInsightReceived?: (insights: any[]) => void;
  onFileCreated?: (fileName: string, content: string) => void;
  clearExistingData?: boolean;
  insightsManager?: any;
}

export interface ProfileBuildResult {
  success: boolean;
  totalCategories: number;
  successfulEmails: number;
  totalEmails: number;
  profileFiles: Record<string, string>;
  automationData?: { summary: string; automations: any[] };
  errorCount: number;
}



export const useProfileManager = () => {
  const [progress, setProgress] = useState<ProfileProgress>({
    stage: 'idle',
    processed: 0,
    total: 0
  });
  const [status, setStatus] = useState<string>('');
  const [isBuilding, setIsBuilding] = useState(false);
  
  const dataLoader = useDataLoader();
  
  // Get file management from dataLoader
  const {
    files,
    selectedFileItem,
    createOrUpdateFile,
    handleFileSelect,
    handleSaveFile,
    handleDeleteFile,
    clearAllFiles
  } = dataLoader;

  const handleDeleteAllFiles = () => {
    if (
      window.confirm(
        "Are you sure you want to delete all profile files? This action cannot be undone."
      )
    ) {
      clearAllFiles();
      console.log("All profile files have been deleted");
    }
  };




  /**
   * Generate profile files for each category
   */
  const generateProfileFiles = async (
    insightsByCategoryMap: Record<string, any[]>,
    userInfo: any,
    options: ProfileBuildOptions
  ): Promise<Record<string, string>> => {
    const categoryCount = Object.keys(insightsByCategoryMap).length;
    options.onProgressUpdate?.('profileProgress', { processed: 0, total: categoryCount });
    
    let profileProcessedCount = 0;
    const generatedProfileFiles: Record<string, string> = {};

    const applyPromises = Object.entries(insightsByCategoryMap).map(
      async ([category, categoryInsights]: [string, any[]]) => {
        try {
          const response = await blendProfile({
            category,
            newInsights: categoryInsights,
            existingContent: null,
            userInfo
          });

          const fileName = `${category}.md`;
          generatedProfileFiles[fileName] = response.content;
          
          // Notify immediately when file is created
          if (options.onFileCreated) {
            options.onFileCreated(fileName, response.content);
          }

          profileProcessedCount++;
          options.onProgressUpdate?.('profileProgress', { processed: profileProcessedCount, total: categoryCount });

          console.log(`✅ Generated ${fileName} with ${categoryInsights.length} insights`);
        } catch (error) {
          console.error(`❌ Failed to generate profile for ${category}:`, error);
          profileProcessedCount++;
          options.onProgressUpdate?.('profileProgress', { processed: profileProcessedCount, total: categoryCount });
        }
      }
    );

    await Promise.all(applyPromises);
    return generatedProfileFiles;
  };

  /**
   * Format automation data for display
   */
  const formatAutomationData = (automationData: { summary: string; automations: any[] }): string => {
    return JSON.stringify(automationData, null, 2);
  };

  /**
   * Compile final profiles (full profile + automation analysis)
   */
  const compileFinalProfiles = async (
    profileFiles: Record<string, string>,
    userInfo: any,
    options: ProfileBuildOptions
  ): Promise<{ summary: string; automations: any[] } | undefined> => {
    options.onProgressUpdate?.('compileProgress', { processed: 0, total: 2 });
    
    try {
      const [compileResponse, automationResponse] = await Promise.all([
        compileProfile({ profileFiles, userInfo }),
        analyzeAutomation({ profileFiles, userInfo })
      ]);

      // Notify when compiled files are created
      if (options.onFileCreated) {
        options.onFileCreated("full.md", compileResponse.content);
        options.onFileCreated("automation.md", formatAutomationData(automationResponse));
      }

      options.onProgressUpdate?.('compileProgress', { processed: 2, total: 2 });
      
      return automationResponse;
      
    } catch (error) {
      console.error('❌ Compilation failed:', error);
      options.onProgressUpdate?.('compileProgress', { processed: 2, total: 2 });
      return undefined;
    }
  };

  /**
   * Execute the complete 4-step profile building pipeline
   */
  const buildProfile = async (options: ProfileBuildOptions): Promise<ProfileBuildResult> => {
    setIsBuilding(true);
    setProgress({ stage: 'fetchProgress', processed: 0, total: 1 });
    
    try {
      // We'll get emails and userInfo from the options since we don't have storage access here
      const currentEmails = options.emailsToProcess;
      const currentUserInfo = options.userInfoToUse;
      
      if (!currentEmails || currentEmails.length === 0) {
        throw new Error('No emails available');
      }
      
      if (!options.insightsManager) {
        throw new Error('Insights manager is required');
      }
      
      console.log(`🚀 Starting profile building with ${currentEmails.length} emails`);
      
      // Clear existing insights if requested
      if (options.clearExistingData) {
        await options.insightsManager.clearInsights();
      }

      // Step 1: Extract insights from all emails using BATCH processing
      const insightsByEmail = await options.insightsManager.extractInsightsBatch(
        { emails: currentEmails, userInfo: currentUserInfo },
        {
          onProgressUpdate: (stage: string, progress: { processed: number; total: number }) => {
            setProgress({
              stage: stage as any,
              processed: progress.processed,
              total: progress.total
            });
            options.onProgressUpdate?.(stage, progress);
          },
          onInsightReceived: options.onInsightReceived
        }
      );
      
      // Step 2: Group insights by category
      const insightsByCategoryMap = options.insightsManager.groupInsightsByCategory(insightsByEmail);
      
      // Step 3: Generate profile files
      const generatedProfileFiles = await generateProfileFiles(insightsByCategoryMap, currentUserInfo, options);
      
      // Step 4: Compile final profiles
      const automationData = await compileFinalProfiles(generatedProfileFiles, currentUserInfo, options);
      
      const successfulEmails = Object.keys(insightsByEmail).length;
      const categoryCount = Object.keys(insightsByCategoryMap).length;
      
      const result = {
        success: true,
        totalCategories: categoryCount,
        successfulEmails,
        totalEmails: currentEmails.length,
        profileFiles: generatedProfileFiles,
        automationData,
        errorCount: 0
      };
      
      // Show completion
      setProgress({ stage: 'compileProgress', processed: 1, total: 1 });
      
      // Clear after delay
      setTimeout(() => {
        setProgress({ stage: 'idle', processed: 0, total: 0 });
        setStatus('');
      }, 2000);
      
      return result;
      
    } catch (error) {
      console.error('❌ Profile building failed:', error);
      
      // Clear immediately on error
      setProgress({ stage: 'idle', processed: 0, total: 0 });
      setStatus('');
      
      throw error;
    } finally {
      setIsBuilding(false);
    }
  };

  const handleBuildProfile = async (dependencies: {
    insightsManager: any;
    progressManager: any;
  }) => {
    const { insightsManager, progressManager } = dependencies;
    
    try {
      progressManager.startEndToEndProcess();

      await buildProfile({
        clearExistingData: true,
        onProgressUpdate: progressManager.updateProgress,
        onFileCreated: createOrUpdateFile,
        insightsManager,
      });

      progressManager.completeProcess();
    } catch (error) {
      console.error("Error building profile:", error);
      progressManager.clearProgress();
    }
  };

  const handleCompileProfile = async (dependencies: {
    files: Record<string, any>;
    userInfo: any;
  }) => {
    const { userInfo } = dependencies;
    
    try {
      const profileFiles = Object.entries(files)
        .filter(([fileName]) => !["full.md", "automation.md"].includes(fileName))
        .reduce((acc, [fileName, file]) => {
          acc[fileName] = file.content;
          return acc;
        }, {} as Record<string, string>);

      if (Object.keys(profileFiles).length === 0) {
        console.warn("No profile files available for compilation");
        return;
      }

      const [compileResponse, automationResponse] = await Promise.all([
        compileProfile({ profileFiles, userInfo }),
        analyzeAutomation({ profileFiles, userInfo }),
      ]);

      createOrUpdateFile("full.md", compileResponse.content);
      createOrUpdateFile("automation.md", JSON.stringify(automationResponse, null, 2));

      console.log("Profile compilation completed successfully");
    } catch (error) {
      console.error("Error compiling profile:", error);
    }
  };

  return {
    // State
    progress,
    status,
    isBuilding,
    
    // Profile file management state
    files,
    selectedFileItem,
    
    // Main operations
    buildProfile,
    handleBuildProfile,
    handleCompileProfile,
    
    // Profile file management methods
    createOrUpdateFile,
    handleFileSelect,
    handleSaveFile,
    handleDeleteFile,
    clearAllFiles,
    handleDeleteAllFiles,
    
    // Individual API operations
    blendProfile,
    compileProfile,
    analyzeAutomation,
    
    // Helper functions
    generateProfileFiles,
    compileFinalProfiles,
    formatAutomationData,
  };
}; 