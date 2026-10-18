import { auth, db } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
sendPasswordResetEmail,
updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
doc,
setDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ========================================
// 1. DISPLAY MESSAGES
// ========================================

function showMessage(element, message, type = "error") {
if (!element) return;


element.textContent = message;
element.className = `auth-message ${type}`;
element.style.display = "block";


}

// ========================================
// 2. EMAIL VALIDATION
// ========================================

function isValidEmail(email) {
return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email);
}

// ========================================
// 3. PASSWORD VISIBILITY
// ========================================

document.querySelectorAll(".password-toggle").forEach(button => {
button.addEventListener("click", () => {
const input = document.getElementById(button.dataset.target);


    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "Hide";
    } else {
        input.type = "password";
        button.textContent = "Show";
    }
});


});

// ========================================
// 4. FIREBASE ERROR MESSAGES
// ========================================

function getFriendlyError(error) {
switch (error.code) {
case "auth/email-already-in-use":
return "An account with this email already exists. Please log in.";


    case "auth/invalid-email":
        return "Please enter a valid email address.";

    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
        return "Incorrect email or password. Please try again.";

    case "auth/weak-password":
        return "Your password must be at least 6 characters long.";

    case "auth/too-many-requests":
        return "Too many attempts. Please wait a while and try again.";

    case "auth/network-request-failed":
        return "Network error. Check your internet connection.";

    case "permission-denied":
    case "firestore/permission-denied":
        return "Your account could not be saved. Please check your Firestore security rules.";

    default:
        console.error("Firebase error:", error);
        return "Something went wrong. Please try again.";
}


}

// ========================================
// 5. SIGNUP
// ========================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {
signupForm.addEventListener("submit", async event => {
event.preventDefault();


    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const message = document.getElementById("signupMessage");
    const submitButton = signupForm.querySelector('button[type="submit"]');

    if (!name || !email || !password || !confirmPassword) {
        showMessage(message, "Please fill in all the fields.");
        return;
    }

    if (!isValidEmail(email)) {
        showMessage(message, "Please enter a valid email address.");
        return;
    }

    if (password.length < 6) {
        showMessage(message, "Password must contain at least 6 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage(message, "The passwords do not match.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        await updateProfile(user, {
            displayName: name
        });

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            createdAt: serverTimestamp()
        });

        showMessage(
            message,
            "Account created successfully! Redirecting...",
            "success"
        );

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);

    } catch (error) {
        showMessage(message, getFriendlyError(error));
        submitButton.disabled = false;
        submitButton.textContent = "Create Account";
    }
});


}

// ========================================
// 6. LOGIN
// ========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
loginForm.addEventListener("submit", async event => {
event.preventDefault();


    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const message = document.getElementById("loginMessage");
    const submitButton = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
        showMessage(message, "Please enter your email and password.");
        return;
    }

    if (!isValidEmail(email)) {
        showMessage(message, "Please enter a valid email address.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
        await signInWithEmailAndPassword(auth, email, password);

        showMessage(
            message,
            "Login successful! Redirecting...",
            "success"
        );

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (error) {
        showMessage(message, getFriendlyError(error));
        submitButton.disabled = false;
        submitButton.textContent = "Log In";
    }
});


}

// ========================================
// 7. FORGOT PASSWORD
// ========================================

const forgotPasswordLink = document.getElementById("forgotPassword");

if (forgotPasswordLink) {
forgotPasswordLink.addEventListener("click", async event => {
event.preventDefault();


    const email = document.getElementById("loginEmail").value.trim();
    const message = document.getElementById("loginMessage");

    if (!email || !isValidEmail(email)) {
        showMessage(
            message,
            "Enter your email address in the email field first."
        );
        document.getElementById("loginEmail").focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);

        showMessage(
            message,
            "If an account exists for this email, a password reset email has been sent.",
            "success"
        );

    } catch (error) {
        if (
            error.code === "auth/user-not-found" ||
            error.code === "auth/invalid-email"
        ) {
            showMessage(
                message,
                "If an account exists for this email, a password reset email will be sent.",
                "success"
            );
        } else {
            showMessage(message, getFriendlyError(error));
        }
    }
});


}
