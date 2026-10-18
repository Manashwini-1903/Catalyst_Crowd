import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// Get HTML elements

const editForm = document.getElementById("editCampaignForm");
const titleInput = document.getElementById("campaignTitle");
const descriptionInput = document.getElementById("campaignDescription");
const categoryInput = document.getElementById("campaignCategory");
const goalInput = document.getElementById("campaignGoal");
const deadlineInput = document.getElementById("campaignDeadline");
const imageInput = document.getElementById("campaignImage");
const imagePreview = document.getElementById("imagePreview");
const messageBox = document.getElementById("editMessage");
const saveButton = document.getElementById("saveCampaignButton");


// Get campaign ID from the URL

const params = new URLSearchParams(window.location.search);
const campaignId = params.get("id");

let currentUser = null;


// Display messages

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = "edit-message " + type;
}


// Validate image URLs

function isValidImageUrl(value) {
    if (!value) {
        return true;
    }

    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            url.hostname.includes(".")
        );
    } catch {
        return false;
    }
}


// Update the image preview

imageInput.addEventListener("input", function () {
    const imageUrl = imageInput.value.trim();

    if (isValidImageUrl(imageUrl) && imageUrl) {
        imagePreview.src = imageUrl;
        imagePreview.style.display = "block";
    } else {
        imagePreview.removeAttribute("src");
        imagePreview.style.display = "none";
    }
});

imagePreview.addEventListener("error", function () {
    imagePreview.style.display = "none";
});


// Load the existing campaign

async function loadCampaign() {
    if (!campaignId) {
        showMessage("Campaign ID is missing.", "error");
        editForm.hidden = true;
        return;
    }

    try {
        const campaignRef = doc(db, "campaigns", campaignId);
        const campaignSnapshot = await getDoc(campaignRef);

        if (!campaignSnapshot.exists()) {
            showMessage("This campaign could not be found.", "error");
            editForm.hidden = true;
            return;
        }

        const campaign = campaignSnapshot.data();

        // Only the creator can edit this campaign

        if (campaign.creatorId !== currentUser.uid) {
            showMessage(
                "You can only edit campaigns you created.",
                "error"
            );

            editForm.hidden = true;
            return;
        }

        // Fill the form with existing information

        titleInput.value = campaign.title || "";
        descriptionInput.value = campaign.description || "";
        categoryInput.value = campaign.category || "";
        goalInput.value = campaign.goalAmount || "";
        deadlineInput.value = campaign.deadline || "";
        imageInput.value = campaign.imageUrl || "";

        if (campaign.imageUrl) {
            imagePreview.src = campaign.imageUrl;
            imagePreview.style.display = "block";
        }

    } catch (error) {
        console.error("Error loading campaign:", error);

        showMessage(
            "Could not load the campaign. Please check your connection and try again.",
            "error"
        );

        editForm.hidden = true;
    }
}


// Save the updated campaign

editForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentUser || !campaignId) {
        showMessage("Please log in and try again.", "error");
        return;
    }

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const category = categoryInput.value;
    const goalAmount = Number(goalInput.value);
    const deadline = deadlineInput.value;
    const imageUrl = imageInput.value.trim();

    // Validate form fields

    if (!title || !description || !category || !deadline) {
        showMessage("Please complete all required fields.", "error");
        return;
    }

    if (
        !Number.isSafeInteger(goalAmount) ||
        goalAmount < 1 ||
        goalAmount > 100000000
    ) {
        showMessage(
            "Enter a valid fundraising goal between ₹1 and ₹10 crore.",
            "error"
        );
        return;
    }

    if (deadline < new Date().toLocaleDateString("en-CA")) {
        showMessage("Please select today or a future date.", "error");
        return;
    }

    if (!isValidImageUrl(imageUrl)) {
        showMessage(
            "Please enter a valid HTTPS image URL or leave it blank.",
            "error"
        );
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const campaignRef = doc(db, "campaigns", campaignId);

        // Check ownership again before updating

        const campaignSnapshot = await getDoc(campaignRef);

        if (!campaignSnapshot.exists()) {
            throw new Error("This campaign no longer exists.");
        }

        const existingCampaign = campaignSnapshot.data();

        if (existingCampaign.creatorId !== currentUser.uid) {
            throw new Error("You are not allowed to edit this campaign.");
        }

        // Update only editable fields.
        // Amount raised, creator ID and creation date remain unchanged.

        await updateDoc(campaignRef, {
            title: title,
            description: description,
            category: category,
            goalAmount: goalAmount,
            deadline: deadline,
            imageUrl: imageUrl
        });

        showMessage("Campaign updated successfully!", "success");

        saveButton.textContent = "Saved!";

        setTimeout(function () {
            window.location.href =
                "campaign.html?id=" +
                encodeURIComponent(campaignId);
        }, 1000);

    } catch (error) {
        console.error("Error updating campaign:", error);

        showMessage(
            error.message === "You are not allowed to edit this campaign."
                ? error.message
                : "Could not save changes. Check your Firebase rules and try again.",
            "error"
        );

        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
    }
});


// Check login before loading campaign data

onAuthStateChanged(auth, async function (user) {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    await loadCampaign();
});