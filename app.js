// 1. CONFIGURAZIONE (Assicurati che i dati siano identici a questi)
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Funzione per mostrare errori a video (Debug per mobile)
function debugLog(msg) {
    console.log(msg);
    const logDiv = document.createElement("div");
    logDiv.style.cssText = "position:fixed;bottom:0;left:0;width:100%;background:rgba(0,0,0,0.8);color:white;font-size:10px;padding:5px;z-index:9999;word-break:break-all;";
    logDiv.innerText = msg;
    document.body.appendChild(logDiv);
}

// 2. INIZIALIZZAZIONE
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (e) {
    debugLog("Errore Init: " + e.message);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 3. FUNZIONE DI LOGIN (REDIRECT)
window.startLogin = function() {
    debugLog("Avvio login...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    auth.signInWithRedirect(provider).catch(err => {
        debugLog("Errore Tasto: " + err.code);
        alert("Errore: " + err.message);
    });
};

// 4. GESTORE DELLO STATO (Cosa succede all'avvio e dopo il login)
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        debugLog("
