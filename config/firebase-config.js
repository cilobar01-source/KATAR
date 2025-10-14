// ===================================================
// 🔥 Firebase Configuration - Portal Karang Taruna RT01/RW08 (v4.1)
// ===================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgJC8OQBG_wQt57tZHfNuVKPb2VVlAalI",
  authDomain: "karang-taruna-aadaf.firebaseapp.com",
  projectId: "karang-taruna-aadaf",
  storageBucket: "karang-taruna-aadaf.appspot.com",
  messagingSenderId: "367208001887",
  appId: "1:367208001887:web:bce5982d99edefb7e746ea"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
