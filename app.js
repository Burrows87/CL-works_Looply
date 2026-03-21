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

// Persistenza login (fondamentale)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ================= DEBUG (mobile) =================
function debugLog(msg) {
    console.log(msg);

    const logDiv = document.createElement("div");
    logDiv.style.cssText = `
        position:fixed;
        bottom:0;
        left:0;
        width:100%;
        background:rgba(0,0,0,0.8);
        color:white;
        font-size:10px;
        padding:5px;
        z-index:9999;
        word-break:break-all;
    `;
    logDiv.innerText = msg;
    document.body.appendChild(logDiv);
}

// ================= LOGIN =================
window.startLogin = function () {
    debugLog("Click login");

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    auth.signInWithPopup(provider)
        .then((result) => {
            debugLog("Login OK: " + result.user.displayName);
        })
        .catch((error) => {
            debugLog("Errore login: " + error.code);
            alert(error.message);
        });
};

// ================= AUTH STATE =================
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const app
