import Pusher from 'pusher';
import dotenv from 'dotenv';

dotenv.config();

class PusherService {
    private pusher: Pusher;

    constructor() {
        this.pusher = new Pusher({
            appId: process.env.PUSHER_APP_ID!,
            key: process.env.PUSHER_KEY!,
            secret: process.env.PUSHER_SECRET!,
            cluster: process.env.PUSHER_CLUSTER!,
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
            await this.pusher.trigger(channel, event, data);
        } catch (error) {
            console.error('Error triggering Pusher event:', error);
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