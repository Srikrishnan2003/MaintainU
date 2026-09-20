import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { registerFcmTokenAction } from '@/actions/notification.action';
import { toast } from 'sonner';

export function usePushNotifications() {
    useEffect(() => {
        // Only run on native Android/iOS
        if (!Capacitor.isNativePlatform()) return;

        const registerPush = async () => {
            try {
                // Request permission to use push notifications
                // iOS will prompt user and return if they granted permission or not
                // Android will just grant without prompting (for Android < 13)
                // For Android 13+, it will prompt the user
                let permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.log("Push notification permission denied");
                    return;
                }

                // Register with Apple / Google to receive push via APNS/FCM
                await PushNotifications.register();

            } catch (error) {
                console.error("Error setting up push notifications:", error);
            }
        };

        // Listen for registration success
        const registrationListener = PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token: ' + token.value);
            // Send token to our Next.js backend
            const res = await registerFcmTokenAction(token.value);
            if (!res.success) {
                console.error("Failed to register FCM token with backend");
            }
        });

        // Listen for registration failure
        const registrationErrorListener = PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Listen for incoming notifications when app is in foreground
        const pushNotificationReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            // Show a toast if app is open
            toast.info(notification.title, {
                description: notification.body,
            });
        });

        // Listen for user tapping on notification
        const pushNotificationActionPerformedListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
            // You can route the user based on notification.data here if needed
        });

        registerPush();

        // Cleanup listeners
        return () => {
            registrationListener.then(l => l.remove());
            registrationErrorListener.then(l => l.remove());
            pushNotificationReceivedListener.then(l => l.remove());
            pushNotificationActionPerformedListener.then(l => l.remove());
        };
    }, []);
}
