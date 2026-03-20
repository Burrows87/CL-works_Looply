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

// --- NAVIGAZIONE ---
window.openSettings = () => {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("settingsPage").classList.remove("hidden");
};

window.closeSettings = () => {
  document.getElementById("settingsPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
};

// --- GESTIONE AUTH ---
auth.onAuthStateChanged(async (user) => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");
  const settingsDiv = document.getElementById("settingsPage");

  if (user) {
    currentUser = user.uid;
    formLogin.classList.add("hidden");
    appDiv.classList.remove("hidden");
    
    // Info Profilo
    document.getElementById("welcomeTitle").innerText = `Ciao ${user.displayName.split(' ')[0]}!`;
    document.getElementById("userName").innerText = user.displayName;
    document.getElementById("userEmail").innerText = user.email;
    if (user.photoURL) {
      const img = document.getElementById("userPhoto");
      img.src = user.photoURL;
      img.style.display = "block";
    }
    await caricaDati();
  } else {
    currentUser = null;
    formLogin.classList.remove("hidden");
    appDiv.classList.add("hidden");
    settingsDiv.classList.add("hidden");
  }
});

document.getElementById("googleBtn").addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    await db.collection("users").doc(result.user.uid).set({
      name: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) { console.error(e); }
});

// --- LOGICA INTERFACCIA GIORNI ---
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => toggleDay(btn.dataset.day, true));
});

function toggleDay(day, isManual = false) {
  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);
  
  if (isManual) selectedDays[day] = !selectedDays[day];
  else selectedDays[day] = true;

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
    // LOGICA RICHIESTA: Se attivato manualmente, metti il flag su "Sempre"
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

// GESTIONE SMART CHECKBOX (Incrocio tra Sempre e Fasce)
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

// --- SALVATAGGIO / CARICAMENTO ---
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
  } catch (e) { alert("Errore"); btn.innerText = "Salva disponibilità"; }
};

function getCheckedValues(day) {
  if (!selectedDays[day]) return null;
  const container = document.getElementById(`${day}-slots`);
  const vals = Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
  return vals.length > 0 ? vals : null;
}

async function caricaDati() {
  const doc = await db.collection("users").doc(currentUser).get();
  if (doc.exists && doc.data().availability) {
    const av = doc.data().availability;
    for (const d in av) {
      if (av[d]) {
        toggleDay(d, false);
        const container = document.getElementById(`${d}-slots`);
        container.querySelectorAll("input").forEach(cb => {
          if (av[d].includes(cb.value)) cb.checked = true;
        });
      }
    }
  }
}

window.logout = () => auth.signOut().then(() => location.reload());
