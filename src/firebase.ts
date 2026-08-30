import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "quixotic-bongo-3tgzl",
  appId: "1:797867653517:web:5c7ad13d69e08a9b0a65c4",
  apiKey: "AIzaSyAQSJcynPLAI9dv068U5vTLGHq4vvLfDqc",
  authDomain: "quixotic-bongo-3tgzl.firebaseapp.com",
  storageBucket: "quixotic-bongo-3tgzl.firebasestorage.app",
  messagingSenderId: "797867653517"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-nduggashariflive-a1f4797d-604a-454a-b36a-5e70cf2866e6");
