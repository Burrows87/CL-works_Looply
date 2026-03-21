// ================= FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 1. GESTORE STATO (Il cuore dell'app)
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (user) {
        console.log("Utente riconosciuto:", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcomeTitle) welcomeTitle.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("Nessun utente loggato.");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    if (loader) loader.style.display = "none";
});

// 2. CATTURA IL RISULTATO DEL REDIRECT (Fondamentale!)
// Questo pezzo di codice "pesca" l'utente che torna da Google
auth.getRedirectResult()
    .then((result) => {
        if (result.user) {
            console.log("Login riuscito dopo il ritorno:", result.user.displayName);
            // Non serve fare altro, onAuthStateChanged si accorgerà di lui
        }
    })
    .catch((error) => {
        console.error("Errore nel recupero login:", error.code, error.message);
        if(error.code !== "auth/none") alert("Errore: " + error.message);
    });

// 3. FUNZIONE LOGIN
window.startLogin = function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    auth.signInWithRedirect(provider);
};

// 4. LOGOUT
window.logout = function() {
    auth.signOut().then(() => {
        window.location.reload();
    });
};
