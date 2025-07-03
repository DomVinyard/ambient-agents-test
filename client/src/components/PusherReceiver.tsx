import { useEffect } from "react";
import Pusher from "pusher-js";

interface PusherReceiverProps {
  sessionId: string;
  onMasterProgressUpdate?: (
    stage: string,
    progress: { processed: number; total: number } | null
  ) => void;
}

export function PusherReceiver({
  sessionId,
  onMasterProgressUpdate,
}: PusherReceiverProps) {
  useEffect(() => {
    // Initialize Pusher if configuration is available
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || "us2";

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
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", { processed: 0, total: 1 });
      }
    });

    channel.bind("fetch-progress", (data: any) => {
      console.log("Email fetch progress:", data);
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", {
          processed: data.fetched || 0,
          total: data.total || 1,
        });
      }
    });

    channel.bind("fetch-complete", (data: any) => {
      console.log("Email fetch complete:", data);
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", null);
      }
    });

    channel.bind("fetch-error", (data: any) => {
      console.log("Email fetch error:", data);
      if (onMasterProgressUpdate) {
        onMasterProgressUpdate("fetchProgress", null);
      }
    });

    // Batch insights extraction events
    channel.bind("batch-insights-start", (data: any) => {
      console.log("Batch insights extraction started:", data);
    });

    channel.bind("batch-insights-progress", (data: any) => {
      console.log("Batch insights progress:", data);
    });

    channel.bind("batch-insights-complete", (data: any) => {
      console.log("Batch insights extraction complete:", data);
    });

    channel.bind("batch-insights-error", (data: any) => {
      console.log("Batch insights extraction error:", data);
    });

    // Profile blending events
    channel.bind("blend-start", (data: any) => {
      console.log("Profile blending started:", data);
    });

    channel.bind("blend-complete", (data: any) => {
      console.log("Profile blending complete:", data);
    });

    channel.bind("blend-error", (data: any) => {
      console.log("Profile blending error:", data);
    });

    // Profile compilation events
    channel.bind("compile-start", (data: any) => {
      console.log("Profile compilation started:", data);
    });

    channel.bind("compile-complete", (data: any) => {
      console.log("Profile compilation complete:", data);
    });

    channel.bind("compile-error", (data: any) => {
      console.log("Profile compilation error:", data);
    });

    // Automation analysis events
    channel.bind("automation-start", (data: any) => {
      console.log("Automation analysis started:", data);
    });

    channel.bind("automation-complete", (data: any) => {
      console.log("Automation analysis complete:", data);
    });

    channel.bind("automation-error", (data: any) => {
      console.log("Automation analysis error:", data);
    });

    return () => {
      console.log("Cleaning up Pusher connection");
      pusher.unsubscribe(`${sessionId}`);
      pusher.disconnect();
    };
  }, [sessionId, onMasterProgressUpdate]);

  return null; // This component doesn't render anything
}
