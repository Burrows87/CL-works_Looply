// ================= FIREBASE INIT =================

const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7H8SUX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ================= SESSION =================

firebase.auth().onAuthStateChanged(user => {

  if (user) {
    currentUser = user.uid;

    console.log("Logged in:", user.email);

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } else {
    currentUser = null;

    document.getElementById("formLogin").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  }

});

// ================= GOOGLE LOGIN =================

function loginWithGoogle() {

  console.log("CLICK GOOGLE LOGIN");

  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then(async (result) => {

      const user = result.user;
      currentUser = user.uid;

      console.log("Login success:", user.email);

      await db.collection("users").doc(currentUser).set({
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date()
      }, { merge: true });

    })
    .catch(err => {
      console.error("Google login error:", err);
      alert(err.message);
    });

}

// Esponi globalmente (importante)
window.loginWithGoogle = loginWithGoogle;

// ================= EVENT LISTENER BOTTONI =================

document.addEventListener("DOMContentLoaded", () => {

  const googleBtn = document.getElementById("googleBtn");

  if (googleBtn) {
    googleBtn.addEventListener("click", loginWithGoogle);
  } else {
    console.error("googleBtn NON trovato nel DOM");
  }

});

// ================= DAYS =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleDay(btn.dataset.day);
    });
  });

  document.querySelectorAll(".slots").forEach(container => {

    const checkboxes = container.querySelectorAll("input");

    checkboxes.forEach(cb => {

      cb.addEventListener("change", () => {

        const always = container.querySelector(".always");

        if (cb.classList.contains("always") && cb.checked) {
          checkboxes.forEach(c => {
            if (c !== always) c.checked = false;
          });
        } else if (!cb.classList.contains("always") && cb.checked) {
          if (always) always.checked = false;
        }

        const anyChecked = Array.from(checkboxes).some(c => c.checked);

        if (!anyChecked && always) {
          always.checked = true;
        }

      });

    });

  });

});

// ================= TOGGLE DAY =================

function toggleDay(day) {

  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);

  selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");

    slots.querySelectorAll("input").forEach(cb => {
      cb.disabled = false;
      cb.checked = false;
    });

    const always = slots.querySelector(".always");
    if (always) always.checked = true;

  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");

    slots.querySelectorAll("input").forEach(cb => {
      cb.checked = false;
      cb.disabled = true;
    });
  }
}

window.toggleDay = toggleDay;

// ================= AVAILABILITY =================

function getAvailability() {

  function getDay(day) {

    if (!selectedDays[day]) return null;

    const container = document.getElementById(`${day}-slots`);

    const checked = Array.from(container.querySelectorAll("input:checked"))
      .map(cb => cb.value);

    return checked.length ? checked : ["any"];
  }

  return {
    venerdi: getDay("venerdi"),
    sabato: getDay("sabato"),
    domenica: getDay("domenica")
  };
}

// ================= SAVE =================

async function saveAvailability() {

  if (!currentUser) {
    alert("Utente non loggato");
    return;
  }

  const availability = getAvailability();

  try {
    await db.collection("users").doc(currentUser).set({
      availability
    }, { merge: true });

    alert("Disponibilità salvata");

  } catch (err) {
    console.error(err);
    alert("Errore salvataggio");
  }
}

window.saveAvailability = saveAvailability;
