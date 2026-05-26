import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do projeto Firebase (identificadores públicos — segurança vem das Regras do Firestore)
const firebaseConfig = {
  apiKey: "AIzaSyDFxX8Gcmms-gKCMHIohvtZTccenTlR7wE",
  authDomain: "glicolog-24d9a.firebaseapp.com",
  projectId: "glicolog-24d9a",
  storageBucket: "glicolog-24d9a.firebasestorage.app",
  messagingSenderId: "1075734808666",
  appId: "1:1075734808666:web:6937831f4c347c53ca7063",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
