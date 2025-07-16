import { Box, Flex } from "@chakra-ui/react";
import { useState } from "react";

import { useDataLoader } from "../hooks/useDataLoader";
import { useEmailManager } from "../hooks/useEmailManager";
import { useInsightsManager } from "../hooks/useInsightsManager";
import { useProfileManager } from "../hooks/useProfileManager";
import { useProgress } from "../hooks/useProgress";

import DashboardPanel from "./DashboardPanel";
import EmailList from "./EmailList";
import EmailViewer from "./EmailViewer";
import FileEditor from "./FileEditor";
import FileList from "./FileList";
import InsightsViewer from "./InsightsViewer";
import MasterProgressBar from "./MasterProgressBar";
import { PusherReceiver } from "./PusherReceiver";
import Toolbar from "./Toolbar";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Custom hooks
  const dataLoader = useDataLoader();
  const { emails, userInfo, isLoading: emailsLoading } = dataLoader;

  const {
    isProcessing: extractingInsights,
    handleFetchEmails,
    handleDeleteAllData,
  } = useEmailManager();

  const profileManager = useProfileManager();
  const {
    isBuilding: buildingProfile,
    progress: profileProgress,
    handleBuildProfile,
    handleCompileProfile,
    files,
    selectedFileItem,
    handleSaveFile,
    handleFileSelect,
    handleDeleteFile,
    handleDeleteAllFiles,
  } = profileManager;

  const progressManager = useProgress(profileProgress);
  const { masterProgress, setMasterProgress } = progressManager;

  const insightsManager = useInsightsManager(selectedEmailId);
  const { insights, insightsByEmail, insightError, extractInsightsFromEmail } =
    insightsManager;

  const selectedEmail = selectedEmailId
    ? emails.find((e) => e.id === selectedEmailId) || null
    : null;
  const showInsightsPanel =
    insights.length > 0 || extractingInsights || insightError;
  const hasFiles = Object.keys(files).length > 0;

  const handleExtractInsights = async () => {
    if (!selectedEmail || !userInfo) return;

    try {
      await extractInsightsFromEmail(selectedEmail, userInfo);
    } catch (error) {
      console.error("Error extracting insights:", error);
    }
  };

  return (
    <Box h="100vh" bg="gray.50">
      <PusherReceiver
        sessionId="default"
        onMasterProgressUpdate={(stage, progress) => {
          setMasterProgress((prev) => ({ ...prev, [stage]: progress }));
        }}
      />

      <Toolbar
        onLogout={onLogout}
        onDeleteAllData={() =>
          handleDeleteAllData({ insightsManager, profileManager })
        }
      />

      <MasterProgressBar
        fetchProgress={masterProgress.fetchProgress}
        insightsProgress={masterProgress.insightsProgress}
        profileProgress={masterProgress.profileProgress}
        compileProgress={masterProgress.compileProgress}
        isVisible={masterProgress.isEndToEndProcess}
      />

      <Flex h="calc(100vh - 60px)" w="100%">
        <DashboardPanel width="20%">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onEmailSelect={setSelectedEmailId}
            onFetchEmails={(options) =>
              handleFetchEmails(options, {
                profileManager,
                insightsManager,
                progressManager,
              })
            }
            isLoading={emailsLoading || buildingProfile}
            processingEmailIds={new Set()}
            queuedEmailIds={new Set()}
            error={null}
            insightsByEmail={insightsByEmail}
          />
        </DashboardPanel>

        <DashboardPanel width="20%" isEmpty={!selectedEmail}>
          {selectedEmail && (
            <EmailViewer
              email={selectedEmail}
              onExtractInsights={handleExtractInsights}
              isLoading={extractingInsights}
              error={null}
              onClose={() => setSelectedEmailId(null)}
              showCloseButton={!showInsightsPanel}
              hasInsights={
                selectedEmailId ? !!insightsByEmail[selectedEmailId] : false
              }
            />
          )}
        </DashboardPanel>

        <DashboardPanel width="20%" isEmpty={!showInsightsPanel}>
          {showInsightsPanel && (
            <InsightsViewer
              insights={insights}
              onApplyToBio={() =>
                handleBuildProfile({
                  insightsManager,
                  progressManager,
                })
              }
              isLoading={buildingProfile}
              isExtracting={extractingInsights}
              error={insightError}
              hasAttemptedExtraction={
                selectedEmailId ? selectedEmailId in insightsByEmail : false
              }
            />
          )}
        </DashboardPanel>

        <DashboardPanel width="20%" isEmpty={!hasFiles}>
          {hasFiles && (
            <FileList
              files={files}
              selectedFile={selectedFileItem}
              onFileSelect={handleFileSelect}
              onDeleteFile={handleDeleteFile}
              onDeleteAll={handleDeleteAllFiles}
              onCompileProfile={() =>
                handleCompileProfile({
                  files,
                  userInfo,
                })
              }
              isCompiling={false}
            />
          )}
        </DashboardPanel>

        <DashboardPanel width="20%" isEmpty={!selectedFileItem}>
          {selectedFileItem && (
            <FileEditor
              file={selectedFileItem}
              hasFiles={hasFiles}
              onSave={handleSaveFile}
            />
          )}
        </DashboardPanel>
      </Flex>
    </Box>
  );
}
