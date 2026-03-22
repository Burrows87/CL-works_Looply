
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configurazione del tuo progetto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.appspot.com",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Elementi del DOM
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const userDisplayName = document.getElementById('user-display-name');
const btnLogin = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');

// Funzione Login
btnLogin.onclick = async () => {
    try {
        await signInWithPopup(auth, provider);
        console.log("Login effettuato con successo!");
    } catch (error) {
        console.error("Errore durante il login:", error.message);
        alert("Errore: " + error.message);
    }
};

// Funzione Logout
btnLogout.onclick = () => {
    signOut(auth).then(() => {
        console.log("Logout effettuato.");
    });
};

// Osservatore dello stato (Switch automatico delle schermate)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Utente loggato
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userDisplayName.innerText = user.displayName || "Utente";
    } else {
        // Utente non loggato
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
});
