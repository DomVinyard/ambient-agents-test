import { 
  Box, 
  Flex, 
  useToast
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import pLimit from 'p-limit';
import Toolbar from './Toolbar';
import EmailList from './EmailList';
import EmailViewer from './EmailViewer';
import InsightsViewer from './InsightsViewer';
import FileList from './FileList';
import FileEditor from './FileEditor';
import { PusherReceiver } from './PusherReceiver';
import FetchEmailsModal from './FetchEmailsModal';
import MasterProgressBar from './MasterProgressBar';
import { useFileManager } from '../hooks/useFileManager';
import { Email, Insight } from '../types';
import { storageService } from '../services/storage.service';
import axios from 'axios';

interface DashboardProps {
  onLogout: () => void;
}

// Extracted state interfaces for better organization
interface EmailState {
  emails: Email[];
  selectedEmailId: string | null;
  userInfo: { email: string; firstName: string; lastName: string } | null;
  error: string | null;
  fetching: boolean;
}

interface InsightState {
  insights: Insight[];
  insightsByEmail: Record<string, Insight[]>;
  extracting: boolean;
  applyingToBio: boolean;
  insightError: string | null;
  bioError: string | null;
}

interface ProgressState {
  processingEmailIds: Set<string>;
  queuedEmailIds: Set<string>;
  masterProgress: {
    fetchProgress: { processed: number; total: number } | null;
    insightsProgress: { processed: number; total: number } | null;
    profileProgress: { processed: number; total: number } | null;
    compileProgress: { processed: number; total: number } | null;
    isEndToEndProcess: boolean;
  };
}

interface BuildState {
  buildingProfile: boolean;
  compilingProfile: boolean;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const toast = useToast();
  const aiLimit = pLimit(20);
  const [fetchModalOpen, setFetchModalOpen] = useState(false);

  // Organized state using the interfaces
  const [emailState, setEmailState] = useState<EmailState>({
    emails: [],
    selectedEmailId: null,
    userInfo: null,
    error: null,
    fetching: false
  });

  const [insightState, setInsightState] = useState<InsightState>({
    insights: [],
    insightsByEmail: {},
    extracting: false,
    applyingToBio: false,
    insightError: null,
    bioError: null
  });

  const [progressState, setProgressState] = useState<ProgressState>({
    processingEmailIds: new Set(),
    queuedEmailIds: new Set(),
    masterProgress: {
      fetchProgress: null,
      insightsProgress: null,
      profileProgress: null,
      compileProgress: null,
      isEndToEndProcess: false
    }
  });

  const [buildState, setBuildState] = useState<BuildState>({
    buildingProfile: false,
    compilingProfile: false
  });

  // File management
  const {
    files,
    selectedFileItem,
    handleSaveFile,
    createOrUpdateFile,
    handleFileSelect,
    handleDeleteFile,
    clearAllFiles
  } = useFileManager();

  // Derived state
  const selectedEmail = emailState.selectedEmailId 
    ? emailState.emails.find(e => e.id === emailState.selectedEmailId) || null 
    : null;

  // Utility functions
  const getAuthTokens = () => {
    const authData = localStorage.getItem('ambient-agents-auth');
    if (!authData) throw new Error('Not authenticated');
    
    const { tokens: tokenString } = JSON.parse(authData);
    if (!tokenString) throw new Error('No tokens found');
    
    return typeof tokenString === 'string' ? JSON.parse(decodeURIComponent(tokenString)) : tokenString;
  };

  const showToast = (title: string, description: string, status: 'success' | 'error' | 'warning' = 'success') => {
    toast({ title, description, status, duration: 3000, isClosable: true });
  };

  const updateMasterProgress = (stage: keyof ProgressState['masterProgress'], progress: { processed: number; total: number } | null) => {
    setProgressState(prev => ({
      ...prev,
      masterProgress: { ...prev.masterProgress, [stage]: progress }
    }));
  };

  // Data loading effect
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        console.log('Loading stored data...');
        const [storedEmails, storedUserInfo, storedInsights] = await Promise.all([
          storageService.getEmails(),
          storageService.getUserInfo(),
          storageService.getInsights()
        ]);

        if (storedEmails.length > 0) {
          console.log(`Loaded ${storedEmails.length} emails from storage`);
          setEmailState(prev => ({ ...prev, emails: storedEmails }));
        }

        if (storedUserInfo) {
          console.log('Loaded user info from storage');
          setEmailState(prev => ({ ...prev, userInfo: storedUserInfo }));
        }

        if (Object.keys(storedInsights).length > 0) {
          console.log(`Loaded insights for ${Object.keys(storedInsights).length} emails from storage`);
          setInsightState(prev => ({ ...prev, insightsByEmail: storedInsights }));
        }
      } catch (error) {
        console.error('Error loading data from storage:', error);
        try {
          await storageService.clearAll();
        } catch (clearError) {
          console.error('Error clearing corrupted storage:', clearError);
        }
      }
    };

    loadStoredData();
  }, []);

  // Update current insights when selectedEmailId changes
  useEffect(() => {
    if (emailState.selectedEmailId && insightState.insightsByEmail[emailState.selectedEmailId]) {
      setInsightState(prev => ({ 
        ...prev, 
        insights: prev.insightsByEmail[emailState.selectedEmailId] || [] 
      }));
    } else {
      setInsightState(prev => ({ ...prev, insights: [] }));
    }
  }, [emailState.selectedEmailId, insightState.insightsByEmail]);

  // Email management functions
  const fetchEmails = async (sentCount: number, receivedCount: number) => {
    setEmailState(prev => ({ ...prev, fetching: true, error: null }));
    
    // Clear current emails and selected state when refetching
    setEmailState(prev => ({ 
      ...prev, 
      emails: [], 
      selectedEmailId: null 
    }));
    setInsightState(prev => ({ 
      ...prev, 
      insights: [], 
      insightsByEmail: {}, 
      insightError: null 
    }));
    setProgressState(prev => ({
      ...prev,
      processingEmailIds: new Set(),
      queuedEmailIds: new Set()
    }));

    try {
      const tokens = getAuthTokens();
      const response = await axios.post('http://localhost:3001/api/gmail/fetch-emails', {
        tokens,
        sessionId: 'default',
        sentCount,
        receivedCount
      });

      const newEmails = response.data.emails;
      setEmailState(prev => ({
        ...prev,
        emails: newEmails,
        userInfo: response.data.userInfo
      }));

      // Store emails in IndexedDB and clear insights
      console.log(`Storing ${newEmails.length} emails in IndexedDB...`);
      await Promise.all([
        storageService.setEmails(newEmails),
        storageService.setUserInfo(response.data.userInfo),
        storageService.setInsights({})
      ]);

      return { emails: newEmails, userInfo: response.data.userInfo };
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmailState(prev => ({ ...prev, error: 'Failed to fetch emails. Please try again.' }));
      showToast('Error', 'Failed to fetch emails. Please try again.', 'error');
      throw error;
    } finally {
      setEmailState(prev => ({ ...prev, fetching: false }));
    }
  };

  const extractInsights = async () => {
    if (!emailState.selectedEmailId || !selectedEmail) return;

    setInsightState(prev => ({ ...prev, extracting: true, insightError: null }));

    // Clear previous insights when reextracting
    if (insightState.insightsByEmail[emailState.selectedEmailId]) {
      setInsightState(prev => ({ ...prev, insights: [] }));
      const clearedInsights = { ...insightState.insightsByEmail };
      delete clearedInsights[emailState.selectedEmailId];
      setInsightState(prev => ({ ...prev, insightsByEmail: clearedInsights }));
      await storageService.setInsights(clearedInsights);
    }

    try {
      const tokens = getAuthTokens();
      const response = await axios.post('http://localhost:3001/api/gmail/extract-insights', {
        tokens,
        emailId: emailState.selectedEmailId,
        emailData: selectedEmail,
        sessionId: 'default'
      });

      const newInsights = response.data.insights;
      const updatedInsightsByEmail = {
        ...insightState.insightsByEmail,
        [emailState.selectedEmailId]: newInsights
      };

      setInsightState(prev => ({
        ...prev,
        insightsByEmail: updatedInsightsByEmail,
        insights: newInsights
      }));

      await storageService.setInsights(updatedInsightsByEmail);
    } catch (error) {
      console.error('Error extracting insights:', error);
      setInsightState(prev => ({ 
        ...prev, 
        insightError: 'Failed to extract insights. Please try again.' 
      }));
      showToast('Error', 'Failed to extract insights. Please try again.', 'error');
    } finally {
      setInsightState(prev => ({ ...prev, extracting: false }));
    }
  };

  // Profile building functions
  const processEmailsForInsights = async (emailsToProcess: Email[], tokens: any) => {
    let processedCount = 0;
    let currentErrorCount = 0;

    const extractPromises = emailsToProcess.map((email, index) =>
      aiLimit(async () => {
        // Update processing state
        setProgressState(prev => ({
          ...prev,
          queuedEmailIds: new Set([...prev.queuedEmailIds].filter(id => id !== email.id)),
          processingEmailIds: new Set([...prev.processingEmailIds, email.id])
        }));

        try {
          console.log(`Processing email ${index + 1}/${emailsToProcess.length}: ${email.subject.substring(0, 50)}...`);

          const response = await axios.post('http://localhost:3001/api/gmail/extract-insights', {
            tokens,
            emailId: email.id,
            emailData: email,
            sessionId: 'default'
          });

          const insights = response.data.insights || [];

          // Update insights immediately for this email
          setInsightState(prev => {
            const updated = { ...prev.insightsByEmail, [email.id]: insights };
            // Store in IndexedDB asynchronously
            storageService.setInsights(updated).catch((error: any) =>
              console.error('Failed to store insights:', error)
            );
            return { ...prev, insightsByEmail: updated };
          });

          return { emailId: email.id, insights };
        } catch (error: any) {
          const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
          console.error(`❌ Failed to extract insights from email "${email.subject}":`, errorMsg);
          currentErrorCount++;
          return { emailId: email.id, insights: [] };
        } finally {
          // Update processing state
          setProgressState(prev => ({
            ...prev,
            processingEmailIds: new Set([...prev.processingEmailIds].filter(id => id !== email.id))
          }));

          processedCount++;
          updateMasterProgress('insightsProgress', { processed: processedCount, total: emailsToProcess.length });
        }
      })
    );

    return Promise.all(extractPromises);
  };

  const applyInsightsToProfile = async (insightsByCategory: Record<string, any[]>, tokens: any, userInfo: any) => {
    const categoryCount = Object.keys(insightsByCategory).length;
    let profileProcessedCount = 0;
    let profileErrorCount = 0;
    const generatedProfileFiles: Record<string, string> = {};

    updateMasterProgress('profileProgress', { processed: 0, total: categoryCount });

    const applyPromises = Object.entries(insightsByCategory).map(async ([category, categoryInsights]) => {
      const fileName = `${category}.md`;
      const existingFile = files[fileName];

      try {
        const response = await axios.post('http://localhost:3001/api/ai/blend-profile', {
          tokens,
          category,
          newInsights: categoryInsights,
          existingContent: existingFile?.content || null,
          userInfo,
          sessionId: 'default'
        });

        const blendedContent = response.data.content;
        createOrUpdateFile(fileName, blendedContent);
        generatedProfileFiles[fileName] = blendedContent;

        return { category, success: true };
      } catch (error) {
        console.error(`Error applying insights to ${category}:`, error);
        profileErrorCount++;
        return { category, success: false };
      } finally {
        profileProcessedCount++;
        updateMasterProgress('profileProgress', { processed: profileProcessedCount, total: categoryCount });
      }
    });

    const results = await Promise.all(applyPromises);
    return { results, generatedProfileFiles, profileErrorCount };
  };

  const compileProfileFiles = async (profileFiles: Record<string, string>, tokens: any, userInfo: any) => {
    updateMasterProgress('compileProgress', { processed: 0, total: 2 });

    try {
      console.log(`🔧 Starting compilation with ${Object.keys(profileFiles).length} profile files:`, Object.keys(profileFiles));

      if (Object.keys(profileFiles).length > 0) {
        const [compileResponse, automationResponse] = await Promise.all([
          axios.post('http://localhost:3001/api/ai/compile-profile', {
            tokens,
            profileFiles,
            userInfo,
            sessionId: 'default'
          }),
          axios.post('http://localhost:3001/api/ai/analyze-automation', {
            tokens,
            profileFiles,
            userInfo,
            sessionId: 'default'
          })
        ]);

        createOrUpdateFile('full.md', compileResponse.data.content);
        createOrUpdateFile('automation.md', automationResponse.data.content);
        updateMasterProgress('compileProgress', { processed: 2, total: 2 });

        console.log(`✅ Profile compilation complete! Generated ${Object.keys(profileFiles).length} category files plus full.md and automation.md`);
      }
    } catch (error) {
      console.error('Error during auto-compilation:', error);
    }
  };

  const buildProfile = async (emailsToProcess?: Email[], userInfoToUse?: any) => {
    const currentEmails = emailsToProcess || emailState.emails;
    const currentUserInfo = userInfoToUse || emailState.userInfo;

    if (currentEmails.length === 0) {
      showToast('No emails available', 'Please fetch emails first.', 'warning');
      return;
    }

    setBuildState(prev => ({ ...prev, buildingProfile: true }));
    console.log(`🚀 Starting profile building with ${currentEmails.length} emails.`);

    // Clear insights when building profile
    setInsightState(prev => ({ ...prev, insightsByEmail: {} }));
    await storageService.setInsights({});

    // Set up progress tracking
    updateMasterProgress('insightsProgress', { processed: 0, total: currentEmails.length });

    try {
      const tokens = getAuthTokens();

      // Step 1: Extract insights from all emails
      const extractResults = await processEmailsForInsights(currentEmails, tokens);
      const successfulEmails = extractResults.filter((r: any) => r.insights.length > 0).length;

      // Step 2: Aggregate insights by category
      const allInsights: any[] = [];
      extractResults.forEach(({ insights }: any) => {
        allInsights.push(...insights);
      });

      const insightsByCategory: Record<string, any[]> = {};
      allInsights.forEach(insight => {
        insight.categories.forEach((category: string) => {
          if (!insightsByCategory[category]) {
            insightsByCategory[category] = [];
          }
          insightsByCategory[category].push(insight);
        });
      });

      // Step 3: Apply insights to profile files
      const { results, generatedProfileFiles, profileErrorCount } = await applyInsightsToProfile(
        insightsByCategory, 
        tokens, 
        currentUserInfo
      );
      
      const successfulCategories = results.filter((r: any) => r.success).length;
      const totalCategories = results.length;

      // Step 4: Auto-compile profile files
      if (successfulCategories > 0) {
        await compileProfileFiles(generatedProfileFiles, tokens, currentUserInfo);
      }

      // Show final results
      const hasErrors = profileErrorCount > 0;
      setTimeout(() => {
        setProgressState(prev => ({
          ...prev,
          masterProgress: {
            fetchProgress: null,
            insightsProgress: null,
            profileProgress: null,
            compileProgress: null,
            isEndToEndProcess: false
          }
        }));
      }, 3000);

      showToast(
        'Profile Building Complete',
        `Generated ${totalCategories} profile files from ${successfulEmails}/${currentEmails.length} emails`,
        hasErrors ? 'warning' : 'success'
      );

    } catch (error) {
      console.error('❌ Profile building failed:', error);
      showToast('Profile Building Failed', 'An error occurred while building the profile.', 'error');
    } finally {
      setBuildState(prev => ({ ...prev, buildingProfile: false }));
    }
  };

  // Event handlers
  const handleFetchEmails = async (options: {
    buildProfile: boolean;
    sentCount: number;
    receivedCount: number;
    deleteProfileFiles: boolean;
  }) => {
    setFetchModalOpen(false);

    if (options.buildProfile) {
      setProgressState(prev => ({
        ...prev,
        masterProgress: { ...prev.masterProgress, isEndToEndProcess: true }
      }));
    }

    if (options.deleteProfileFiles) {
      clearAllFiles();
    }

    try {
      const result = await fetchEmails(options.sentCount, options.receivedCount);
      
      if (options.buildProfile && result && result.emails.length > 0) {
        updateMasterProgress('fetchProgress', { processed: 1, total: 1 });
        await buildProfile(result.emails, result.userInfo);
      }
    } catch (error) {
      if (!options.buildProfile) {
        updateMasterProgress('fetchProgress', null);
      }
    }
  };

  const handleApplyToBio = async () => {
    if (insightState.insights.length === 0 || !emailState.userInfo) return;

    setInsightState(prev => ({ ...prev, applyingToBio: true, bioError: null }));

    try {
      const insightsByCategory: Record<string, any[]> = {};
      insightState.insights.forEach(insight => {
        insight.categories.forEach((category: string) => {
          if (!insightsByCategory[category]) {
            insightsByCategory[category] = [];
          }
          insightsByCategory[category].push(insight);
        });
      });

      const tokens = getAuthTokens();

      for (const [category, categoryInsights] of Object.entries(insightsByCategory)) {
        const fileName = `${category}.md`;
        const existingFile = files[fileName];

        const response = await axios.post('http://localhost:3001/api/ai/blend-profile', {
          tokens,
          category,
          newInsights: categoryInsights,
          existingContent: existingFile?.content || null,
          userInfo: emailState.userInfo,
          sessionId: 'default'
        });

        createOrUpdateFile(fileName, response.data.content);
      }
    } catch (error) {
      console.error('Error applying to bio:', error);
      setInsightState(prev => ({ 
        ...prev, 
        bioError: 'Failed to apply insights to bio. Please try again.' 
      }));
      showToast('Error', 'Failed to apply insights to bio. Please try again.', 'error');
    } finally {
      setInsightState(prev => ({ ...prev, applyingToBio: false }));
    }
  };

  const handleCompileProfile = async () => {
    setBuildState(prev => ({ ...prev, compilingProfile: true }));

    try {
      const tokens = getAuthTokens();
      const profileFiles = Object.entries(files)
        .filter(([fileName]) => !['full.md', 'automation.md'].includes(fileName))
        .reduce((acc, [fileName, file]) => {
          acc[fileName] = (file as any).content;
          return acc;
        }, {} as Record<string, string>);

      if (Object.keys(profileFiles).length === 0) {
        showToast('No Profile Files', 'You need to create some profile files first.', 'warning');
        return;
      }

      await compileProfileFiles(profileFiles, tokens, emailState.userInfo);
    } catch (error) {
      console.error('Error compiling profile:', error);
      showToast('Error', 'Failed to compile profile. Please try again.', 'error');
    } finally {
      setBuildState(prev => ({ ...prev, compilingProfile: false }));
    }
  };

  const handleCloseEmail = () => {
    setEmailState(prev => ({ ...prev, selectedEmailId: null }));
    setInsightState(prev => ({ 
      ...prev, 
      insights: [], 
      insightError: null, 
      extracting: false 
    }));
  };

  const handleDeleteAllFiles = () => {
    if (window.confirm('Are you sure you want to delete all profile files? This action cannot be undone.')) {
      clearAllFiles();
      showToast('Files Deleted', 'All profile files have been deleted.');
    }
  };

  const handleDeleteAllData = async () => {
    if (window.confirm('Are you sure you want to delete all bio and email data? This action cannot be undone.')) {
      try {
        await storageService.clearAll();
        storageService.removeItem('ambient-agents-files');

        setEmailState({
          emails: [],
          selectedEmailId: null,
          userInfo: null,
          error: null,
          fetching: false
        });

        setInsightState({
          insights: [],
          insightsByEmail: {},
          extracting: false,
          applyingToBio: false,
          insightError: null,
          bioError: null
        });

        clearAllFiles();
        showToast('All Data Deleted', 'All emails, insights, and profile files have been deleted.');
      } catch (error) {
        console.error('Error clearing data:', error);
        showToast('Error', 'Failed to clear all data. Please try again.', 'error');
      }
    }
  };

  const isLoading = emailState.fetching || buildState.buildingProfile;

  return (
    <Box h="100vh" bg="gray.50">
      <PusherReceiver 
        sessionId="default"
        onMasterProgressUpdate={(stage: any, progress: any) => {
          setProgressState(prev => ({
            ...prev,
            masterProgress: { ...prev.masterProgress, [stage]: progress }
          }));
        }}
      />
      
      <Toolbar 
        onLogout={onLogout}
        onDeleteAllData={handleDeleteAllData}
      />

      <FetchEmailsModal
        isOpen={fetchModalOpen}
        onClose={() => setFetchModalOpen(false)}
        onFetchEmails={handleFetchEmails}
        isLoading={isLoading}
        hasExistingEmails={emailState.emails.length > 0}
        hasExistingProfileFiles={Object.keys(files).length > 0}
      />
      
      <Flex h="calc(100vh - 60px)" w="100%">
        <Box w="20%" h="100%">
          <EmailList
            emails={emailState.emails}
            selectedEmailId={emailState.selectedEmailId}
            onEmailSelect={(id) => setEmailState(prev => ({ ...prev, selectedEmailId: id }))}
            onOpenFetchModal={() => setFetchModalOpen(true)}
            isLoading={isLoading}
            processingEmailIds={progressState.processingEmailIds}
            queuedEmailIds={progressState.queuedEmailIds}
            error={emailState.error}
            insightsByEmail={insightState.insightsByEmail}
          />
        </Box>
        
        {selectedEmail ? (
          <Box w="20%" h="100%">
            <EmailViewer
              email={selectedEmail}
              onExtractInsights={extractInsights}
              isLoading={insightState.extracting}
              error={null}
              onClose={handleCloseEmail}
              showCloseButton={!(insightState.insights.length > 0 || insightState.extracting || insightState.insightError)}
              hasInsights={emailState.selectedEmailId ? !!insightState.insightsByEmail[emailState.selectedEmailId] : false}
            />
          </Box>
        ) : (
          <Box w="20%" h="100%" bg="gray.100" borderRight="1px solid" borderColor="gray.200" />
        )}
        
        {selectedEmail && (insightState.insights.length > 0 || insightState.extracting || insightState.insightError || (emailState.selectedEmailId && emailState.selectedEmailId in insightState.insightsByEmail)) ? (
          <Box w="20%" h="100%">
            <InsightsViewer
              insights={insightState.insights}
              onApplyToBio={handleApplyToBio}
              isLoading={insightState.applyingToBio}
              isExtracting={insightState.extracting}
              error={insightState.bioError || insightState.insightError}
              onClose={handleCloseEmail}
              hasAttemptedExtraction={emailState.selectedEmailId ? emailState.selectedEmailId in insightState.insightsByEmail : false}
            />
          </Box>
        ) : (
          <Box w="20%" h="100%" bg="gray.100" borderRight="1px solid" borderColor="gray.200" />
        )}
        
        <Box w={Object.keys(files).length === 0 ? "40%" : "13.33%"} h="100%">
          <FileList
            files={files}
            selectedFile={selectedFileItem}
            onFileSelect={handleFileSelect}
            onDeleteFile={handleDeleteFile}
            onDeleteAll={handleDeleteAllFiles}
            onCompileProfile={handleCompileProfile}
            isCompiling={buildState.compilingProfile}
          />
        </Box>
        
        {Object.keys(files).length > 0 && (
          <Box w="26.67%" h="100%">
            <FileEditor
              file={selectedFileItem}
              onSave={handleSaveFile}
            />
          </Box>
        )}
      </Flex>

      <MasterProgressBar
        fetchProgress={progressState.masterProgress.fetchProgress}
        insightsProgress={progressState.masterProgress.insightsProgress}
        profileProgress={progressState.masterProgress.profileProgress}
        compileProgress={progressState.masterProgress.compileProgress}
        isVisible={progressState.masterProgress.isEndToEndProcess}
      />
    </Box>
  );
}