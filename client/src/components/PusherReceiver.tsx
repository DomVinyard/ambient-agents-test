import { useEffect } from 'react';
import Pusher from 'pusher-js';
import { getOrCreateSessionId } from '../state/session';

export function PusherReceiver() {
  useEffect(() => {
    // Initialize Pusher with key and cluster
    const pusher = new Pusher('edee5dc989021e9397ea', {
      cluster: 'us3'
    });

    // Use a public channel (no 'private-' prefix)
    const channelName = getOrCreateSessionId();
    const channel = pusher.subscribe(channelName);

    // Log all events
    channel.bind_global((eventName: string, data: any) => {
      console.log(`[Pusher Event] ${eventName}:`, data);
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
} 