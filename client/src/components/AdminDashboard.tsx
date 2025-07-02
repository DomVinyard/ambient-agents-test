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

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsByEmail, setInsightsByEmail] = useState<Record<string, Insight[]>>({});
  const [userInfo, setUserInfo] = useState<{ email: string; firstName: string; lastName: string } | null>(null);
  
  // Rate limiter for AI requests - limit to 10 concurrent AI calls
  const aiLimit = pLimit(20);
  
  // Loading states
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [extractingInsights, setExtractingInsights] = useState(false);
  const [applyingToBio, setApplyingToBio] = useState(false);
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [processingEmailIds, setProcessingEmailIds] = useState<Set<string>>(new Set());
  const [queuedEmailIds, setQueuedEmailIds] = useState<Set<string>>(new Set());

  
  // Modal states
  const [fetchModalOpen, setFetchModalOpen] = useState(false);
  
  // Error states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  
  // Compilation state
  const [compilingProfile, setCompilingProfile] = useState(false);

  // Master progress tracking for all 4 stages
  const [masterProgress, setMasterProgress] = useState({
    fetchProgress: null as { processed: number; total: number } | null,
    insightsProgress: null as { processed: number; total: number } | null,
    profileProgress: null as { processed: number; total: number } | null,
    compileProgress: null as { processed: number; total: number } | null,
    isEndToEndProcess: false
  });

  const toast = useToast();
  
  // Load emails and insights from storage on mount
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
          setEmails(storedEmails);
        }
        
        if (storedUserInfo) {
          console.log('Loaded user info from storage');
          setUserInfo(storedUserInfo);
        }
        
        if (Object.keys(storedInsights).length > 0) {
          console.log(`Loaded insights for ${Object.keys(storedInsights).length} emails from storage`);
          setInsightsByEmail(storedInsights);
        }
      } catch (error) {
        console.error('Error loading data from storage:', error);
        // Clear corrupted data
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
    if (selectedEmailId && insightsByEmail[selectedEmailId]) {
      setInsights(insightsByEmail[selectedEmailId]);
    } else {
      setInsights([]);
    }
  }, [selectedEmailId, insightsByEmail]);
  
  // File management for bio
  const {
    files,
    selectedFileItem,
    handleSaveFile,
    createOrUpdateFile,
    handleFileSelect,
    handleDeleteFile,
    clearAllFiles
  } = useFileManager();

  // No need for specific bio file - using category-based files now

  const selectedEmail = selectedEmailId ? emails.find(e => e.id === selectedEmailId) || null : null;

  const getAuthTokens = () => {
    const authData = localStorage.getItem('ambient-agents-auth');
    if (!authData) {
      throw new Error('Not authenticated');
    }
    
    const { tokens: tokenString } = JSON.parse(authData);
    if (!tokenString) {
      throw new Error('No tokens found');
    }
    
    return typeof tokenString === 'string' ? JSON.parse(decodeURIComponent(tokenString)) : tokenString;
  };

  const handleFetchEmails = async (options: {
    buildProfile: boolean;
    sentCount: number;
    receivedCount: number;
    deleteProfileFiles: boolean;
  }) => {
    setFetchingEmails(true);
    setEmailError(null);
    setFetchModalOpen(false);

    // Start master progress tracking if this is an end-to-end build
    if (options.buildProfile) {
      setMasterProgress(prev => ({ ...prev, isEndToEndProcess: true }));
    }
    
    // Delete profile files if requested
    if (options.deleteProfileFiles) {
      clearAllFiles();
    }
    
    // Clear current emails and selected state when refetching
    setEmails([]);
    setSelectedEmailId(null);
    setInsights([]);
    setInsightsByEmail({});
    setInsightError(null);
    setProcessingEmailIds(new Set());
    setQueuedEmailIds(new Set());
    
    // Clear insights from localStorage
    localStorage.removeItem('ambient-agents-insights');
    
    try {
      const tokens = getAuthTokens();
      
      const response = await axios.post('http://localhost:3001/api/gmail/fetch-emails', {
        tokens,
        sessionId: 'default',
        sentCount: options.sentCount,
        receivedCount: options.receivedCount
      });

      const newEmails = response.data.emails;
      setEmails(newEmails);
      setUserInfo(response.data.userInfo);
      
      // Clear existing insights when fetching new emails
      setInsightsByEmail({});
      
      // Store emails in IndexedDB and clear insights
      console.log(`Storing ${newEmails.length} emails in IndexedDB...`);
      await Promise.all([
        storageService.setEmails(newEmails),
        storageService.setUserInfo(response.data.userInfo),
        storageService.setInsights({}) // Clear insights
      ]);
      


      // If buildProfile is enabled, automatically build profile after fetching
      if (options.buildProfile && newEmails.length > 0) {
        await handleBuildProfile(newEmails, response.data.userInfo);
      }
      
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmailError('Failed to fetch emails. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to fetch emails. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setFetchingEmails(false);
      
      // Clear master progress if there was an error and not continuing with build
      if (!options.buildProfile) {
        setMasterProgress(prev => ({
          ...prev,
          isEndToEndProcess: false,
          fetchProgress: null
        }));
      }
    }
  };

  const handleExtractInsights = async () => {
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
      
      const response = await axios.post('http://localhost:3001/api/gmail/extract-insights', {
        tokens,
        emailId: selectedEmailId,
        emailData: selectedEmail,
        sessionId: 'default'
      });

      const newInsights = response.data.insights;
      
      // Update insights for this specific email
      const updatedInsightsByEmail = {
        ...insightsByEmail,
        [selectedEmailId]: newInsights
      };
      setInsightsByEmail(updatedInsightsByEmail);
      setInsights(newInsights);
      
      // Store insights in IndexedDB
      await storageService.setInsights(updatedInsightsByEmail);
      

      
    } catch (error) {
      console.error('Error extracting insights:', error);
      setInsightError('Failed to extract insights. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to extract insights. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setExtractingInsights(false);
    }
  };

  const handleBuildProfile = async (emailsToProcess?: any[], userInfoToUse?: any) => {
    const currentEmails = emailsToProcess || emails;
    const currentUserInfo = userInfoToUse || userInfo;
    
    if (currentEmails.length === 0) {
      toast({
        title: 'No emails available',
        description: 'Please fetch emails first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    console.log(`🚀 Starting profile building with ${currentEmails.length} emails. Auto-clearing existing insights.`);
    
    // Always clear insights when building profile to ensure fresh start
    setInsightsByEmail({});
    await storageService.setInsights({});

    // Update master progress for insights stage (and mark fetch as complete if coming from end-to-end)
    setMasterProgress(prev => ({
      ...prev,
      fetchProgress: prev.isEndToEndProcess ? { processed: 1, total: 1 } : prev.fetchProgress, // Mark fetch complete
      insightsProgress: { processed: 0, total: currentEmails.length }
    }));
    
    try {
      const tokens = getAuthTokens();
      
      // Step 1: Extract insights from all emails with rate limiting
      console.log(`Starting to process ${currentEmails.length} emails with AI rate limiting (max 10 concurrent)`);
      
      let processedCount = 0;
      let currentErrorCount = 0;
      
      const extractPromises = currentEmails.slice().map((email, index) => 
        aiLimit(async () => {
          // Move email from queued to processing
          setQueuedEmailIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(email.id);
            return newSet;
          });
          setProcessingEmailIds(prev => new Set([...prev, email.id]));
          
          try {
            console.log(`Processing email ${index + 1}/${currentEmails.length}: ${email.subject.substring(0, 50)}...`);
            
            const response = await axios.post('http://localhost:3001/api/gmail/extract-insights', {
              tokens,
              emailId: email.id,
              emailData: email,
              sessionId: 'default'
            });
          
          const insights = response.data.insights || [];
          
          // Update insights immediately for this email
          setInsightsByEmail(prev => {
            const updated = {
              ...prev,
              [email.id]: insights
            };
            // Store in IndexedDB asynchronously (don't block)
            storageService.setInsights(updated).catch(error => 
              console.error('Failed to store insights:', error)
            );
            return updated;
          });
          
          return {
            emailId: email.id,
            insights
          };
        } catch (error: any) {
          const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
          console.error(`❌ Failed to extract insights from email "${email.subject}":`, errorMsg);
          
          currentErrorCount++;
          
          return {
            emailId: email.id,
            insights: []
          };
        } finally {
          setProcessingEmailIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(email.id);
            return newSet;
          });
          
          // Update progress in real-time
          processedCount++;
          
          // Update master progress for insights
          setMasterProgress(prev => ({
            ...prev,
            insightsProgress: { processed: processedCount, total: currentEmails.length }
          }));
        }
      })
    );
      
      const extractResults = await Promise.all(extractPromises);
      
      // Count successes (errors already tracked in real-time)
      const successfulEmails = extractResults.filter(r => r.insights.length > 0).length;
      
      // Step 2: Aggregate all insights and group by category
      const allInsights: any[] = [];
      
      extractResults.forEach(({ insights }) => {
        allInsights.push(...insights);
      });
      
      // Group insights by category (handling multiple categories per insight)
      const insightsByCategory: Record<string, any[]> = {};
      
      allInsights.forEach(insight => {
        insight.categories.forEach((category: string) => {
          if (!insightsByCategory[category]) {
            insightsByCategory[category] = [];
          }
          insightsByCategory[category].push(insight);
        });
      });
      
      // Step 3: Apply insights to profile files with progress tracking
      const categoryCount = Object.keys(insightsByCategory).length;

      // Update master progress for profile generation stage (and mark insights as complete)
      setMasterProgress(prev => ({
        ...prev,
        insightsProgress: { processed: currentEmails.length, total: currentEmails.length }, // Mark complete
        profileProgress: { processed: 0, total: categoryCount }
      }));
      
      let profileProcessedCount = 0;
      let profileErrorCount = 0;
      const generatedProfileFiles: Record<string, string> = {};
      
      const applyPromises = Object.entries(insightsByCategory).map(async ([category, categoryInsights]: [string, any[]]) => {
        const fileName = `${category}.md`;
        const existingFile = files[fileName];
        
        try {
          const response = await axios.post('http://localhost:3001/api/ai/blend-profile', {
            tokens,
            category,
            newInsights: categoryInsights,
            existingContent: existingFile?.content || null,
            userInfo: currentUserInfo,
            sessionId: 'default'
          });
          
          const blendedContent = response.data.content;
          createOrUpdateFile(fileName, blendedContent);
          
          // Store for compilation step
          generatedProfileFiles[fileName] = blendedContent;
          
          return { category, success: true };
        } catch (error) {
          console.error(`Error applying insights to ${category}:`, error);
          profileErrorCount++;
          return { category, success: false };
        } finally {
          profileProcessedCount++;
          
          // Update master progress for profile generation
          setMasterProgress(prev => ({
            ...prev,
            profileProgress: { processed: profileProcessedCount, total: categoryCount }
          }));
        }
      });
      
      const applyResults = await Promise.all(applyPromises);
      const successfulCategories = applyResults.filter(r => r.success).length;
      const totalCategories = applyResults.length;
      
      // Step 4: Auto-compile profile files
      console.log(`📊 Profile generation complete. ${successfulCategories}/${totalCategories} categories successful. Starting compilation...`);
      if (successfulCategories > 0) {

        // Update master progress for compilation stage (and mark profile generation as complete)
        setMasterProgress(prev => ({
          ...prev,
          profileProgress: { processed: categoryCount, total: categoryCount }, // Mark complete
          compileProgress: { processed: 0, total: 2 }
        }));
        
        try {
          // Use the generated profile files from this run
          const profileFiles = generatedProfileFiles;
          console.log(`🔧 Starting compilation with ${Object.keys(profileFiles).length} profile files:`, Object.keys(profileFiles));
          
          if (Object.keys(profileFiles).length > 0) {
            // Run both compilation tasks in parallel
            const [compileResponse, automationResponse] = await Promise.all([
              axios.post('http://localhost:3001/api/ai/compile-profile', {
                tokens,
                profileFiles,
                userInfo: currentUserInfo,
                sessionId: 'default'
              }),
              axios.post('http://localhost:3001/api/ai/analyze-automation', {
                tokens,
                profileFiles,
                userInfo: currentUserInfo,
                sessionId: 'default'
              })
            ]);
            
            const compiledContent = compileResponse.data.content;
            const automationContent = automationResponse.data.content;
            
            // Create both files
            createOrUpdateFile('full.md', compiledContent);
            createOrUpdateFile('automation.md', automationContent);
            
            // Update master progress for compilation completion
            setMasterProgress(prev => ({
              ...prev,
              compileProgress: { processed: 2, total: 2 }
            }));
            
            console.log(`✅ Profile compilation complete! Generated ${Object.keys(profileFiles).length} category files plus full.md and automation.md`);
          }
        } catch (error) {
          console.error('Error during auto-compilation:', error);
        }
      }
      
      // Calculate and show final results
      const resultStatus = (currentErrorCount + profileErrorCount) > 0 ? 'warning' : 'success';
      
      // Clear master progress after a delay
      setTimeout(() => {
        setMasterProgress(prev => ({
          ...prev,
          isEndToEndProcess: false,
          fetchProgress: null,
          insightsProgress: null,
          profileProgress: null,
          compileProgress: null
        }));
      }, 3000);
      
      toast({
        title: 'Profile Building Complete',
        description: `Generated ${totalCategories} profile files from ${successfulEmails}/${currentEmails.length} emails`,
        status: resultStatus,
        duration: 5000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('❌ Profile building failed:', error);
      toast({
        title: 'Profile Building Failed',
        description: 'An error occurred while building the profile.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setBuildingProfile(false);
    }
  };

  const handleApplyToBio = async () => {
    if (insights.length === 0 || !userInfo) return;
    
    setApplyingToBio(true);
    setBioError(null);
    
    try {
      // Group insights by category - now handling multiple categories per insight
      const insightsByCategory: Record<string, any[]> = {};
      
      insights.forEach(insight => {
        // Each insight can belong to multiple categories
        insight.categories.forEach(category => {
          if (!insightsByCategory[category]) {
            insightsByCategory[category] = [];
          }
          insightsByCategory[category].push(insight);
        });
      });

      const tokens = getAuthTokens();
      
      // Process each category with AI blending
      for (const [category, categoryInsights] of Object.entries(insightsByCategory)) {
        const fileName = `${category}.md`;
        const existingFile = files[fileName];
        
        // Send to AI service for intelligent blending
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
      }
      

      
    } catch (error) {
      console.error('Error applying to bio:', error);
      setBioError('Failed to apply insights to bio. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to apply insights to bio. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setApplyingToBio(false);
    }
  };

  const handleCloseEmail = () => {
    setSelectedEmailId(null);
    setInsights([]);
    setInsightError(null);
    setExtractingInsights(false);
  };

  const handleDeleteAllFiles = () => {
    if (window.confirm('Are you sure you want to delete all profile files? This action cannot be undone.')) {
      clearAllFiles();
      toast({
        title: 'Files Deleted',
        description: 'All profile files have been deleted.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCompileProfile = async () => {
    setCompilingProfile(true);
    
    try {
      const tokens = getAuthTokens();
      
      // Get all profile files except compiled ones ('full.md', 'automation.md')
      const profileFiles = Object.entries(files)
        .filter(([fileName]) => !['full.md', 'automation.md'].includes(fileName))
        .reduce((acc, [fileName, file]) => {
          acc[fileName] = file.content;
          return acc;
        }, {} as Record<string, string>);
      
      if (Object.keys(profileFiles).length === 0) {
        toast({
          title: 'No Profile Files',
          description: 'You need to create some profile files first.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Run both compilation tasks in parallel
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
      
      const compiledContent = compileResponse.data.content;
      const automationContent = automationResponse.data.content;
      
      // Create both files
      createOrUpdateFile('full.md', compiledContent);
      createOrUpdateFile('automation.md', automationContent);
      

      
    } catch (error) {
      console.error('Error compiling profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to compile profile. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setCompilingProfile(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (window.confirm('Are you sure you want to delete all bio and email data? This action cannot be undone.')) {
      try {
        // Clear IndexedDB
        await storageService.clearAll();
        
        // Clear localStorage (for files)
        storageService.removeItem('ambient-agents-files');
        
        // Reset all state
        setEmails([]);
        setSelectedEmailId(null);
        setInsights([]);
        setInsightsByEmail({});
        setUserInfo(null);
        setEmailError(null);
        setInsightError(null);
        setBioError(null);
        
        // Clear all profile files
        clearAllFiles();
        
        toast({
          title: 'All Data Deleted',
          description: 'All emails, insights, and profile files have been deleted.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error clearing data:', error);
        toast({
          title: 'Error',
          description: 'Failed to clear all data. Please try again.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };



  return (
    <Box h="100vh" bg="gray.50">
      <PusherReceiver 
        sessionId="default"
        onMasterProgressUpdate={(stage, progress) => {
          setMasterProgress(prev => ({
            ...prev,
            [stage]: progress
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
        isLoading={fetchingEmails || buildingProfile}
        hasExistingEmails={emails.length > 0}
        hasExistingProfileFiles={Object.keys(files).length > 0}
      />
      
      <Flex h="calc(100vh - 60px)" w="100%">
        <Box w="20%" h="100%">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={setSelectedEmailId}
            onOpenFetchModal={() => setFetchModalOpen(true)}
            isLoading={fetchingEmails || buildingProfile}
            processingEmailIds={processingEmailIds}
            queuedEmailIds={queuedEmailIds}
            error={emailError}
            insightsByEmail={insightsByEmail}
          />
        </Box>
        
        {selectedEmail ? (
          <Box w="20%" h="100%">
            <EmailViewer
              email={selectedEmail}
              onExtractInsights={handleExtractInsights}
              isLoading={extractingInsights}
              error={null}
              onClose={handleCloseEmail}
              showCloseButton={!(insights.length > 0 || extractingInsights || insightError)}
              hasInsights={selectedEmailId ? !!insightsByEmail[selectedEmailId] : false}
            />
          </Box>
        ) : (
          <Box w="20%" h="100%" bg="gray.100" borderRight="1px solid" borderColor="gray.200" />
        )}
        
        {selectedEmail && (insights.length > 0 || extractingInsights || insightError || (selectedEmailId && selectedEmailId in insightsByEmail)) ? (
          <Box w="20%" h="100%">
            <InsightsViewer
              insights={insights}
              onApplyToBio={handleApplyToBio}
              isLoading={applyingToBio}
              isExtracting={extractingInsights}
              error={bioError || insightError}
              onClose={handleCloseEmail}
              hasAttemptedExtraction={selectedEmailId ? selectedEmailId in insightsByEmail : false}
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
            isCompiling={compilingProfile}
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
        fetchProgress={masterProgress.fetchProgress}
        insightsProgress={masterProgress.insightsProgress}
        profileProgress={masterProgress.profileProgress}
        compileProgress={masterProgress.compileProgress}
        isVisible={masterProgress.isEndToEndProcess}
      />
    </Box>
  );
} 