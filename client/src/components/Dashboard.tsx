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
import { useFileManager } from '../hooks/useFileManager';
import { Email, Insight } from '../types';
import { storageService } from '../services/storage.service';
import axios from 'axios';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [status, setStatus] = useState<string>('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsByEmail, setInsightsByEmail] = useState<Record<string, Insight[]>>({});
  const [userInfo, setUserInfo] = useState<{ email: string; firstName: string; lastName: string } | null>(null);
  
  // Rate limiter for AI requests - limit to 10 concurrent AI calls
  const aiLimit = pLimit(10);
  
  // Loading states
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [extractingInsights, setExtractingInsights] = useState(false);
  const [applyingToBio, setApplyingToBio] = useState(false);
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [processingEmailIds, setProcessingEmailIds] = useState<Set<string>>(new Set());
  const [profileProgress, setProfileProgress] = useState<{
    currentStep: string;
    processed: number;
    total: number;
    errors: number;
  } | null>(null);
  
  // Modal states
  const [fetchModalOpen, setFetchModalOpen] = useState(false);
  
  // Error states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);

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
      
      // Store emails in IndexedDB
      console.log(`Storing ${newEmails.length} emails in IndexedDB...`);
      await Promise.all([
        storageService.setEmails(newEmails),
        storageService.setUserInfo(response.data.userInfo)
      ]);
      
      toast({
        title: 'Emails Fetched',
        description: `Loaded ${newEmails.length} recent emails.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // If buildProfile is enabled, automatically build profile after fetching
      if (options.buildProfile && newEmails.length > 0) {
        await handleBuildProfile();
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
      localStorage.setItem('ambient-agents-insights', JSON.stringify(clearedInsights));
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
      
      toast({
        title: 'Insights Extracted',
        description: `Found ${newInsights.length} insights from this email.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
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

  const handleBuildProfile = async () => {
    if (emails.length === 0 || !userInfo) return;
    
    setBuildingProfile(true);
    setBioError(null);
    setProcessingEmailIds(new Set());
    setProfileProgress({
      currentStep: 'Extracting insights from emails',
      processed: 0,
      total: emails.length,
      errors: 0
    });
    
    try {
      const tokens = getAuthTokens();
      
      // Step 1: Extract insights from all emails with rate limiting
      console.log(`Starting to process ${emails.length} emails with AI rate limiting (max 10 concurrent)`);
      
      let processedCount = 0;
      let currentErrorCount = 0;
      
      const extractPromises = emails.map((email, index) => 
        aiLimit(async () => {
          setProcessingEmailIds(prev => new Set([...prev, email.id]));
          
          try {
            console.log(`Processing email ${index + 1}/${emails.length}: ${email.subject.substring(0, 50)}...`);
            
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
          
          // Show a toast for debugging if many errors
          if (index < 5) { // Only show first 5 errors to avoid spam
            toast({
              title: `Failed to process: ${email.subject.substring(0, 30)}...`,
              description: errorMsg,
              status: 'warning',
              duration: 2000,
              isClosable: true,
            });
          }
          
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
          setProfileProgress(prev => prev ? {
            ...prev,
            processed: processedCount,
            errors: currentErrorCount
          } : null);
        }
      })
    );
      
      const extractResults = await Promise.all(extractPromises);
      
      // Count successes (errors already tracked in real-time)
      const successfulEmails = extractResults.filter(r => r.insights.length > 0).length;
      
      setProfileProgress({
        currentStep: 'Aggregating insights by category',
        processed: emails.length,
        total: emails.length,
        errors: currentErrorCount
      });
      
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
      
      // Step 3: Apply insights to profile files in parallel
      const categoryCount = Object.keys(insightsByCategory).length;
      setProfileProgress({
        currentStep: 'Generating profile files',
        processed: 0,
        total: categoryCount,
        errors: currentErrorCount
      });
      
      const applyPromises = Object.entries(insightsByCategory).map(async ([category, categoryInsights]: [string, any[]]) => {
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
          
          return { category, success: true };
        } catch (error) {
          console.error(`Error applying insights to ${category}:`, error);
          return { category, success: false };
        }
      });
      
      const applyResults = await Promise.all(applyPromises);
      const successfulCategories = applyResults.filter(r => r.success).length;
      const totalCategories = applyResults.length;
      
      const resultStatus = currentErrorCount > 0 ? 'warning' : 'success';
      const resultTitle = currentErrorCount > 0 ? 'Profile Built with Some Errors' : 'Profile Built Successfully';
      
      toast({
        title: resultTitle,
        description: `Processed ${allInsights.length} insights from ${successfulEmails}/${emails.length} emails${currentErrorCount > 0 ? ` (${currentErrorCount} failed)` : ''} and updated ${successfulCategories}/${totalCategories} profile categories.`,
        status: resultStatus,
        duration: 5000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Error building profile:', error);
      setBioError('Failed to build profile. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to build profile. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setBuildingProfile(false);
      setProcessingEmailIds(new Set());
      setProfileProgress(null);
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
      
      toast({
        title: 'Applied to Bio',
        description: `Intelligently updated ${Object.keys(insightsByCategory).length} category file(s) using AI. Some insights were applied to multiple categories.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
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
        onStatusUpdate={setStatus}
      />
      
      <Toolbar 
        onLogout={onLogout}
        onDeleteAllData={handleDeleteAllData}
        status={status}
        profileProgress={profileProgress}
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
        
        <Box w={Object.keys(files).length === 0 ? "40%" : "20%"} h="100%">
          <FileList
            files={files}
            selectedFile={selectedFileItem}
            onFileSelect={handleFileSelect}
            onDeleteFile={handleDeleteFile}
            onDeleteAll={handleDeleteAllFiles}
          />
        </Box>
        
        {Object.keys(files).length > 0 && (
          <Box w="20%" h="100%">
            <FileEditor
              file={selectedFileItem}
              onSave={handleSaveFile}
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
} 