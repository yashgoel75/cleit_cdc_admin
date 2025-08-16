"use client"

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBHXlwW4vu69EgrDEvoQn9IXTa0RNB3pHc",
    authDomain: "cleit-cdc-admin.firebaseapp.com",
    projectId: "cleit-cdc-admin",
    storageBucket: "cleit-cdc-admin.firebasestorage.app",
    messagingSenderId: "396869268763",
    appId: "1:396869268763:web:730054af9e8a934e884fbe",
    measurementId: "G-ZG26M92Y5Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, storage }; 
