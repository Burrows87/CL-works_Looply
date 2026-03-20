// ================= CONFIGURAZIONE =================
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

// ================= GESTIONE SESSIONE =================
auth.onAuthStateChanged(async (user) => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");
  if (user) {
    currentUser = user.uid;
    formLogin.classList.add("hidden");
    appDiv.classList.remove("hidden");
    await caricaDati();
  } else {
    currentUser = null;
    formLogin.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// ================= LOGIN GOOGLE =================
document.getElementById("googleBtn").addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    await db.collection("users").doc(result.user.uid).set({
      name: result.user.displayName,
      email: result.user.email,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) { console.error(e); }
});

// ================= LOGICA INTERFACCIA =================

// Click sui bottoni dei giorni
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const day = btn.dataset.day;
    toggleDay(day, true); // true = attiva flag automatico
  });
});

function toggleDay(day, isManualClick = false) {
  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);
  
  // Se è un caricamento dati, forziamo selectedDays a true
  if (!isManualClick) selectedDays[day] = true; 
  else selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
    
    // Se clicco manualmente il giorno per attivarlo:
    if (isManualClick) {
        const anyCb = slots.querySelector('input[value="any"]');
        anyCb.checked = true; // Flaggato in automatico
        // Pulisce le altre fasce
        slots.querySelectorAll('input:not([value="any"])').forEach(i => i.checked = false);
    }
  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");
    slots.querySelectorAll("input").forEach(i => i.checked = false);
  }
}

// Gestione intelligente dei Checkbox (Scambio Tutto vs Fasce)
document.querySelectorAll('.slots').forEach(container => {
  container.addEventListener('change', (e) => {
    const clicked = e.target;
    const anyCb = container.querySelector('input[value="any"]');
    const fasceCbs = container.querySelectorAll('input:not([value="any"])');

    if (clicked.value === "any") {
      if (clicked.checked) fasceCbs.forEach(i => i.checked = false);
    } else {
      if (clicked.checked) anyCb.checked = false;
    }
  });
});

// ================= SALVATAGGIO / CARICAMENTO =================

window.saveAvailability = async () => {
  const av = {
    venerdi: getCheckedValues("venerdi"),
    sabato: getCheckedValues("sabato"),
    domenica: getCheckedValues("domenica")
  };

  try {
    await db.collection("users").doc(currentUser).set({ 
      availability: av,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    alert("✅ Salvato correttamente!");
  } catch (e) { alert("Errore durante il salvataggio."); }
};

function getCheckedValues(day) {
  if (!selectedDays[day]) return null;
  const container = document.getElementById(`${day}-slots`);
  const checked = Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
  return checked.length > 0 ? checked : null;
}

async function caricaDati() {
  try {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists && doc.data().availability) {
      const av = doc.data().availability;
      for (const d in av) {
        if (av[d] && av[d].length > 0) {
          toggleDay(d, false); // Attiva interfaccia senza reset manuale
          const container = document.getElementById(`${d}-slots`);
          container.querySelectorAll("input").forEach(cb => {
            if (av[d].includes(cb.value)) cb.checked = true;
          });
        }
      }
    }
  } catch (e) { console.error("Errore caricamento:", e); }
}

window.logout = () => auth.signOut().then(() => location.reload());
window.loginEmail = () => alert("Effettua il login con Google.");
