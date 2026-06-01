/* ============================================
   admin.js — Clean Rebuild
   Firebase Auth + Firestore CRUD + Logout
   ============================================ */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  browserSessionPersistence,
  setPersistence
} from
  "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* ── Firebase init ── */
const firebaseConfig = {
  apiKey: "AIzaSyDw0XicCM2yKlgF535Y3ChI5_JU6QtpFLk",
  authDomain: "qr-docs-9dd35.firebaseapp.com",
  projectId: "qr-docs-9dd35",
  storageBucket: "qr-docs-9dd35.firebasestorage.app",
  messagingSenderId: "277495922261",
  appId: "1:277495922261:web:88e742806a4af3db95dedc"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* Force per-tab session storage — no sticky sessions, signOut always works */
setPersistence(auth, browserSessionPersistence).catch(() => {});

let currentUid = null;

/* ── Global logout — works with both onclick="window.logout()" AND addEventListener ── */
window.logout = function () {
  location.replace("admin-login.html?signout=1&t=" + Date.now());
};

/* ══════════════════════════════════════════
   AUTH GUARD
   ══════════════════════════════════════════ */
onAuthStateChanged(auth, user => {
  const onLoginPage = location.pathname.includes("admin-login") ||
                      location.href.includes("admin-login");

  if (onLoginPage) {
    /* If we arrived here via logout redirect, clear the session */
    if (user && location.search.includes("signout=1")) {
      signOut(auth).catch(() => {});
    }
    /* Wire up login-page buttons once DOM is ready */
    wireLoginPage();
    return;
  }

  /* Dashboard: not logged in → go to login */
  if (!user) {
    location.replace("admin-login.html");
    return;
  }

  /* Dashboard: logged in → load everything */
  currentUid = user.uid;
  wireDashboard();
});

/* ══════════════════════════════════════════
   LOGIN PAGE — wire buttons
   ══════════════════════════════════════════ */
let isRegisterMode = false;

function wireLoginPage() {
  const authBtn      = document.getElementById("authBtn");
  const toggleBtn    = document.getElementById("toggleAuthBtn");
  const forgotBtn    = document.getElementById("forgotBtn");

  if (!authBtn) return; // not on login page

  authBtn.addEventListener("click", handleAuth);
  if (toggleBtn) toggleBtn.addEventListener("click", toggleAuthMode);
  if (forgotBtn) forgotBtn.addEventListener("click", forgotPassword);
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  const title    = document.getElementById("formTitle");
  const authBtn  = document.getElementById("authBtn");
  const toggle   = document.getElementById("toggleAuthBtn");
  if (title)   title.innerText   = isRegisterMode ? "Register" : "Login";
  if (authBtn) authBtn.innerHTML = isRegisterMode
    ? "<i class='bi bi-person-plus-fill me-1'></i> Register"
    : "<i class='bi bi-box-arrow-in-right me-1'></i> Login";
  if (toggle)  toggle.innerText  = isRegisterMode
    ? "Already have an account? Login here."
    : "Need an account? Register here.";
}

async function handleAuth() {
  const alertEl = document.getElementById("loginAlert");
  if (alertEl) alertEl.style.display = "none";
  try {
    const email = document.getElementById("email").value.trim();
    const pwd   = document.getElementById("password").value;
    if (!email || !pwd) return;

    if (isRegisterMode) {
      await createUserWithEmailAndPassword(auth, email, pwd);
    } else {
      await signInWithEmailAndPassword(auth, email, pwd);
    }
    location.replace("admin-dashboard.html");
  } catch (e) {
    if (alertEl) {
      alertEl.style.display = "block";
      alertEl.innerText = e.message;
    } else {
      alert(e.message);
    }
  }
}

async function forgotPassword() {
  const email = document.getElementById("email")?.value?.trim();
  if (!email) return alert("Enter your email address first.");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent!");
  } catch (e) {
    alert(e.message);
  }
}

/* ══════════════════════════════════════════
   DASHBOARD — wire everything
   ══════════════════════════════════════════ */
function wireDashboard() {
  /* ── Logout button ── */
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      location.replace("admin-login.html?signout=1&t=" + Date.now());
    });
  }

  generateQRLink();
  loadProfile();
  loadContacts();
  loadDocuments();
}

/* ── Toast ── */
function showToast(msg) {
  const toast = document.getElementById("actionToast");
  const text  = document.getElementById("actionToastText");
  if (!toast || !text) return;
  text.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
window.showToast = showToast;

/* ══════════════════════════════════════════
   QR LINK
   ══════════════════════════════════════════ */
function generateQRLink() {
  const box = document.getElementById("qrLinkContainer");
  if (!box || !currentUid) return;
  const url    = `${location.origin}/index.html?id=${currentUid}`;
  const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  box.className = "card border-0 shadow-sm p-4 mb-4 text-center";
  box.innerHTML = `
    <h5 class="fw-bold text-primary mb-3"><i class="bi bi-qr-code-scan me-2"></i>Your Emergency QR Code</h5>
    <p class="text-muted small mb-3">Print this QR code and attach it to your helmet, ID card, or vehicle.</p>
    <div class="mb-3">
      <img src="${qrSrc}" alt="QR Code" class="img-thumbnail shadow" style="width:160px;height:160px;">
    </div>
    <span class="d-block text-muted small fw-bold mb-1">Your Public URL:</span>
    <a href="${url}" target="_blank" class="text-break">${url}</a>
  `;
}

/* ══════════════════════════════════════════
   PROFILE
   ══════════════════════════════════════════ */
let currentMedicalAlerts = [];

async function loadProfile() {
  if (!currentUid) return;
  const snap = await getDoc(doc(db, "users", currentUid));
  const d = snap.exists() ? snap.data() : {};

  setValue("name",       d.name       || "");
  setValue("bloodGroup", d.bloodGroup || "");
  setValue("address",    d.address    || "");
  setValue("mapsLink",   d.mapsLink   || "");

  currentMedicalAlerts = d.medicalAlerts || [];
  renderAlerts();

  const updated = document.getElementById("profileUpdated");
  if (updated && d.updatedAt) {
    updated.textContent = "Last updated: " + (d.updatedAt?.toDate()?.toLocaleString() || "N/A");
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function renderAlerts() {
  const list = document.getElementById("alertsList");
  if (!list) return;
  list.innerHTML = "";
  currentMedicalAlerts.forEach((text, i) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${text}</span>
      <button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>
    `;
    li.querySelector("button").onclick = () => {
      currentMedicalAlerts.splice(i, 1);
      renderAlerts();
      window.saveProfile(true);
    };
    list.appendChild(li);
  });
}
window.renderMedicalAlerts = renderAlerts;

window.addMedicalAlert = () => {
  const input = document.getElementById("newAlert");
  if (input && input.value.trim()) {
    currentMedicalAlerts.push(input.value.trim());
    input.value = "";
    renderAlerts();
    window.saveProfile(true);
  }
};

window.saveProfile = async (silent = false) => {
  if (!currentUid) return;
  await setDoc(doc(db, "users", currentUid), {
    name:          document.getElementById("name").value,
    bloodGroup:    document.getElementById("bloodGroup").value,
    address:       document.getElementById("address").value,
    mapsLink:      document.getElementById("mapsLink").value,
    medicalAlerts: currentMedicalAlerts,
    updatedAt:     serverTimestamp()
  }, { merge: true });
  if (!silent) showToast("Profile saved!");
  loadProfile();
};

/* ══════════════════════════════════════════
   CONTACTS
   ══════════════════════════════════════════ */
window.addContact = async () => {
  if (!currentUid) return;
  const label = document.getElementById("contactLabel");
  const phone = document.getElementById("contactPhone");
  if (!label || !phone || !label.value.trim() || !phone.value.trim()) return;
  await addDoc(collection(db, "users", currentUid, "contacts"), {
    label: label.value.trim(),
    phone: phone.value.trim(),
    updatedAt: serverTimestamp()
  });
  label.value = "";
  phone.value = "";
  showToast("Contact added!");
  loadContacts();
};

async function loadContacts() {
  if (!currentUid) return;
  const list = document.getElementById("contactsList");
  if (!list) return;
  list.innerHTML = "";
  const snap = await getDocs(collection(db, "users", currentUid, "contacts"));
  snap.forEach(d => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.innerHTML = `
      <div class="row g-2">
        <div class="col-md-5"><input class="form-control" value="${d.data().label || ''}" placeholder="Label"></div>
        <div class="col-md-5"><input class="form-control" value="${d.data().phone || ''}" placeholder="Phone"></div>
        <div class="col-md-2 d-flex gap-1">
          <button class="btn btn-sm btn-success flex-fill" title="Save"><i class="bi bi-check-lg"></i></button>
          <button class="btn btn-sm btn-danger flex-fill" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>`;
    li.querySelector(".btn-success").onclick = async () => {
      await updateDoc(doc(db, "users", currentUid, "contacts", d.id), {
        label: li.querySelectorAll("input")[0].value,
        phone: li.querySelectorAll("input")[1].value
      });
      showToast("Contact updated!");
    };
    li.querySelector(".btn-danger").onclick = async () => {
      await deleteDoc(doc(db, "users", currentUid, "contacts", d.id));
      showToast("Contact deleted!");
      loadContacts();
    };
    list.appendChild(li);
  });
}

/* ══════════════════════════════════════════
   DOCUMENTS
   ══════════════════════════════════════════ */
window.addDocument = async () => {
  if (!currentUid) return;
  const title = document.getElementById("docTitle");
  const link  = document.getElementById("docLink");
  if (!title || !link || !title.value.trim() || !link.value.trim()) return;
  await addDoc(collection(db, "users", currentUid, "documents"), {
    title:   title.value.trim(),
    fileUrl: link.value.trim(),
    updatedAt: serverTimestamp()
  });
  title.value = "";
  link.value  = "";
  showToast("Document added!");
  loadDocuments();
};

async function loadDocuments() {
  if (!currentUid) return;
  const list = document.getElementById("documentsList");
  if (!list) return;
  list.innerHTML = "";
  const snap = await getDocs(collection(db, "users", currentUid, "documents"));
  snap.forEach(d => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.innerHTML = `
      <div class="row g-2">
        <div class="col-md-5"><input class="form-control" value="${d.data().title || ''}" placeholder="Title"></div>
        <div class="col-md-5"><input class="form-control" value="${d.data().fileUrl || ''}" placeholder="URL"></div>
        <div class="col-md-2 d-flex gap-1">
          <button class="btn btn-sm btn-success flex-fill" title="Save"><i class="bi bi-check-lg"></i></button>
          <button class="btn btn-sm btn-danger flex-fill" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>`;
    li.querySelector(".btn-success").onclick = async () => {
      await updateDoc(doc(db, "users", currentUid, "documents", d.id), {
        title:   li.querySelectorAll("input")[0].value,
        fileUrl: li.querySelectorAll("input")[1].value,
        updatedAt: serverTimestamp()
      });
      showToast("Document updated!");
    };
    li.querySelector(".btn-danger").onclick = async () => {
      await deleteDoc(doc(db, "users", currentUid, "documents", d.id));
      showToast("Document deleted!");
      loadDocuments();
    };
    list.appendChild(li);
  });
}

/* ══════════════════════════════════════════
   DOCUMENT PASSWORD
   ══════════════════════════════════════════ */
window.changeDocPassword = async () => {
  if (!currentUid) return;
  const input = document.getElementById("newDocPassword");
  const newPass = input?.value?.trim();
  if (!newPass) return alert("Password cannot be empty.");

  const snap = await getDoc(doc(db, "users", currentUid));
  if (snap.exists() && snap.data().documentPassword === newPass) {
    return alert("Cannot reuse the previous password.");
  }

  await setDoc(doc(db, "users", currentUid), { documentPassword: newPass }, { merge: true });
  if (input) input.value = "";
  showToast("Document password updated!");
};