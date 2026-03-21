const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// FORZA LA MEMORIA DEL LOGIN
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// --- GESTIONE RITORNO DA GOOGLE ---
auth.getRedirectResult().then((result) => {
    if (result.user) {
        console.log("Login agganciato dal redirect!", result.user.displayName);
    }
}).catch((error) => {
    console.error("Errore nel recupero redirect:", error.code);
});

// --- CONTROLLO STATO IN TEMPO REALE ---
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (user) {
        console.log("Stato: LOGGATO VERAMENTE -", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcomeTitle) welcomeTitle.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("Stato: Non loggato");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    
    if (loader) loader.style.display = "none";
});

// FUNZIONE TASTO
window.startLogin = function() {
    console.log("Avvio Redirect...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
};

// LOGOUT
window.logout = function() {
    auth.signOut().then(() => window.location.reload());
};
