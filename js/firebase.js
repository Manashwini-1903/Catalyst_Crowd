import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
getAuth
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Replace these placeholder values with your actual Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyD5aLkgaWc5ik5gXEdBS1DsoV9zh9mjpf0",
  authDomain: "catalyst-crowd-ee987.firebaseapp.com",
  projectId: "catalyst-crowd-ee987",
  storageBucket: "catalyst-crowd-ee987.firebasestorage.app",
  messagingSenderId: "363370693204",
  appId: "1:363370693204:web:3731cad0b18df2f4c8a3c1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
