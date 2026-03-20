// 1. CONFIGURAZIONE
const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",  AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b",
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. LOGIN CON REDIRECT (Evita i blocchi popup)
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
};

// 3. IL CONTROLLO ANTI-LOOP
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        console.log("Utente loggato:", user.uid);
        
        try {
            // Proviamo a leggere il database
            const doc = await db.collection("users").doc(user.uid).get();
            
            // Se arriviamo qui, il database risponde!
            if (loginDiv) loginDiv.style.display = "none";
            if (appDiv) appDiv.style.display = "block";

            if (doc.exists && doc.data().displayName) {
                // Utente già registrato
                applicaLingua(doc.data().displayName, doc.data().lang || 'it');
                caricaDati();
            } else {
                // Nuovo utente: mostra onboarding
                document.getElementById("onboardingModal").style.display = "flex";
            }
        } catch (error) {
            console.error("Errore Database:", error);
            alert("Errore accesso Database. Hai attivato Firestore in 'Test Mode'?");
            // NON rimandiamo al login qui, altrimenti va in loop!
        }
    } else {
        // Nessun utente: mostra login
        if (loginDiv) loginDiv.style.display = "flex";
        if (appDiv) appDiv.style.display = "none";
    }
});

// --- FUNZIONI AGGIUNTIVE (Copiale tutte) ---

window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const lingua = document.getElementById("selectLingua").value;
    if (nome.length < 2) return;
    
    await db.collection("users").doc(auth.currentUser.uid).set({
        displayName: nome, lang: lingua, availability: {}
    }, { merge: true });
    
    document.getElementById("onboardingModal").style.display = "none";
    applicaLingua(nome, lingua);
};

function applicaLingua(nome, lingua) {
    const welcome = lingua === 'it' ? "Ciao" : "Hi";
    document.getElementById("welcomeTitle").innerText = `${welcome} ${nome} 🤙🏻`;
}

window.logout = () => auth.signOut().then(() => location.reload());
