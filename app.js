// 1. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// 2. NAVIGAZIONE (GLOBALIZZATA PER L'HTML)
window.openSettings = function() {
  console.log("Apertura Impostazioni...");
  document.getElementById("app").style.display = "none";
  document.getElementById("settingsPage").style.display = "block";
};

window.closeSettings = function() {
  console.log("Chiusura Impostazioni...");
  document.getElementById("settingsPage").style.display = "none";
  document.getElementById("app").style.display = "block";
};

// 3. GESTIONE AUTH
auth.onAuthStateChanged(async (user) => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");
  const settingsDiv = document.getElementById("settingsPage");

  if (user) {
    currentUser = user.uid;
    formLogin.style.display = "none";
    appDiv.style.display = "block";
    
    // Aggiornamento Profilo
    const name = user.displayName ? user.displayName.split(' ')[0] : "Utente";
    document.getElementById("welcomeTitle").innerText = "Ciao " + name + "!";
    document.getElementById("userName").innerText = user.displayName || "Utente";
    document.getElementById("userEmail").innerText = user.email;
    
    if (user.photoURL) {
      const img = document.getElementById("userPhoto");
      img.src = user.photoURL;
      img.style.display = "block";
    }
    await caricaDati();
  } else {
    currentUser = null;
    formLogin.style.display = "block";
    appDiv.style.display = "none";
    settingsDiv.style.display = "none";
  }
});

// Login Google
document.getElementById("googleBtn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => console.error("Errore login:", e));
});

// 4. LOGICA GIORNI E SMART FLAGS
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => toggleDay(btn.dataset.day, true));
});

function toggleDay(day, isManual = false) {
  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(day + "-slots");
  
  if (isManual) selectedDays[day] = !selectedDays[day];
  else selectedDays[day] = true;

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
    if (isManual) {
      const alwaysCb = slots.querySelector('input[value="any"]');
      alwaysCb.checked = true;
      slots.querySelectorAll('input:not([value="any"])').forEach(i => i.checked = false);
    }
  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");
    slots.querySelectorAll("input").forEach(i => i.checked = false);
  }
}

// Gestione incrocio Sempre vs Fasce Orarie
document.querySelectorAll('.slots').forEach(container => {
  container.addEventListener('change', (e) => {
    const clicked = e.target;
    const alwaysCb = container.querySelector('input[value="any"]');
    const fasceCbs = container.querySelectorAll('input:not([value="any"])');
    if (clicked.value === "any") {
      if (clicked.checked) fasceCbs.forEach(i => i.checked = false);
    } else {
      if (clicked.checked) alwaysCb.checked = false;
    }
  });
});

// 5. SALVATAGGIO / CARICAMENTO FIRESTORE
window.saveAvailability = async () => {
  const btn = document.getElementById("btnSave");
  const av = {
    venerdi: getCheckedValues("venerdi"),
    sabato: getCheckedValues("sabato"),
    domenica: getCheckedValues("domenica")
  };
  try {
    btn.innerText = "Salvataggio...";
    await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
    btn.innerText = "Salva disponibilità";
    alert("✅ Disponibilità salvata!");
  } catch (e) { 
    alert("Errore nel salvataggio"); 
    btn.innerText = "Salva disponibilità"; 
  }
};

function getCheckedValues(day) {
  if (!selectedDays[day]) return null;
  const container = document.getElementById(day + "-slots");
  const values = Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
  return values.length > 0 ? values : null;
}

async function caricaDati() {
  const doc = await db.collection("users").doc(currentUser).get();
  if (doc.exists && doc.data().availability) {
    const av = doc.data().availability;
    for (const d in av) {
      if (av[d]) {
        toggleDay(d, false);
        const container = document.getElementById(d + "-slots");
        container.querySelectorAll("input").forEach(cb => {
          if (av[d].includes(cb.value)) cb.checked = true;
        });
      }
    }
  }
}

window.logout = () => auth.signOut().then(() => location.reload());
window.loginEmail = () => alert("Accedi con Google!");
