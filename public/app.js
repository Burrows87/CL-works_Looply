import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc, setDoc, updateDoc, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// --- 1. CONFIGURAZIONE ---
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.appspot.com",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 2. STATO ---
let isLoggingOut = false;
let regSelectedDays = [];

// --- 3. AUTENTICAZIONE E CARICAMENTO ---
onAuthStateChanged(auth, async (user) => {
    const loginSc = document.getElementById('login-screen');
    const regSc = document.getElementById('registration-screen');
    const dashSc = document.getElementById('dashboard-screen');
    const userDisp = document.getElementById('user-display-name');

    // Leggiamo l'eventuale invito dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const refInvitante = urlParams.get('ref');

    if (user && !isLoggingOut) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            // --- NUOVO: SE C'È UN INVITO, COLLEGA L'AMICO AL PROFILO ---

            // --- LOGICA DI COLLEGAMENTO POTENZIATA ---
if (refInvitante && userDoc.exists()) {
    const mioNumero = userDoc.data().telefono;
    let iMieiAmici = userDoc.data().mieiAmici || [];

    // 1. Aggiungo chi mi ha invitato alla MIA lista
    if (!iMieiAmici.includes(refInvitante)) {
        iMieiAmici.push(refInvitante);
        await updateDoc(userRef, { mieiAmici: iMieiAmici });
        console.log("Ho aggiunto il mio amico!");
    }

    // 2. RECIPROCITÀ: Aggiungo ME STESSO alla lista del mio amico
    // Cerchiamo l'amico nel DB tramite il suo numero (refInvitante)
    const qAmico = query(collection(db, "users"), where("telefono", "==", refInvitante));
    const snapAmico = await getDocs(qAmico);
    
    snapAmico.forEach(async (docAmico) => {
        let listaAmico = docAmico.data().mieiAmici || [];
        if (!listaAmico.includes(mioNumero)) {
            listaAmico.push(mioNumero);
            await updateDoc(doc(db, "users", docAmico.id), { mieiAmici: listaAmico });
            console.log("Il mio amico ora ha anche me in lista!");
        }
    });
}
            


            if (userDoc.exists() && userDoc.data().nome) {
                const dati = userDoc.data();
                
                // UI Switch
                loginSc.style.display = 'none';
                regSc.style.display = 'none';
                dashSc.style.display = 'block';
                userDisp.textContent = dati.nome;

                // 1. Applica Colore Tema
                if (dati.temaColore) {
                    document.documentElement.style.setProperty('--primary-color', dati.temaColore);
                    document.querySelector(`.color-dot[data-color="${dati.temaColore}"]`)?.classList.add('selected');
                }

                // 2. Filtro Giorni Preferiti
                document.querySelectorAll('.day-group').forEach(group => group.style.display = 'none');
                if (dati.giorniPreferiti) {
                    dati.giorniPreferiti.forEach(giorno => {
                        const giornoBox = document.getElementById(`btn-${giorno}`)?.closest('.day-group');
                        if (giornoBox) giornoBox.style.display = 'block';
                        document.querySelector(`.set-day-btn[data-day="${giorno}"]`)?.classList.add('selected');
                    });
                }
            } else {
                loginSc.style.display = 'none';
                dashSc.style.display = 'none';
                regSc.style.display = 'block';
            }
        } catch(e) { console.error("Errore caricamento user:", e); }
    } else {
        loginSc.style.display = 'flex';
        dashSc.style.display = 'none';
        regSc.style.display = 'none';
    }
});


// --- 4. GESTIONE CLICK GLOBALE ---
window.addEventListener('click', async (e) => {
    // --- AGGIUNGI QUESTO DENTRO IL WINDOW LISTENER DEL PUNTO 4 ---

// Gestione click sul tasto "COLLEGA I TUOI 5 AMICI"
if (e.target.id === 'btn-collega-amici' || e.target.closest('#btn-collega-amici')) {
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const u = userSnap.data();
    
    // Generiamo il link che contiene il tuo numero
    const linkApp = `${window.location.origin}/?ref=${u.telefono}`;
    const msg = `Ciao! Entra su Looply da questo link così l'app ci collega. Se saremo liberi negli stessi orari, scatterà il Match! 🔥\n\n${linkApp}`;
    
    // Apre WhatsApp per permetterti di scegliere i 5 amici
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}
    
    
    // CAMBIO COLORE
    if (e.target.classList.contains('color-dot')) {
        const newColor = e.target.dataset.color;
        document.documentElement.style.setProperty('--primary-color', newColor);
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        e.target.classList.add('selected');
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { temaColore: newColor });
    }

    // LOGIN
    if (e.target.closest('#btn-google-login')) {
        if (!document.getElementById('check-terms').checked || !document.getElementById('check-privacy').checked) {
            return alert("Accetta Termini e Privacy!");
        }
        await signInWithPopup(auth, provider);
    }

    // LOGOUT
    if (e.target.id === 'btn-logout') {
        isLoggingOut = true;
        await signOut(auth);
        location.reload();
    }

    // TOGGLE GIORNI DASHBOARD
    if (e.target.classList.contains('day-toggle')) {
        e.target.classList.toggle('active');
        const dayId = e.target.id.replace('btn-', '');
        const sDiv = document.getElementById(`slots-${dayId}`);
        if (sDiv) sDiv.style.display = e.target.classList.contains('active') ? 'flex' : 'none';
    }

    // SELEZIONE SLOT
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }

    // APRI SETTINGS
    if (e.target.id === 'btn-open-settings' || e.target.closest('#btn-open-settings')) {
        const panel = document.getElementById('settings-panel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    }

    // CAMBIO GIORNI (SETTINGS)
    if (e.target.classList.contains('set-day-btn')) {
        const day = e.target.dataset.day;
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        let giorni = userSnap.data().giorniPreferiti || [];

        if (giorni.includes(day)) {
            giorni = giorni.filter(d => d !== day);
        } else if (giorni.length < 3) {
            giorni.push(day);
        } else {
            return alert("Massimo 3 giorni!");
        }
        await updateDoc(userRef, { giorniPreferiti: giorni });
        location.reload(); 
    }

    // REGISTRAZIONE GIORNI (INITIAL)
    if (e.target.classList.contains('reg-day-btn')) {
        const day = e.target.dataset.day;
        if (regSelectedDays.includes(day)) {
            regSelectedDays = regSelectedDays.filter(d => d !== day);
            e.target.classList.remove('selected');
        } else if (regSelectedDays.length < 3) {
            regSelectedDays.push(day);
            e.target.classList.add('selected');
        }
    }
});

// --- 5. SALVATAGGIO ---

// Salva Profilo con gestione Ref

document.getElementById('btn-save-profile').onclick = async () => {
    const nome = document.getElementById('reg-name').value;
    // .replace(/\D/g, '') toglie tutto ciò che non è un numero (spazi, +, trattini)
    const telRaw = document.getElementById('reg-phone').value.replace(/\D/g, '');
    
    if (!nome || !telRaw || regSelectedDays.length === 0) return alert("Dati incompleti!");

    // Standardizziamo il numero con il 39
    const telefonoFinale = telRaw.startsWith('39') ? telRaw : '39' + telRaw;

    // Recuperiamo il ref dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const refInvitante = urlParams.get('ref');
    let listaAmici = refInvitante ? [refInvitante] : [];

    await setDoc(doc(db, "users", auth.currentUser.uid), {
        nome: nome,
        telefono: telefonoFinale,
        giorniPreferiti: regSelectedDays,
        uid: auth.currentUser.uid,
        temaColore: "#4285F4",
        mieiAmici: listaAmici 
    });

    // Se c'è un ref, dobbiamo anche aggiungere questo nuovo utente alla lista dell'invitante
    if (refInvitante) {
        const qAmico = query(collection(db, "users"), where("telefono", "==", refInvitante));
        const snapAmico = await getDocs(qAmico);
        snapAmico.forEach(async (docAmico) => {
            let listaAmico = docAmico.data().mieiAmici || [];
            if (!listaAmico.includes(telefonoFinale)) {
                listaAmico.push(telefonoFinale);
                await updateDoc(doc(db, "users", docAmico.id), { mieiAmici: listaAmico });
            }
        });
    }

    location.reload();
};




document.getElementById('btn-save-event').onclick = async () => {
    const sel = [];
    document.querySelectorAll('.slot-btn.selected').forEach(b => {
        sel.push({ giorno: b.dataset.day, fascia: b.textContent.trim() });
    });

    if (sel.length === 0) return alert("Seleziona i tuoi orari!");
    
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const u = userSnap.data();
    const rubricaLooply = u.mieiAmici || [];

    // 1. Salva la tua disponibilità (senza avvisare nessuno)
    await addDoc(collection(db, "eventi"), {
        nomeCreatore: u.nome,
        telefonoCreatore: u.telefono,
        creatoDa: auth.currentUser.uid,
        slot: sel,
        dataCreazione: new Date()
    });

    // 2. CERCA IL MATCH (Logica Tinder)
    const q = query(collection(db, "eventi"), where("creatoDa", "!=", auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    let matchTrovato = null;

    querySnapshot.forEach((doc) => {
        const altro = doc.data();
        // Controlla se l'utente è tra i tuoi "collegati"
        if (rubricaLooply.includes(altro.telefonoCreatore)) {
            sel.forEach(mio => {
                altro.slot.forEach(suo => {
                    if (mio.giorno === suo.giorno && mio.fascia === suo.fascia) {
                        matchTrovato = { nome: altro.nomeCreatore, tel: altro.telefonoCreatore, g: mio.giorno, f: mio.fascia };
                    }
                });
            });
        }
    });

    // 3. IL MOMENTO DEL MATCH
    // ... parte finale del match
    if (matchTrovato) {
        // EFFETTO TINDER: Popup solo se c'è match
        alert(`🔥 IT'S A MATCH!\nTu e ${matchTrovato.nome} siete liberi il ${matchTrovato.g} (${matchTrovato.f})!`);
        
        const msgMatch = `Ehi ${matchTrovato.nome}! Match su Looply! Siamo entrambi liberi ${matchTrovato.g} (${matchTrovato.f}). Ci vediamo? 🚀`;
        
        // Apre la chat singola dell'amico
        window.open(`https://wa.me/${matchTrovato.tel}?text=${encodeURIComponent(msgMatch)}`, '_blank');
        location.reload();
    } else {
        // Se non c'è match, l'app torna alla home in silenzio
        alert("Disponibilità salvata! Ti avviserò appena un tuo amico combacia.");
        location.reload();
    }
};



