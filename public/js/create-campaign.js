
// ========================================
// Catalyst Crowd - Create Campaign
// Saves campaign details in Firebase Firestore
// ========================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// 1. GET HTML ELEMENTS

const campaignForm = document.getElementById("createCampaignForm");

const titleInput = document.getElementById("campaignTitle");
const descriptionInput = document.getElementById("campaignDescription");
const categoryInput = document.getElementById("campaignCategory");
const goalInput = document.getElementById("campaignGoal");
const deadlineInput = document.getElementById("campaignDeadline");
const imageInput = document.getElementById("campaignImage");

const imagePreview = document.getElementById("imagePreview");
const messageBox = document.getElementById("createCampaignMessage");
const submitButton = document.getElementById("createCampaignButton");

let currentUser = null;


// 2. SET THE EARLIEST ALLOWED DEADLINE TO TOMORROW

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const year = tomorrow.getFullYear();
const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
const day = String(tomorrow.getDate()).padStart(2, "0");

deadlineInput.min = `${year}-${month}-${day}`;


// 3. CHECK LOGIN STATUS

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
});


// 4. SHOW A PREVIEW OF THE IMAGE

imageInput.addEventListener("input", () => {
    const imageUrl = imageInput.value.trim();

    imagePreview.style.display = "none";
    imagePreview.removeAttribute("src");

    if (!imageUrl) {
        return;
    }

    try {
        const parsedUrl = new URL(imageUrl);

        if (parsedUrl.protocol !== "https:") {
            return;
        }

        imagePreview.onload = () => {
            imagePreview.style.display = "block";
        };

        imagePreview.onerror = () => {
            imagePreview.style.display = "none";
        };

        imagePreview.src = parsedUrl.href;

    } catch (error) {
        imagePreview.style.display = "none";
    }
});


// 5. SHOW A MESSAGE

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `create-message ${type}`;
}


// 6. SUBMIT THE CAMPAIGN FORM

campaignForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        showMessage(
            "Please wait while we verify your login, then try again.",
            "error"
        );
        return;
    }

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const category = categoryInput.value;
    const goalAmount = Number(goalInput.value);
    const deadline = deadlineInput.value;
    const imageUrl = imageInput.value.trim();

    // Validate title
    if (title.length < 3) {
        showMessage(
            "Please enter a title with at least 3 characters.",
            "error"
        );
        return;
    }

    // Validate description
    if (description.length < 20) {
        showMessage(
            "Please write a description of at least 20 characters.",
            "error"
        );
        return;
    }

    // Validate category
    if (!category) {
        showMessage("Please choose a campaign category.", "error");
        return;
    }

    // Validate fundraising goal
    if (
        !Number.isFinite(goalAmount) ||
        goalAmount <= 0 ||
        goalAmount > 100000000
    ) {
        showMessage(
            "Please enter a valid fundraising goal.",
            "error"
        );
        return;
    }

    // Validate deadline
    const selectedDeadline = new Date(`${deadline}T00:00:00`);
    const minimumDeadline = new Date();
    minimumDeadline.setHours(0, 0, 0, 0);
    minimumDeadline.setDate(minimumDeadline.getDate() + 1);

    if (
        !deadline ||
        Number.isNaN(selectedDeadline.getTime()) ||
        selectedDeadline < minimumDeadline
    ) {
        showMessage(
            "Please select a deadline that is at least tomorrow.",
            "error"
        );
        return;
    }

    // Validate image URL, if supplied
    if (imageUrl) {
        try {
            const parsedUrl = new URL(imageUrl);

            if (parsedUrl.protocol !== "https:") {
                showMessage(
                    "Please use a secure HTTPS image URL.",
                    "error"
                );
                return;
            }
        } catch (error) {
            showMessage(
                "Please enter a valid image URL or leave the field empty.",
                "error"
            );
            return;
        }
    }

    // Prevent multiple submissions
    submitButton.disabled = true;
    submitButton.textContent = "Publishing...";
    messageBox.className = "create-message";
    messageBox.textContent = "";

    try {
        // Get the creator's display name
        const creatorName =
            currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "Community Member";

        // Prepare campaign data
        const campaignData = {
            title: title,
            description: description,
            category: category,
            goalAmount: goalAmount,
            deadline: deadline,
            amountRaised: 0,
            creatorId: currentUser.uid,
            creatorName: creatorName,
            imageUrl: imageUrl,
            createdAt: serverTimestamp()
        };

        // Save the campaign to Firestore
        await addDoc(
            collection(db, "campaigns"),
            campaignData
        );

        showMessage(
            "Your campaign has been published successfully! Opening Explore...",
            "success"
        );

        campaignForm.reset();
        imagePreview.style.display = "none";
        imagePreview.removeAttribute("src");

        // Return to Explore after a short delay
        setTimeout(() => {
            window.location.href = "explore.html";
        }, 1800);

    } catch (error) {
        console.error("Campaign creation error:", error);

        if (error.code === "permission-denied") {
            showMessage(
                "Firebase denied permission to publish this campaign. Please check your Firestore security rules.",
                "error"
            );
        } else {
            showMessage(
                "We couldn't publish your campaign. Please check your internet connection and try again.",
                "error"
            );
        }

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Publish Campaign";
    }
});
   
