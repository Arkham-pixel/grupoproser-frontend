import { initializeApp } from "firebase/app";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDh2N5t1JKx-NgiVtiXiQ6gQrcoGgRaZKQ",
  authDomain: "grupo-proser-1741991464708.firebaseapp.com",
  projectId: "grupo-proser-1741991464708",
  storageBucket: "grupo-proser-1741991464708.appspot.com", // <-- Corrige aquí
  messagingSenderId: "331095961149",
  appId: "1:331095961149:web:37fc8d76ac579afa1dc454"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

export default app;