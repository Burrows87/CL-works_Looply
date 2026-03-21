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

// 1. CATTURA IL RISULTATO DEL LOGIN DOPO IL RITORNO (IL PEZZO MANCANTE)
auth.getRedirectResult()
    .then((result) => {
        if (result.user) {
            console.log("✅ Login agganciato con successo!");
        }
    })
    .catch((error) => {
        console.error("Errore nel recupero redirect:", error.message);
    });

// 2. GESTORE STATO UTENTE
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (user) {
        console.log("✅ STATO: LOGGATO COME", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcomeTitle) welcomeTitle.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("❌ STATO: NON LOGGATO");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    if (loader) loader.style.display = "none";
});

// 3. FUNZIONE TASTO LOGIN
window.startLogin = function () {
    console.log("🚀 Avvio Redirect...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
};

// 4. LOGOUT
window.logout = function() {
    auth.signOut().then(() => window.location.reload());
};
