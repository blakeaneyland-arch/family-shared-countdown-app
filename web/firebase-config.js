// Fill these in from Firebase console > Project settings > General > Your apps > Web app > SDK setup and configuration.
// These values are meant to be public in client-side code -- they are not secrets.
// Actual protection comes from the shared-password sign-in + Firestore security rules, not from hiding this file.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCoWd9009WQDd_vJG2s8jlaZWJGEHlmOso",
  authDomain: "neyland-family-countdown.firebaseapp.com",
  projectId: "neyland-family-countdown",
  storageBucket: "neyland-family-countdown.firebasestorage.app",
  messagingSenderId: "427468688332",
  appId: "1:427468688332:web:826909d1799db9d95e2b69",
};

// The one shared login's fixed email. The UI only ever asks for the password --
// this email is just a technical requirement of Firebase Auth's email+password method.
window.SHARED_AUTH_EMAIL = "the.neylands.17@gmail.com";
