// Firebase Client SDK for browser-side operations
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration (using public keys only - safe for client)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let firebaseApp: any = null;
let messaging: any = null;

/**
 * Initialize Firebase app (client-side)
 */
export function initializeFirebaseClient() {
  if (!firebaseApp) {
    try {
      // Check if Firebase config is properly set
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        console.warn("[Firebase] Firebase config missing - notifications will not work");
        return null;
      }

      firebaseApp = initializeApp(firebaseConfig);
      messaging = getMessaging(firebaseApp);
      
      console.log("[Firebase] Client initialized successfully");
      
      // Register main service worker first (for PWA)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        }).then((registration) => {
          console.log("[Firebase] Main service worker registered:", registration.scope);
          
          // Then register Firebase messaging service worker
          // Use a delay to ensure the main SW is registered first
          setTimeout(() => {
            navigator.serviceWorker.register("/firebase-messaging-sw.js", {
              scope: "/",
            }).then((fbRegistration) => {
              console.log("[Firebase] Messaging service worker registered:", fbRegistration.scope);
            }).catch((error) => {
              console.warn("[Firebase] Messaging service worker registration warning:", error.message);
              // This is not critical - FCM can still work with the main SW
            });
          }, 500);
        }).catch((error) => {
          console.error("[Firebase] Main service worker registration failed:", error);
        });
      }
    } catch (error) {
      console.error("[Firebase] Initialization error:", error);
      // Don't crash the app if Firebase fails - it's not critical
      return null;
    }
  }
  return firebaseApp;
}

/**
 * Get Firebase messaging instance
 */
export function getFirebaseMessaging() {
  if (!messaging) {
    initializeFirebaseClient();
  }
  return messaging;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.log("[FCM] Notifications not supported in this browser");
      return null;
    }

    // If already granted, get token directly
    if (Notification.permission === "granted") {
      return await getFCMToken();
    }

    // If denied, return null
    if (Notification.permission === "denied") {
      console.log("[FCM] Notifications denied by user");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Notification permission not granted");
      return null;
    }

    // Get token after permission granted
    return await getFCMToken();
  } catch (error) {
    console.error("[FCM] Error requesting notification permission:", error);
    return null;
  }
}

/**
 * Get FCM token for this device
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.log("[FCM] Firebase messaging not initialized");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.substring(0, 20) + "...");
      return token;
    }

    console.log("[FCM] No FCM token obtained");
    return null;
  } catch (error) {
    console.error("[FCM] Error getting FCM token:", error);
    return null;
  }
}

/**
 * Subscribe to foreground push messages
 */
export function subscribeToPushMessages(
  callback: (payload: any) => void
): (() => void) | null {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.log("[FCM] Firebase messaging not initialized");
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      try {
        console.log("[FCM] Foreground message received:", payload);
        // Safely call callback with error handling
        if (callback && typeof callback === 'function') {
          callback(payload || {});
        }
      } catch (callbackErr) {
        console.error("[FCM] Error in message callback:", callbackErr);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("[FCM] Error subscribing to push messages:", error);
    return null;
  }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken(token: string): Promise<boolean> {
  try {
    const deviceName = typeof navigator !== 'undefined' && navigator.userAgent 
      ? `${navigator.userAgent.substring(0, 50)}` 
      : 'Unknown Device';
    
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fcmToken: token,
        deviceName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to register FCM token: ${response.statusText}`);
    }

    console.log("[FCM] Token registered with backend");
    return true;
  } catch (error) {
    console.error("[FCM] Error registering FCM token:", error);
    return false;
  }
}

/**
 * Unregister FCM token from backend
 */
export async function unregisterFCMToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fcmToken: token,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to unregister FCM token: ${response.statusText}`
      );
    }

    console.log("[FCM] Token unregistered from backend");
    return true;
  } catch (error) {
    console.error("[FCM] Error unregistering FCM token:", error);
    return false;
  }
}
