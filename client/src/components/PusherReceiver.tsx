import { useEffect } from "react";
import Pusher from "pusher-js";

interface PusherReceiverProps {
  sessionId: string;
  onStatusUpdate?: (status: string) => void;
  onProgressUpdate?: (
    progress: {
      currentStep: string;
      processed: number;
      total: number;
      errors: number;
    } | null
  ) => void;
  onMasterProgressUpdate?: (
    stage: string,
    progress: { processed: number; total: number } | null
  ) => void;
}

export function PusherReceiver({
  sessionId,
  onStatusUpdate,
  onProgressUpdate,
  onMasterProgressUpdate,
}: PusherReceiverProps) {
  useEffect(() => {
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || "us2";

    console.log("Setting up Pusher connection for session:", sessionId);
    console.log(
      "All Vite env vars:",
      Object.keys(import.meta.env).filter((key) => key.startsWith("VITE_"))
    );
    console.log("Pusher Key:", pusherKey ? "Found" : "Missing");
    console.log("Pusher Cluster:", pusherCluster);

    if (!pusherKey) {
      console.error("VITE_PUSHER_KEY not found in environment variables");
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "http://localhost:3001/api/pusher/auth",
      auth: {
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          sessionId: sessionId,
        },
      },
    });

    pusher.connection.bind("connected", () => {
      console.log("✅ Pusher connected successfully");
    });

    pusher.connection.bind("error", (err: any) => {
      console.error("❌ Pusher connection error:", err);
    });

    const channelName = `${sessionId}`;
    console.log("Subscribing to channel:", channelName);
    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("✅ Successfully subscribed to channel:", channelName);
    });

    channel.bind("pusher:subscription_error", (err: any) => {
      console.error("❌ Channel subscription error:", err);
    });

    // Email fetching events
    channel.bind("fetch-start", (data: any) => {
      console.log("Email fetch started:", data);
      onStatusUpdate?.("Fetching emails...");
      if (onProgressUpdate) {
        onProgressUpdate({
          currentStep: "Fetching emails from Gmail",
          processed: 0,
          total: 1, // Will be updated when we know the total
          errors: 0,
        });
      }
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", { processed: 0, total: 1 });
      }
    });

    channel.bind("fetch-progress", (data: any) => {
      console.log("Email fetch progress:", data);
      onStatusUpdate?.(`Fetching emails... ${data.fetched}/${data.total}`);
      if (onProgressUpdate) {
        onProgressUpdate({
          currentStep: "Fetching emails from Gmail",
          processed: data.fetched || 0,
          total: data.total || 1,
          errors: 0,
        });
      }
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", {
          processed: data.fetched || 0,
          total: data.total || 1,
        });
      }
    });

    channel.bind("fetch-complete", (data: any) => {
      console.log("Email fetch complete:", data);
      onStatusUpdate?.(
        `✓ Fetched ${data.totalEmails} emails (${data.inboxCount || 0} inbox, ${
          data.sentCount || 0
        } sent)`
      );
      if (onProgressUpdate) {
        onProgressUpdate(null); // Clear progress when complete
      }
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", null);
      }
      setTimeout(() => onStatusUpdate?.(""), 5000);
    });

    channel.bind("fetch-error", (data: any) => {
      console.log("Email fetch error:", data);
      onStatusUpdate?.("Error fetching emails");
      if (onProgressUpdate) {
        onProgressUpdate(null); // Clear progress on error
      }
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", null);
      }
      setTimeout(() => onStatusUpdate?.(""), 5000);
    });

    // Insights extraction events
    channel.bind("insights-start", (data: any) => {
      console.log("Insights extraction started:", data);
      onStatusUpdate?.("Extracting insights...");
    });

    channel.bind("insights-complete", (data: any) => {
      console.log("Insights extraction complete:", data);
      onStatusUpdate?.(`✓ Extracted ${data.insightsCount} insights`);
      setTimeout(() => onStatusUpdate?.(""), 5000);
    });

    channel.bind("insights-error", (data: any) => {
      console.log("Insights extraction error:", data);
      onStatusUpdate?.("Error extracting insights");
      setTimeout(() => onStatusUpdate?.(""), 5000);
    });

    // NEW: Batch insights extraction events
    channel.bind("batch-insights-start", (data: any) => {
      console.log("Batch insights extraction started:", data);
      onStatusUpdate?.(`Processing batch of ${data.batchSize} emails...`);
    });

    channel.bind("batch-insights-progress", (data: any) => {
      console.log("Batch insights progress:", data);
      onStatusUpdate?.(
        `Processing ${data.processed}/${data.total}: ${
          data.subject || "email"
        }...`
      );
    });

    channel.bind("batch-insights-complete", (data: any) => {
      console.log("Batch insights extraction complete:", data);
      onStatusUpdate?.(
        `✓ Batch complete: ${data.successful}/${data.batchSize} emails processed (${data.totalInsights} insights)`
      );
      setTimeout(() => onStatusUpdate?.(""), 3000);
    });

    channel.bind("batch-insights-error", (data: any) => {
      console.log("Batch insights extraction error:", data);
      onStatusUpdate?.("Error processing batch");
      setTimeout(() => onStatusUpdate?.(""), 5000);
    });

    // Legacy profile generation events (keep for backwards compatibility)
    channel.bind("profile-start", (data: any) => {
      console.log("Profile generation started:", data);
      onStatusUpdate?.(`Fetching ${data.total || 10} recent emails...`);
    });

    channel.bind("profile-processing", (data: any) => {
      console.log("Processing email:", data);
      onStatusUpdate?.(
        `Processing email ${data.current}/${data.total}: ${
          data.subject || "No subject"
        }`
      );
    });

    channel.bind("profile-generating", (data: any) => {
      console.log("Generating profile:", data);
      onStatusUpdate?.(
        `Generating profile with ${data.totalInsights} insights...`
      );
    });

    channel.bind("profile-complete", (data: any) => {
      console.log("Profile generation complete:", data);
      onStatusUpdate?.("Profile generated successfully!");

      // Clear status after 3 seconds
      setTimeout(() => {
        onStatusUpdate?.("");
      }, 3000);
    });

    channel.bind("profile-error", (data: any) => {
      console.log("Profile generation error:", data);
      onStatusUpdate?.("Error generating profile");

      // Clear status after 5 seconds
      setTimeout(() => {
        onStatusUpdate?.("");
      }, 5000);
    });

    return () => {
      console.log("Cleaning up Pusher connection");
      pusher.unsubscribe(`${sessionId}`);
      pusher.disconnect();
    };
  }, [sessionId, onStatusUpdate, onProgressUpdate, onMasterProgressUpdate]);

  return null; // This component doesn't render anything
}
