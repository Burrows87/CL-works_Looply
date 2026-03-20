// TEST IMMEDIATO: Se carichi la pagina e NON vedi questo avviso, 
// significa che il file app.js non è collegato bene nell'HTML!
alert("Looply JS Caricato con successo!");

const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione forzata
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// FUNZIONE DI LOGIN (ACCESSIBILE DA OVUNQUE)
window.startLogin = function() {
    console.log("Tentativo di login...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Utente loggato:", result.user.displayName);
        })
        .catch((error) => {
            alert("Errore Firebase: " + error.message);
        });
};

// GESTORE DELLO STATO (MOSTRA/NASCONDE LE PAGINE)
auth.onAuthStateChanged((user) => {
    const loginPage = document.getElementById("formLogin");
    const appPage = document.getElementById("app");

    if (user) {
        if(loginPage) loginPage.style.display = "none";
        if(appPage) appPage.style.display = "block";
        document.body.style.backgroundColor = "white"; // Reset colore
        caricaProfilo(user);
    } else {
        if(loginPage) loginPage.style.display = "flex";
        if(appPage) appPage.style.display = "none";
    }
});

async function caricaProfilo(user) {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) {
        document.getElementById("onboardingModal").style.display = "flex";
    } else {
        document.getElementById("userName").innerText = doc.data().displayName;
    }
}
