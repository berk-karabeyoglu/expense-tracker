// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuMYYuTr8jhRNzZ0PhiHvLL-M8f4pisFo",
  authDomain: "expense-tracker-7d257.firebaseapp.com",
  projectId: "expense-tracker-7d257",
  storageBucket: "expense-tracker-7d257.appspot.com",
  messagingSenderId: "352174102029",
  appId: "1:352174102029:web:1df5ab1f130601922ce744",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
