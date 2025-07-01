import { 
  Box, 
  Flex, 
  useToast
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
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
  
  // Loading states
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [extractingInsights, setExtractingInsights] = useState(false);
  const [applyingToBio, setApplyingToBio] = useState(false);
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [processingEmailIds, setProcessingEmailIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [fetchModalOpen, setFetchModalOpen] = useState(false);
  
  // Error states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);

  const toast = useToast();
  
  // Load emails and insights from localStorage on mount
  useEffect(() => {
    try {
      const storedEmails = localStorage.getItem('ambient-agents-emails');
      const storedUserInfo = localStorage.getItem('ambient-agents-userinfo');
      const storedInsights = localStorage.getItem('ambient-agents-insights');
      
      if (storedEmails) {
        const emails = JSON.parse(storedEmails);
        setEmails(emails);
      }
      
      if (storedUserInfo) {
        const userInfo = JSON.parse(storedUserInfo);
        setUserInfo(userInfo);
      }
      
      if (storedInsights) {
        const insights = JSON.parse(storedInsights);
        setInsightsByEmail(insights);
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem('ambient-agents-emails');
      localStorage.removeItem('ambient-agents-userinfo');
      localStorage.removeItem('ambient-agents-insights');
    }
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
      
      // Store emails in localStorage
      localStorage.setItem('ambient-agents-emails', JSON.stringify(newEmails));
      localStorage.setItem('ambient-agents-userinfo', JSON.stringify(response.data.userInfo));
      
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
      
      // Store insights in localStorage
      localStorage.setItem('ambient-agents-insights', JSON.stringify(updatedInsightsByEmail));
      
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
    
    try {
      const tokens = getAuthTokens();
      
      // Step 1: Extract insights from all emails in parallel
      const extractPromises = emails.map(async (email) => {
        setProcessingEmailIds(prev => new Set([...prev, email.id]));
        
        try {
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
            localStorage.setItem('ambient-agents-insights', JSON.stringify(updated));
            return updated;
          });
          
          return {
            emailId: email.id,
            insights
          };
        } catch (error) {
          console.error(`Error extracting insights from email ${email.id}:`, error);
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
        }
      });
      
      const extractResults = await Promise.all(extractPromises);
      
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
      
      toast({
        title: 'Profile Built Successfully',
        description: `Processed ${allInsights.length} insights from ${emails.length} emails and updated ${successfulCategories}/${totalCategories} profile categories.`,
        status: 'success',
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

  const handleDeleteAllData = () => {
    if (window.confirm('Are you sure you want to delete all bio and email data? This action cannot be undone.')) {
      // Clear localStorage
      localStorage.removeItem('ambient-agents-emails');
      localStorage.removeItem('ambient-agents-userinfo');
      localStorage.removeItem('ambient-agents-files');
      localStorage.removeItem('ambient-agents-insights');
      
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
        title: 'Data Deleted',
        description: 'All bio, email data, and profile files have been cleared.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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