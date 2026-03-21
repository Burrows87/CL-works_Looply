// 1. CONFIGURAZIONE (Verificata: AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU)
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("Firebase inizializzato correttamente");
} catch (e) {
    alert("Errore configurazione Firebase: " + e.message);
}

const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. FUNZIONE DI LOGIN (REDIRECT) ---
// La colleghiamo a window per essere sicuri che l'HTML la veda sempre
window.startLogin = function() {
    console.log("Pulsante cliccato, avvio redirect...");
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Forza la scelta dell'account ogni volta
    provider.setCustomParameters({ prompt: 'select_account' });

    auth.signInWithRedirect(provider).catch(function(error) {
        console.error("Errore login:", error);
        alert("Errore durante l'accesso: " + error.message);
    });
};

// --- 3. GESTORE DELLO STATO UTENTE ---
auth.onAuthStateChanged(function(user) {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const loader = document.getElementById("loader");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        console.log("Utente loggato:", user.displayName);
        
        // Switch Interfaccia
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";
        
        // Saluto
        if (welcome) {
            const nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
            welcome.innerHTML = "Ciao " + nome + " 🤙🏻";
        }
    } else {
        console.log("Nessun utente loggato");
        if (loginDiv) loginDiv.style.display = "block";
        if (appDiv) appDiv.style.display = "none";
    }

    // Nascondi il caricamento iniziale dopo che Firebase ha risposto
    if (loader) {
        loader.style.display = "none";
    }
});

// Gestione ritorno dal redirect (per catturare errori specifici di Google)
auth.getRedirectResult().then(function(result) {
    if (result.user) {
        console.log("Ritorno da Google avvenuto con successo!");
    }
}).catch(function(error) {
    if (error.code === 'auth/operation-not-allowed') {
        alert("Errore: Il login con Google non è abilitato nella console Firebase!");
    } else if (error.code === 'auth/invalid-api-key') {
        alert("Errore: La chiave API non è valida o è ristretta male.");
    } else {
        console.error("Errore Redirect Result:", error);
    }
});

// --- 4. LOGOUT ---
window.logout = function() {
    auth.signOut().then(function() {
        window.location.reload();
    }).catch(function(error) {
        alert("Errore durante il logout: " + error.message);
    });
};
