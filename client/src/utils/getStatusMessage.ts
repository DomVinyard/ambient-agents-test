interface ProgressState {
  fetchProgress: { processed: number; total: number } | null;
  insightsProgress: { processed: number; total: number } | null;
  profileProgress: { processed: number; total: number } | null;
  compileProgress: { processed: number; total: number } | null;
}

export function getStatusMessage(masterProgress: ProgressState): string {
  // Check if fetch stage is active (exists but not complete)
  if (masterProgress.fetchProgress) {
    if (masterProgress.fetchProgress.processed < masterProgress.fetchProgress.total) {
      return "I'm fetching a list of your recent emails";
    }
  }
  
  // Check if insights stage is active
  if (masterProgress.insightsProgress) {
    if (masterProgress.insightsProgress.processed < masterProgress.insightsProgress.total) {
      return "Now I'm analyzing your emails to learn a bit about you";
    }
    // If insights exists and is complete, check next stage
  }
  
  // Check if profile stage is active
  if (masterProgress.profileProgress) {
    if (masterProgress.profileProgress.processed < masterProgress.profileProgress.total) {
      return "Now I'm building these insights into a profile";
    }
    // If profile exists and is complete, check next stage
  }
  
  // Check if compile stage is active
  if (masterProgress.compileProgress) {
    if (masterProgress.compileProgress.processed < masterProgress.compileProgress.total) {
      return "Writing up your profile";
    }
    // If compile exists and is complete, we're done
    if (masterProgress.compileProgress.processed === masterProgress.compileProgress.total) {
      return "Profile complete!";
    }
  }
  
  // Default state before any stages start
  return "Preparing...";
} 