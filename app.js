// ================= FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// ================= INIT =================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Persistenza login
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ================= DEBUG (mobile) =================
function debugLog(msg) {
    console.log(msg);
    const logDiv = document.getElementById("debug-console") || document.createElement("div");
    logDiv.id = "debug-console";
    logDiv.style.cssText = "position:fixed;bottom:0;left:0;width:100%;background:rgba(0,0,0,0.8);color:white;font-size:10px;padding:5px;z-index:9999;word-break:break-all;max-height:100px;overflow:auto;";
    logDiv.innerText += "\n> " + msg;
    if(!document.getElementById("debug-console")) document.body.appendChild(logDiv);
}

// ================= LOGIN =================
window.startLogin = function () {
    debugLog("Avvio login...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // Su GitHub Pages è SEMPRE meglio usare Redirect invece di Popup per evitare blocchi browser
    auth.signInWithRedirect(provider);
};

// Gestione ritorno da Redirect
auth.getRedirectResult().then((result) => {
    if (result.user) debugLog("Bentornato " + result.user.displayName);
}).catch((error) => {
    if(error.code !== "auth/none") debugLog("Errore redirect: " + error.code);
});

// ================= AUTH STATE (Qui c'era l'errore!) =================
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (user) {
        debugLog("Stato: Loggato");
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcomeTitle) welcomeTitle.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        debugLog("Stato: Non loggato");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }

    // Nascondi loader
    if (loader) loader.style.display = "none";
});

// ================= LOGOUT =================
window.logout = function() {
    auth.signOut().then(() => {
        window.location.reload();
    });
};

// Protezione finale: se dopo 5 secondi il loader è ancora lì, forzo la chiusura
setTimeout(() => {
    const loader = document.getElementById("loader");
    if(loader && loader.style.display !== "none") {
        loader.style.display = "none";
        debugLog("Loader rimosso per timeout");
    }
}, 5000);
