// Fill these in from Firebase console > Project settings > General > Your apps > Web app > SDK setup and configuration.
// These values are meant to be public in client-side code -- they are not secrets.
// Actual protection comes from the shared-password sign-in + Firestore security rules, not from hiding this file.
window.FIREBASE_CONFIG = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

// The one shared login's fixed email. The UI only ever asks for the password --
// this email is just a technical requirement of Firebase Auth's email+password method.
window.SHARED_AUTH_EMAIL = "us@family-countdown.app";
