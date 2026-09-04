// This file is only imported on the server-side (API routes)
import admin from "firebase-admin";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize Firebase Admin SDK - lazy initialization for API runtime
let initializedAdmin: any = null;
let firebaseMessagingInstance: any = null;

const getInitializedAdmin = () => {
  if (initializedAdmin) return initializedAdmin;

  if (!firebaseConfig.projectId || !firebaseConfig.privateKey || !firebaseConfig.clientEmail) {
    console.error("Missing Firebase configuration in environment variables");
    return null;
  }

  try {
    const adminAny = admin as any;
    const existingApps = adminAny.apps || [];
    if (existingApps.length === 0) {
      adminAny.initializeApp({
        credential: adminAny.credential.cert({
          projectId: firebaseConfig.projectId,
          privateKey: firebaseConfig.privateKey,
          clientEmail: firebaseConfig.clientEmail,
        }),
      });
    }
    initializedAdmin = adminAny;
    firebaseMessagingInstance = adminAny.messaging();
    return initializedAdmin;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return null;
  }
};

// Lazy initialization - don't initialize at module load time
export const getFirebaseAdmin = () => getInitializedAdmin();

export const firebaseMessaging = () => {
  const adminInstance = getInitializedAdmin();
  return adminInstance ? adminInstance.messaging() : null;
};
