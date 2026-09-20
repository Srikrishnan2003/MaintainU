import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    try {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines with actual newlines
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log("Firebase Admin Initialized successfully.");
    } catch (error) {
        console.error("Firebase Admin Initialization Error", error);
    }
}

export const firebaseAdmin = getApp();
