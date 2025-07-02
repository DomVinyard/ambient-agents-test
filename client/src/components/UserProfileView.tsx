import { useToast } from '@chakra-ui/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { profileService } from '../services/profile.service';
import { storageService } from '../services/storage.service';
import AnimatedProfileTransition from './AnimatedProfileTransition';
import { PusherReceiver } from './PusherReceiver';

interface UserProfileViewProps {
  onLogout: () => void;
  isFreshOAuth?: boolean;
}

export default function UserProfileView({ onLogout, isFreshOAuth = false }: UserProfileViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [profileContent, setProfileContent] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting to Gmail...');
  
  // Enhanced status message setter with logging
  const updateStatusMessage = (message: string, source: string) => {
    console.log(`🔄 STATUS CHANGE [${source}]: "${statusMessage}" → "${message}"`);
    setStatusMessage(message);
  };
  const [insightQueue, setInsightQueue] = useState<any[]>([]);
  const [hasShownInitialMessages, setHasShownInitialMessages] = useState(false);
  const [fakeProgressFrom90, setFakeProgressFrom90] = useState(0); // Extra progress from 90% to make it feel smoother
  
  // Use refs to avoid closure capture in interval
  const insightQueueRef = useRef<any[]>([]);
  const hasShownInitialRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    insightQueueRef.current = insightQueue;
  }, [insightQueue]);
  
  useEffect(() => {
    hasShownInitialRef.current = hasShownInitialMessages;
  }, [hasShownInitialMessages]);

  // Calculate overall progress percentage for user mode
  // Realistic stage distribution: 10/70/10/10 based on actual processing time
  const calculateOverallProgress = () => {
    let totalProgress = 0;
    
    // Stage 1: Fetch emails (0-10%) - quick
    if (masterProgress.fetchProgress) {
      const fetchPercent = (masterProgress.fetchProgress.processed / masterProgress.fetchProgress.total) * 10;
      totalProgress = fetchPercent;
    }
    
    // Stage 2: Extract insights (10-80%) - longest stage
    if (masterProgress.insightsProgress) {
      const insightsPercent = (masterProgress.insightsProgress.processed / masterProgress.insightsProgress.total) * 70;
      totalProgress = 10 + insightsPercent;
    }
    
    // Stage 3: Generate profiles (80-90%) - moderate
    if (masterProgress.profileProgress) {
      const profilePercent = (masterProgress.profileProgress.processed / masterProgress.profileProgress.total) * 10;
      totalProgress = 80 + profilePercent;
    }
    
    // Stage 4: Completely take over with fake progress at 90%
    if (totalProgress >= 90) {
      // Always use fake progress once we hit 90%, ignore real compile progress
      totalProgress = 90 + fakeProgressFrom90;
    }
    
    return Math.round(Math.min(totalProgress, 99));
  };
  
  // Progress tracking
  const [masterProgress, setMasterProgress] = useState({
    fetchProgress: null as { processed: number; total: number } | null,
    insightsProgress: null as { processed: number; total: number } | null,
    profileProgress: null as { processed: number; total: number } | null,
    compileProgress: null as { processed: number; total: number } | null,
    isEndToEndProcess: false
  });

  const toast = useToast();

  useEffect(() => {
    if (!hasCheckedProfile) {
      setHasCheckedProfile(true);
      checkExistingProfile();
    }
  }, [hasCheckedProfile]);

  // Effect 1: Handle phase-based status updates (reacts to progress changes)
  useEffect(() => {
    console.log(`🔄 PROGRESS STATUS EFFECT: isBuilding=${isBuilding}, progress=${calculateOverallProgress()}%`);
    
    if (!isBuilding) {
      console.log('⏹️ NOT BUILDING - progress status processor stopped');
      return;
    }

    const progress = calculateOverallProgress();
    
    // Update status based on current phase (but skip insights phase - queue handles that)
    if (progress < 8) {
      // Phase 1: Fetching emails (0-10%)
      updateStatusMessage('Connecting to Gmail...', 'FETCH_PHASE');
    } else if (progress >= 8 && progress < 11) {
      // Phase 2: Extracting insights (10-80%)
      updateStatusMessage('Looking for interesting patterns...', 'INSIGHTS_START');
    } else if (progress >= 80 && progress < 90) {
      // Phase 3: Generating profiles (80-90%)
      // updateStatusMessage('Generating Profile', 'PROFILE_PHASE');
    } else if (progress >= 90 && progress < 100) {
      // Phase 4: Writing final profile (90-100%)
      // updateStatusMessage('Writing Profile', 'COMPILE_PHASE');
    } else if (progress >= 100) {
      // Phase 5: Complete
      // updateStatusMessage('Profile complete!', 'COMPLETE_PHASE');
    }
    // Note: Phase 2 (10-80%) is handled by the queue processor below
  }, [isBuilding, masterProgress]);

  // Effect 2: Handle queue processing during insights phase (independent of progress updates)
  useEffect(() => {
    if (!isBuilding) {
      console.log('⏹️ NOT BUILDING - queue processor stopped');
      return;
    }

    console.log('🎬 STARTING QUEUE PROCESSOR');
    let messageCount = 0;

    const processQueue = async () => {
      // Use refs to get current values (avoids closure capture)
      const currentQueue = insightQueueRef.current;
      const currentHasShownInitial = hasShownInitialRef.current;
      const currentProgress = calculateOverallProgress();
      
             // Only skip if we're definitely past insights phase (80%+)
       if (currentProgress >= 80) {
         console.log(`🚫 QUEUE SKIP - past insights phase (progress: ${currentProgress}%)`);
         return;
       }
      
      console.log(`⏰ QUEUE PROCESSOR: Queue length: ${currentQueue.length}, hasShownInitial: ${currentHasShownInitial}, messageCount: ${messageCount}`);
      
      // First show initial message when entering insights phase
      if (currentQueue.length === 0 && !currentHasShownInitial && messageCount === 0) {
        messageCount++;
        console.log('🎯 SHOWING INITIAL INSIGHTS MESSAGE');
        updateStatusMessage('Looking for interesting patterns...', 'INSIGHTS_START');
        setHasShownInitialMessages(true);
        return;
      }
      
      // Then process one insight from queue
      if (currentQueue.length > 0) {
        console.log(`🔥 PROCESSING INSIGHT FROM QUEUE: ${currentQueue.length} insights available`);
        const queueItem = currentQueue[0];
        
        // Remove the item from queue immediately (optimistic update)
        const newQueue = currentQueue.slice(1);
        console.log(`🗑️ REMOVING ITEM FROM QUEUE: ${currentQueue.length} → ${newQueue.length} insights`);
        insightQueueRef.current = newQueue; // Update ref immediately
        setInsightQueue(newQueue); // Update state
        
        // Use pre-generated status message (no AI call needed!)
        const statusMessage = queueItem.statusMessage || 'Discovering things about you...';
        console.log(`💬 USING PRE-GENERATED STATUS:`, statusMessage);
        updateStatusMessage(statusMessage, 'AI_GENERATED');
      }
    };

    // Process every 3 seconds during insights phase
    console.log('⏱️ SETTING UP 3-SECOND QUEUE INTERVAL');
    const interval = setInterval(processQueue, 3000);

    return () => {
      console.log('🛑 CLEARING QUEUE INTERVAL');
      clearInterval(interval);
    };
  }, [isBuilding]); // Only depend on isBuilding, not masterProgress

  // Effect 3: Handle smooth fake progress from 90% to 100%
  useEffect(() => {
    if (!isBuilding) {
      setFakeProgressFrom90(0);
      return;
    }

    const actualProgress = (() => {
      let totalProgress = 0;
      
      if (masterProgress.fetchProgress) {
        const fetchPercent = (masterProgress.fetchProgress.processed / masterProgress.fetchProgress.total) * 10;
        totalProgress = fetchPercent;
      }
      
      if (masterProgress.insightsProgress) {
        const insightsPercent = (masterProgress.insightsProgress.processed / masterProgress.insightsProgress.total) * 70;
        totalProgress = 10 + insightsPercent;
      }
      
      if (masterProgress.profileProgress) {
        const profilePercent = (masterProgress.profileProgress.processed / masterProgress.profileProgress.total) * 10;
        totalProgress = 80 + profilePercent;
      }
      
      return totalProgress;
    })();

    // Completely take over at 90% - start fake progress regardless of compile status
    if (actualProgress >= 90 && fakeProgressFrom90 === 0) {
      console.log('🎭 TAKING OVER AT 90% - starting fake progress');
      setFakeProgressFrom90(1); // Start the fake progress
    }

    // Continue fake progress if we've started it
    if (fakeProgressFrom90 > 0 && fakeProgressFrom90 < 10) {
      console.log(`🎭 CONTINUING FAKE PROGRESS: currently at ${90 + fakeProgressFrom90}%`);
      
      const interval = setInterval(() => {
        setFakeProgressFrom90(prev => {
          const newFake = Math.min(prev + 1, 10); // Max 10% fake progress (90% + 10% = 100%)
          console.log(`🎭 FAKE PROGRESS TICK: ${90 + newFake}%`);
          return newFake;
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isBuilding, masterProgress, fakeProgressFrom90]);

  const checkExistingProfile = async () => {
    setIsLoading(true);
    
    try {
      // Check if user has existing profile files
      const files = storageService.getItem('ambient-agents-files');
      const fullProfile = files?.['full.md']?.content;
      
      if (fullProfile && fullProfile.trim() && !isFreshOAuth) {
        // User has a completed profile and this is NOT right after OAuth
        // Show the existing profile directly
        setProfileContent(fullProfile);
        setIsLoading(false);
      } else if (isFreshOAuth) {
        // This is right after OAuth - build profile regardless of existing data
        await buildUserProfile();
      } else if (!fullProfile || !fullProfile.trim()) {
        // User is authenticated but has no valid profile and this is NOT after OAuth
        // This shouldn't happen in normal flow - log them out
        onLogout();
      } else {
        // Fallback - shouldn't reach here
        onLogout();
      }
    } catch (error) {
      console.error('UserProfileView: Error checking existing profile:', error);
      setError('Failed to load profile. Please try again.');
      setIsLoading(false);
    }
  };

  const buildUserProfile = async () => {
    // Prevent duplicate calls
    if (isBuilding) {
      console.log('🚫 Build already started/in progress, skipping...');
      return;
    }
    
    setIsBuilding(true);
    setIsLoading(true);
    setError(null);
    setInsightQueue([]);
    setHasShownInitialMessages(false); // Reset for new build
    updateStatusMessage('Connecting to Gmail...', 'BUILD_START');
    setMasterProgress(prev => ({ ...prev, isEndToEndProcess: true }));
    
    try {
      // Clear existing data first
      await storageService.clearAll();
      
      // Fetch emails and build profile in one step
      const { emails, userInfo } = await profileService.fetchEmails({
        sentCount: 50,
        receivedCount: 50,
        onProgressUpdate: (stage, progress) => {
          setMasterProgress(prev => ({
            ...prev,
            [stage]: progress
          }));
        }
      });

      // Build profile using the fetched emails
      const result = await profileService.buildProfile({
        emailsToProcess: emails,
        userInfoToUse: userInfo,
        clearExistingData: false, // Don't clear again, we already cleared above
        onProgressUpdate: (stage, progress) => {
          setMasterProgress(prev => ({
            ...prev,
            [stage]: progress
          }));
        },
        onInsightReceived: async (insights: any[]) => {
          // Batch insights and generate status messages for the best ones
          console.log(`🔥 RECEIVED ${insights.length} insights:`, insights.slice(0, 2).map(i => i.insight));
          
          const userInfo = await storageService.getUserInfo();
          if (!userInfo) {
            console.log('❌ NO USER INFO - adding fallback status messages');
            const fallbackStatuses = insights.map(() => ({
              statusMessage: 'Discovering things about you...'
            }));
            setInsightQueue((prev: any[]) => [...prev, ...fallbackStatuses]);
            return;
          }

          // Process insights in batches of 10 to get the best ones
          const BATCH_SIZE = 10;
          const statusPromises: Promise<any>[] = [];
          
          for (let i = 0; i < insights.length; i += BATCH_SIZE) {
            const batch = insights.slice(i, i + BATCH_SIZE);
            console.log(`📦 PROCESSING BATCH ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} insights`);
            
            const batchPromise = (async () => {
              try {
                console.log(`🤖 SENDING BATCH TO AI: ${batch.length} insights to pick from`);
                const response = await axios.post('http://localhost:3001/api/ai/generate-status', {
                  insights: batch,
                  userInfo
                });
                console.log(`✅ AI GENERATED STATUS:`, response.data.message);
                
                // Just return the status message - we don't need to track which insight was selected
                return {
                  statusMessage: response.data.message,
                  batchSize: batch.length
                };
              } catch (error) {
                console.error(`❌ FAILED TO PROCESS BATCH:`, error);
                return {
                  statusMessage: 'Discovering things about you...',
                  batchSize: batch.length
                };
              }
            })();
            
            statusPromises.push(batchPromise);
          }
          
          // Wait for all batches to be processed
          const batchResults = await Promise.all(statusPromises);
          
          // Add the selected insights with status messages to queue
          setInsightQueue((prev: any[]) => {
            const newQueue = [...prev, ...batchResults];
            const totalProcessed = batchResults.reduce((sum, result) => sum + result.batchSize, 0);
            console.log(`📝 QUEUE UPDATED: ${prev.length} → ${newQueue.length} best insights (from ${totalProcessed} total insights)`);
            return newQueue;
          });
        }
      });

      // Get the full profile content
      const fullProfile = result.profileFiles['full.md'] || '';
      setProfileContent(fullProfile);
      
      // Save the full profile to localStorage so it persists
      const existingFiles = storageService.getItem('ambient-agents-files') || {};
      const updatedFiles = {
        ...existingFiles,
        'full.md': {
          name: 'full.md',
          content: fullProfile,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      storageService.setItem('ambient-agents-files', updatedFiles);

      // Clear progress after a short delay
      setTimeout(() => {
        setMasterProgress(prev => ({
          ...prev,
          isEndToEndProcess: false,
          fetchProgress: null,
          insightsProgress: null,
          profileProgress: null,
          compileProgress: null
        }));
        setIsLoading(false);
        setIsBuilding(false);
      }, 2000);

    } catch (error) {
      console.error('Error building profile:', error);
      setError('Failed to build your profile. Please try again.');
      setIsLoading(false);
      setIsBuilding(false);
      
      setTimeout(() => {
        setMasterProgress(prev => ({
          ...prev,
          isEndToEndProcess: false,
          fetchProgress: null,
          insightsProgress: null,
          profileProgress: null,
          compileProgress: null
        }));
      }, 1000);
    }
  };

  const handleContentChange = (value: string = '') => {
    setProfileContent(value);
    
    // Save changes to localStorage immediately
    const existingFiles = storageService.getItem('ambient-agents-files') || {};
    const updatedFiles = {
      ...existingFiles,
      'full.md': {
        name: 'full.md',
        content: value,
        createdAt: existingFiles['full.md']?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    storageService.setItem('ambient-agents-files', updatedFiles);
  };

  const handleConfirm = () => {
    // For now, just show an alert
    alert('Profile saved!');
    
    toast({
      title: 'Profile Confirmed',
      description: 'Your profile has been saved successfully.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleLogout = async () => {
    try {
      // Clear IndexedDB
      await storageService.clearAll();
      
      // Clear localStorage files
      storageService.removeItem('ambient-agents-files');
      
      toast({
        title: 'Logged Out',
        description: 'All your data has been cleared.',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      
      // Call the parent logout function
      onLogout();
    } catch (error) {
      console.error('UserProfileView: Error clearing data on logout:', error);
      // Still logout even if clearing fails
      onLogout();
    }
  };



  // Check if profile building is complete (all stages done)
  const isBuildingComplete = masterProgress.compileProgress?.processed === masterProgress.compileProgress?.total && 
                            masterProgress.compileProgress?.total !== undefined && 
                            masterProgress.compileProgress.total > 0;

  // Always use the animated transition for all states
  const overallProgress = calculateOverallProgress();
  const showProfileMode = !isBuilding && !isLoading && !!profileContent;

  // Memoize the Pusher callback to prevent reconnection loops
  const handleMasterProgressUpdate = useCallback((stage: string, progress: { processed: number; total: number } | null) => {
    console.log(`📡 PUSHER UPDATE: ${stage}`, progress);
    setMasterProgress(prev => ({
      ...prev,
      [stage]: progress
    }));
  }, []);

  return (
    <>
      <PusherReceiver 
        sessionId="default"
        onMasterProgressUpdate={handleMasterProgressUpdate}
      />
      
      <AnimatedProfileTransition
        overallProgress={overallProgress}
        statusMessage={statusMessage}
        error={error}
        onRetry={buildUserProfile}
        profileContent={profileContent}
        onContentChange={handleContentChange}
        onConfirm={handleConfirm}
        onLogout={handleLogout}
        isComplete={showProfileMode}
      />
    </>
  );
} 