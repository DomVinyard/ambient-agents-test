import { useState, useEffect } from 'react';
import { ProfileProgress } from './useProfileManager';

export interface MasterProgress {
  fetchProgress: { processed: number; total: number } | null;
  insightsProgress: { processed: number; total: number } | null;
  profileProgress: { processed: number; total: number } | null;
  compileProgress: { processed: number; total: number } | null;
  isEndToEndProcess: boolean;
}

export const useProgress = (profileProgress: ProfileProgress) => {
  const [masterProgress, setMasterProgress] = useState<MasterProgress>({
    fetchProgress: null,
    insightsProgress: null,
    profileProgress: null,
    compileProgress: null,
    isEndToEndProcess: false,
  });

  // Update master progress from profile manager
  useEffect(() => {
    if (profileProgress.stage !== "idle") {
      setMasterProgress((prev) => ({
        ...prev,
        [profileProgress.stage]: {
          processed: profileProgress.processed,
          total: profileProgress.total,
        },
      }));
    }
  }, [profileProgress]);

  const startEndToEndProcess = () => {
    setMasterProgress((prev) => ({ ...prev, isEndToEndProcess: true }));
  };

  const updateProgress = (stage: string, progress: { processed: number; total: number }) => {
    setMasterProgress((prev) => ({
      ...prev,
      [stage]: progress,
    }));
  };

  const completeProcess = () => {
    setMasterProgress((prev) => ({
      ...prev,
      compileProgress: { processed: 2, total: 2 },
    }));

    setTimeout(() => {
      setMasterProgress((prev) => ({
        ...prev,
        isEndToEndProcess: false,
        fetchProgress: null,
        insightsProgress: null,
        profileProgress: null,
        compileProgress: null,
      }));
    }, 2000);
  };

  const clearProgress = () => {
    setMasterProgress((prev) => ({
      ...prev,
      isEndToEndProcess: false,
      fetchProgress: null,
      insightsProgress: null,
      profileProgress: null,
      compileProgress: null,
    }));
  };

  const clearFetchProgress = () => {
    setMasterProgress((prev) => ({
      ...prev,
      isEndToEndProcess: false,
      fetchProgress: null,
    }));
  };

  return {
    masterProgress,
    startEndToEndProcess,
    updateProgress,
    completeProcess,
    clearProgress,
    clearFetchProgress,
    setMasterProgress,
  };
}; 