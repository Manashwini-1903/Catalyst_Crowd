import { db } from "./firebase.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ========================================
// 1. PAGE ELEMENTS
// ========================================

const campaignGrid = document.getElementById("campaignGrid");
const campaignStatus = document.getElementById("campaignStatus");

const campaignSearch = document.getElementById("campaignSearch");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");

const campaignResultCount =
document.getElementById("campaignResultCount");

const clearFiltersButton =
document.getElementById("clearFilters");

// Store campaigns loaded from Firestore.
let allCampaigns = [];

// ========================================
// 2. HELPER FUNCTIONS
// ========================================

function formatCurrency(amount) {
return new Intl.NumberFormat("en-IN", {
style: "currency",
currency: "INR",
maximumFractionDigits: 0
}).format(amount);
}

function formatCategory(category) {
if (!category) return "Other";

   
return category.charAt(0).toUpperCase() +
    category.slice(1).toLowerCase();
   

}

function showStatus(title, description, isError = false) {
campaignGrid.replaceChildren();

   
campaignStatus.style.display = "block";
campaignStatus.classList.toggle("error", isError);

campaignStatus.replaceChildren();

const heading = document.createElement("h3");
heading.textContent = title;

const paragraph = document.createElement("p");
paragraph.textContent = description;

campaignStatus.append(heading, paragraph);
   

}

function hideStatus() {
campaignStatus.style.display = "none";
}

// ========================================
// 3. LOAD CAMPAIGNS AND CONTRIBUTIONS
// ========================================

async function loadCampaigns() {
showStatus(
"Finding inspiring campaigns...",
"Please wait while we load the latest campaigns."
);

   
campaignResultCount.textContent = "Loading campaigns...";

try {
    // Fetch campaigns and contribution records.
    const [campaignSnapshot, contributionSnapshot] =
        await Promise.all([
            getDocs(collection(db, "campaigns")),
            getDocs(collection(db, "contributions"))
        ]);

    // Calculate the total contributed to each campaign.
    const contributionTotals = new Map();

    contributionSnapshot.forEach((documentSnapshot) => {
        const contribution = documentSnapshot.data();

        const campaignId = contribution.campaignId;
        const amount = Number(contribution.amount);

        if (
            typeof campaignId === "string" &&
            Number.isFinite(amount) &&
            amount > 0
        ) {
            const currentTotal =
                contributionTotals.get(campaignId) || 0;

            contributionTotals.set(
                campaignId,
                currentTotal + amount
            );
        }
    });

    // Attach each campaign's calculated total.
    allCampaigns = campaignSnapshot.docs.map(
        (documentSnapshot) => {
            const campaign = documentSnapshot.data();

            return {
                id: documentSnapshot.id,
                ...campaign,

                // Use contribution records as the source of truth.
                amountRaised:
                    contributionTotals.get(documentSnapshot.id) || 0
            };
        }
    );

    displayCampaigns();

} catch (error) {
    console.error(
        "Error loading campaigns or contributions:",
        error
    );

    showStatus(
        "We couldn't load the campaigns.",
        "Please check your internet connection and Firestore security rules, then try again.",
        true
    );

    const retryButton = document.createElement("button");

    retryButton.className = "status-action";
    retryButton.textContent = "Try Again";

    retryButton.addEventListener("click", loadCampaigns);

    campaignStatus.appendChild(retryButton);

    campaignResultCount.textContent =
        "Unable to load campaigns.";
}
   

}

// ========================================
// 4. FILTER AND SORT CAMPAIGNS
// ========================================

function getFilteredCampaigns() {
const searchText = campaignSearch.value
.trim()
.toLowerCase();

   
const selectedCategory = categoryFilter.value;
const selectedSort = sortFilter.value;

let filteredCampaigns = allCampaigns.filter((campaign) => {
    const title =
        String(campaign.title || "").toLowerCase();

    const description =
        String(campaign.description || "").toLowerCase();

    const category =
        String(campaign.category || "other").toLowerCase();

    const matchesSearch =
        title.includes(searchText) ||
        description.includes(searchText);

    const matchesCategory =
        selectedCategory === "all" ||
        category === selectedCategory;

    return matchesSearch && matchesCategory;
});

// Sort the results.
filteredCampaigns.sort((a, b) => {
    if (selectedSort === "newest") {
        return getTimestamp(b.createdAt) -
            getTimestamp(a.createdAt);
    }

    if (selectedSort === "oldest") {
        return getTimestamp(a.createdAt) -
            getTimestamp(b.createdAt);
    }

    if (selectedSort === "goal-low") {
        return getGoal(a) - getGoal(b);
    }

    if (selectedSort === "goal-high") {
        return getGoal(b) - getGoal(a);
    }

    if (selectedSort === "progress") {
        return getProgress(b) - getProgress(a);
    }

    return 0;
});

return filteredCampaigns;
   

}

function getGoal(campaign) {
const goal = Number(campaign.goalAmount);

   
return Number.isFinite(goal) && goal > 0
    ? goal
    : 0;
   

}

function getRaised(campaign) {
const raised = Number(campaign.amountRaised);

   
return Number.isFinite(raised) && raised > 0
    ? raised
    : 0;
   

}

function getProgress(campaign) {
const goal = getGoal(campaign);

   
if (goal === 0) {
    return 0;
}

return Math.min(
    (getRaised(campaign) / goal) * 100,
    100
);
   

}

function getTimestamp(value) {
if (value && typeof value.toMillis === "function") {
return value.toMillis();
}

   
if (typeof value === "string") {
    const timestamp = Date.parse(value);

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

return 0;
   

}

// ========================================
// 5. DISPLAY CAMPAIGN CARDS
// ========================================

function displayCampaigns() {
const campaigns = getFilteredCampaigns();

   
campaignGrid.replaceChildren();

campaignResultCount.textContent =
    `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} found`;

if (campaigns.length === 0) {
    showStatus(
        allCampaigns.length === 0
            ? "Be the first to start a campaign!"
            : "No campaigns match your search.",

        allCampaigns.length === 0
            ? "There are no campaigns here yet. Have an idea that could help someone? Start a campaign and let your community be part of it."
            : "Try another keyword or category, or clear your filters."
    );

    const createButton = document.createElement("a");

    createButton.href = "create-campaign.html";
    createButton.className = "status-action";
    createButton.textContent = "Start a Campaign";

    campaignStatus.appendChild(createButton);

    return;
}

hideStatus();

campaigns.forEach((campaign) => {
    const card = createCampaignCard(campaign);

    campaignGrid.appendChild(card);
});
   

}

// ========================================
// 6. CREATE A CAMPAIGN CARD
// ========================================

function createCampaignCard(campaign) {
const card = document.createElement("article");

   
card.className = "campaign-card";

// Image area.
const imageWrap = document.createElement("div");

imageWrap.className = "campaign-card-image-wrap";

const image = document.createElement("img");

image.className = "campaign-card-image";

image.alt = campaign.title
    ? `Image for ${campaign.title}`
    : "Campaign image";

image.loading = "lazy";
image.src = getCampaignImage(campaign.imageUrl);

image.onerror = () => {
    image.onerror = null;

    image.src =
        "https://placehold.co/800x500/ece6ff/7047eb?text=Catalyst+Crowd";
};

const badge = document.createElement("span");

badge.className = "campaign-category-badge";
badge.textContent = formatCategory(campaign.category);

imageWrap.append(image, badge);

// Card content.
const content = document.createElement("div");

content.className = "campaign-card-content";

const title = document.createElement("h3");

title.textContent = campaign.title || "Untitled Campaign";

const description = document.createElement("p");

description.className = "campaign-card-description";

description.textContent =
    campaign.description ||
    "Discover this campaign and its story.";

// Progress bar.
const progressTrack = document.createElement("div");

progressTrack.className = "campaign-progress-track";

progressTrack.setAttribute("role", "progressbar");
progressTrack.setAttribute(
    "aria-label",
    "Campaign funding progress"
);
progressTrack.setAttribute("aria-valuemin", "0");
progressTrack.setAttribute("aria-valuemax", "100");

const progressFill = document.createElement("div");

progressFill.className = "campaign-progress-fill";

const progress = getProgress(campaign);

progressFill.style.width = `${progress}%`;

progressTrack.setAttribute(
    "aria-valuenow",
    String(Math.round(progress))
);

progressTrack.appendChild(progressFill);

// Funding information.
const fundingRow = document.createElement("div");

fundingRow.className = "campaign-funding-row";

const fundingDetails = document.createElement("div");

const raisedAmount = document.createElement("strong");

raisedAmount.textContent =
    formatCurrency(getRaised(campaign));

const goalAmount = document.createElement("span");

goalAmount.textContent =
    `raised of ${formatCurrency(getGoal(campaign))}`;

fundingDetails.append(raisedAmount, goalAmount);

const progressPercent = document.createElement("span");

progressPercent.className = "campaign-progress-percent";

progressPercent.textContent =
    `${Math.round(progress)}%`;

fundingRow.append(fundingDetails, progressPercent);

// Footer.
const footer = document.createElement("div");

footer.className = "campaign-card-footer";

const creator = document.createElement("span");

creator.className = "campaign-creator";

creator.textContent =
    `By ${campaign.creatorName || "Community Member"}`;

const viewButton = document.createElement("a");

viewButton.className = "campaign-view-button";

viewButton.href =
    `campaign.html?id=${encodeURIComponent(campaign.id)}`;

viewButton.textContent = "View Campaign →";

footer.append(creator, viewButton);

content.append(
    title,
    description,
    progressTrack,
    fundingRow,
    footer
);

card.append(imageWrap, content);

return card;
   

}

// ========================================
// 7. CAMPAIGN IMAGE
// ========================================

function getCampaignImage(imageUrl) {
if (typeof imageUrl !== "string") {
return "https://placehold.co/800x500/ece6ff/7047eb?text=Catalyst+Crowd";
}

   
const trimmedUrl = imageUrl.trim();

if (
    trimmedUrl.startsWith("https://") ||
    trimmedUrl.startsWith("http://")
) {
    return trimmedUrl;
}

return "https://placehold.co/800x500/ece6ff/7047eb?text=Catalyst+Crowd";
   

}

// ========================================
// 8. SEARCH AND FILTER EVENTS
// ========================================

campaignSearch.addEventListener("input", displayCampaigns);

categoryFilter.addEventListener("change", displayCampaigns);

sortFilter.addEventListener("change", displayCampaigns);

clearFiltersButton.addEventListener("click", () => {
campaignSearch.value = "";
categoryFilter.value = "all";
sortFilter.value = "newest";

   
displayCampaigns();
   

});

// ========================================
// 9. REFRESH WHEN RETURNING TO EXPLORE
// ========================================

// Reload the totals if the user returns to this page
// after recording a contribution on the campaign page.
window.addEventListener("pageshow", (event) => {
if (event.persisted) {
loadCampaigns();
}
});

// ========================================
// 10. START
// ========================================

loadCampaigns();
