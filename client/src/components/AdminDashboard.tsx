import { Box, Flex } from "@chakra-ui/react";
import { useState } from "react";
import Toolbar from "./Toolbar";
import EmailList from "./EmailList";
import EmailViewer from "./EmailViewer";
import InsightsViewer from "./InsightsViewer";
import FileList from "./FileList";
import FileEditor from "./FileEditor";
import DashboardPanel from "./DashboardPanel";
import { PusherReceiver } from "./PusherReceiver";
import MasterProgressBar from "./MasterProgressBar";
import { useFileManager } from "../hooks/useFileManager";
import { useEmailProcessing } from "../hooks/useEmailProcessing";
import { useProfileBuilder } from "../hooks/useProfileBuilder";
import { useDataLoader } from "../hooks/useDataLoader";
import { useAppToast } from "../hooks/useAppToast";
import { storageService } from "../services/storage.service";
import axios from "axios";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  // Loading states
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [compilingProfile, setCompilingProfile] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  const { showError, showSuccess, showWarning, showInfo } = useAppToast();

  // Custom hooks
  const {
    emails,
    setEmails,
    selectedEmailId,
    setSelectedEmailId,
    insights,
    setInsights,
    insightsByEmail,
    setInsightsByEmail,
    userInfo,
    setUserInfo,
    selectedEmail,
    clearAllData,
    resetEmailData,
  } = useDataLoader();

  const {
    extractingInsights,
    processingEmailIds,
    queuedEmailIds,
    setProcessingEmailIds,
    setQueuedEmailIds,
    handleExtractInsights,
    getAuthTokens,
  } = useEmailProcessing();

  const {
    buildingProfile,
    masterProgress,
    setMasterProgress,
    handleBuildProfile,
    formatAutomationData,
  } = useProfileBuilder();

  const {
    files,
    selectedFileItem,
    handleSaveFile,
    createOrUpdateFile,
    handleFileSelect,
    handleDeleteFile,
    clearAllFiles,
  } = useFileManager();

  const handleFetchEmails = async (options: {
    buildProfile: boolean;
    sentCount: number;
    receivedCount: number;
    deleteProfileFiles: boolean;
  }) => {
    setFetchingEmails(true);
    setEmailError(null);

    if (options.buildProfile) {
      setMasterProgress((prev) => ({ ...prev, isEndToEndProcess: true }));
    }

    if (options.deleteProfileFiles) {
      clearAllFiles();
    }

    resetEmailData();
    setInsightError(null);
    setProcessingEmailIds(new Set());
    setQueuedEmailIds(new Set());

    try {
      const tokens = getAuthTokens();
      const response = await axios.post(
        "http://localhost:3001/api/gmail/fetch-emails",
        {
          tokens,
          sessionId: "default",
          sentCount: options.sentCount,
          receivedCount: options.receivedCount,
        }
      );

      const newEmails = response.data.emails;
      setEmails(newEmails);
      setUserInfo(response.data.userInfo);

      await Promise.all([
        storageService.setEmails(newEmails),
        storageService.setUserInfo(response.data.userInfo),
        storageService.setInsights({}),
      ]);

      if (options.buildProfile && newEmails.length > 0) {
        await handleBuildProfile(
          newEmails,
          response.data.userInfo,
          {},
          setInsightsByEmail,
          setEmails,
          setProcessingEmailIds,
          createOrUpdateFile
        );
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
      setEmailError("Failed to fetch emails. Please try again.");
      showError("Error", "Failed to fetch emails. Please try again.");
    } finally {
      setFetchingEmails(false);
      if (!options.buildProfile) {
        setMasterProgress((prev) => ({
          ...prev,
          isEndToEndProcess: false,
          fetchProgress: null,
        }));
      }
    }
  };

  const handleCompileProfile = async () => {
    setCompilingProfile(true);

    try {
      const tokens = getAuthTokens();
      const profileFiles = Object.entries(files)
        .filter(
          ([fileName]) => !["full.md", "automation.md"].includes(fileName)
        )
        .reduce((acc, [fileName, file]) => {
          acc[fileName] = file.content;
          return acc;
        }, {} as Record<string, string>);

      if (Object.keys(profileFiles).length === 0) {
        showWarning(
          "No Profile Files",
          "You need to create some profile files first."
        );
        return;
      }

      const [compileResponse, automationResponse] = await Promise.all([
        axios.post("http://localhost:3001/api/ai/compile-profile", {
          tokens,
          profileFiles,
          userInfo,
          sessionId: "default",
        }),
        axios.post("http://localhost:3001/api/ai/analyze-automation", {
          tokens,
          profileFiles,
          userInfo,
          sessionId: "default",
        }),
      ]);

      createOrUpdateFile("full.md", compileResponse.data.content);
      createOrUpdateFile(
        "automation.md",
        formatAutomationData(automationResponse.data)
      );

      showSuccess(
        "Profile Compiled",
        "Successfully compiled profile and automation files."
      );
    } catch (error) {
      console.error("Error compiling profile:", error);
      showError("Error", "Failed to compile profile. Please try again.");
    } finally {
      setCompilingProfile(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete ALL data? This will remove emails, insights, and profile files. This action cannot be undone."
      )
    ) {
      try {
        await clearAllData();
        clearAllFiles();
        setEmailError(null);
        setInsightError(null);

        showSuccess(
          "All Data Deleted",
          "Successfully deleted all emails, insights, and profile files."
        );
      } catch (error) {
        console.error("Error clearing data:", error);
        showError("Error", "Failed to clear all data. Please try again.");
      }
    }
  };

  const handleDeleteAllFiles = () => {
    if (
      window.confirm(
        "Are you sure you want to delete all profile files? This action cannot be undone."
      )
    ) {
      clearAllFiles();
      showInfo("Files Deleted", "All profile files have been deleted.");
    }
  };

  const showInsightsPanel =
    insights.length > 0 || extractingInsights || insightError;

  const hasFiles = Object.keys(files).length > 0;

  return (
    <Box h="100vh" bg="gray.50">
      <PusherReceiver
        sessionId="default"
        onMasterProgressUpdate={(stage, progress) => {
          setMasterProgress((prev) => ({ ...prev, [stage]: progress }));
        }}
      />

      <Toolbar onLogout={onLogout} onDeleteAllData={handleDeleteAllData} />

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
            onFetchEmails={handleFetchEmails}
            isLoading={fetchingEmails || buildingProfile}
            processingEmailIds={processingEmailIds}
            queuedEmailIds={queuedEmailIds}
            error={emailError}
            insightsByEmail={insightsByEmail}
            hasExistingEmails={emails.length > 0}
            hasExistingProfileFiles={hasFiles}
          />
        </DashboardPanel>

        <DashboardPanel width="20%" isEmpty={!selectedEmail}>
          {selectedEmail && (
            <EmailViewer
              email={selectedEmail}
              onExtractInsights={() =>
                handleExtractInsights(
                  selectedEmailId,
                  selectedEmail,
                  userInfo,
                  emails,
                  insightsByEmail,
                  setEmails,
                  setInsightsByEmail,
                  setInsights,
                  setInsightError
                )
              }
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
                handleBuildProfile(
                  emails,
                  userInfo,
                  insightsByEmail,
                  setInsightsByEmail,
                  setEmails,
                  setProcessingEmailIds,
                  createOrUpdateFile
                )
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

        <DashboardPanel width={hasFiles ? "20%" : "40%"}>
          <FileList
            files={files}
            selectedFile={selectedFileItem}
            onFileSelect={handleFileSelect}
            onDeleteFile={handleDeleteFile}
            onDeleteAll={handleDeleteAllFiles}
            onCompileProfile={handleCompileProfile}
            isCompiling={compilingProfile}
          />
        </DashboardPanel>

        {hasFiles && (
          <DashboardPanel width="20%">
            <FileEditor
              file={selectedFileItem}
              hasFiles={hasFiles}
              onSave={handleSaveFile}
            />
          </DashboardPanel>
        )}
      </Flex>
    </Box>
  );
}
