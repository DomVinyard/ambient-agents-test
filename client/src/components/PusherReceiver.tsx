import { useEffect } from 'react';
import Pusher from 'pusher-js';

interface PusherReceiverProps {
  sessionId: string;
  onStatusUpdate: (status: string) => void;
}

export function PusherReceiver({ sessionId, onStatusUpdate }: PusherReceiverProps) {
  useEffect(() => {
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'us2';
    
    console.log('Setting up Pusher connection for session:', sessionId);
    console.log('All Vite env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
    console.log('Pusher Key:', pusherKey ? 'Found' : 'Missing');
    console.log('Pusher Cluster:', pusherCluster);
    
    if (!pusherKey) {
      console.error('VITE_PUSHER_KEY not found in environment variables');
      return;
    }
    
    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: 'http://localhost:3001/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          sessionId: sessionId
        }
      }
    });

    pusher.connection.bind('connected', () => {
      console.log('✅ Pusher connected successfully');
    });

    pusher.connection.bind('error', (err: any) => {
      console.error('❌ Pusher connection error:', err);
    });

    const channelName = `${sessionId}`;
    console.log('Subscribing to channel:', channelName);
    const channel = pusher.subscribe(channelName);
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ Successfully subscribed to channel:', channelName);
    });

    channel.bind('pusher:subscription_error', (err: any) => {
      console.error('❌ Channel subscription error:', err);
    });
    
    // Profile generation events
    channel.bind('profile-start', (data: any) => {
      console.log('Profile generation started:', data);
      onStatusUpdate(`Fetching ${data.total || 10} recent emails...`);
    });

    channel.bind('profile-processing', (data: any) => {
      console.log('Processing email:', data);
      onStatusUpdate(`Processing email ${data.current}/${data.total}: ${data.subject || 'No subject'}`);
    });

    channel.bind('profile-generating', (data: any) => {
      console.log('Generating profile:', data);
      onStatusUpdate(`Generating profile with ${data.totalInsights} insights...`);
    });

    channel.bind('profile-complete', (data: any) => {
      console.log('Profile generation complete:', data);
      onStatusUpdate('Profile generated successfully!');
      
      // Clear status after 3 seconds
      setTimeout(() => {
        onStatusUpdate('');
      }, 3000);
    });

    channel.bind('profile-error', (data: any) => {
      console.log('Profile generation error:', data);
      onStatusUpdate('Error generating profile');
      
      // Clear status after 5 seconds
      setTimeout(() => {
        onStatusUpdate('');
      }, 5000);
    });

    return () => {
      console.log('Cleaning up Pusher connection');
      pusher.unsubscribe(`${sessionId}`);
      pusher.disconnect();
    };
  }, [sessionId, onStatusUpdate]);

  return null; // This component doesn't render anything
} 