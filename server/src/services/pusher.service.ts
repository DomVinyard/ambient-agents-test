import Pusher from 'pusher';
import dotenv from 'dotenv';

dotenv.config();

class PusherService {
    private pusher: Pusher;

    constructor() {
        // Check if Pusher environment variables are configured
        const appId = process.env.PUSHER_APP_ID;
        const key = process.env.PUSHER_KEY;
        const secret = process.env.PUSHER_SECRET;
        const cluster = process.env.PUSHER_CLUSTER;

        if (!appId || !key || !secret || !cluster) {
            console.error('⚠️  WARNING: One or more Pusher environment variables are missing!');
            console.error('   Required: PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER');
        } else {
            console.log('✅ All Pusher environment variables are configured');
        }

        this.pusher = new Pusher({
            appId: appId!,
            key: key!,
            secret: secret!,
            cluster: cluster!,
            useTLS: true
        });
    }

    /**
     * Trigger an event on a specific channel
     * @param channel The channel to trigger the event on
     * @param event The event name
     * @param data The data to send
     */
    async trigger(channel: string, event: string, data: any) {
        try {
            const result = await this.pusher.trigger(channel, event, data);
            return result;
        } catch (error) {
            console.error('❌ Error triggering Pusher event:', error);
            throw error;
        }
    }

    /**
     * Authenticate a private channel subscription
     * @param socketId The socket ID of the client
     * @param channel The channel to authenticate
     */
    authenticate(socketId: string, channel: string) {
        try {
            return this.pusher.authorizeChannel(socketId, channel);
        } catch (error) {
            console.error('Error authenticating Pusher channel:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const pusherService = new PusherService(); 