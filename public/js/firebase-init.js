import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = window.__FIREBASE_CONFIG__ || {
  apiKey: "AIzaSyCGttdntn43ZHxoOj6R11HVyeFh5GwmsdQ",
  authDomain: "goated-auction-2b1d8.firebaseapp.com",
  databaseURL: "https://goated-auction-2b1d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "goated-auction-2b1d8",
  storageBucket: "goated-auction-2b1d8.firebasestorage.app",
  messagingSenderId: "340389456470",
  appId: "1:340389456470:web:b6af3e6bd6ea9de45029f7",
  measurementId: "G-FDRJZEGYW1"
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

export { firebaseApp, database };
