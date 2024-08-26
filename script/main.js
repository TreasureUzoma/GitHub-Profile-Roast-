import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.1.3/firebase-firestore.js";

// Fetch your API_KEY
const API_KEY = "Your_Gemini_API_Key";

// Access your API key
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
// Firebase configuration
const firebaseConfig = {
    apiKey: "API_KEY",
    authDomain: "get_from_firebase",
    projectId: "get_from_firebase",
    storageBucket: "get_from_firebase",
    messagingSenderId: "get_from_firebase",
    appId: "get_from_firebase",
    measurementId: "get_from_firebase"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// GitHub personal access token
const GITHUB_TOKEN = "your-github-token";
//Important as without api token, GitHub  accessing is way restricted 
// Function to fetch GitHub profile (unchanged)
async function fetchGitHubProfile(username) {
    const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`
        }
    });
    if (!response.ok) {
        throw new Error(
            `GitHub profile fetch failed with status ${response.status}`
        );
    }
    const data = await response.json();
    return data;
}

// Function to fetch GitHub repositories (unchanged)
async function fetchGitHubRepos(username) {
    const response = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100`,
        {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`
            }
        }
    );
    if (!response.ok) {
        throw new Error(
            `GitHub repos fetch failed with status ${response.status}`
        );
    }
    const repos = await response.json();
    return repos;
}

// Fetch Total Contributions using GitHub's GraphQL API
async function fetchTotalContributions(username) {
    const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

    const variables = {
        login: username
    };

    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `bearer ${GITHUB_TOKEN}`
        },
        body: JSON.stringify({
            query,
            variables
        })
    });

    if (!response.ok) {
        throw new Error(
            `GitHub GraphQL API request failed with status ${response.status}`
        );
    }

    const responseData = await response.json();

    if (responseData.errors) {
        console.error("GraphQL Errors:", responseData.errors);
        throw new Error("Error fetching contributions via GraphQL API");
    }

    const totalContributions = responseData.data.user
        ? responseData.data.user.contributionsCollection.contributionCalendar
              .totalContributions
        : 0;

    return totalContributions;
}

// Function to fetch README 
async function fetchReadme(username) {
    const response = await fetch(
        `https://api.github.com/repos/${username}/${username}/contents/README.md`,
        {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`
            }
        }
    );
    if (response.ok) {
        const data = await response.json();
        const readmeContent = atob(data.content);
        return readmeContent;
    }
    return "No README found.";
}

// Function to determine the most used language (unchanged)
function getMostUsedLanguage(repos) {
    const languageCounts = {};
    repos.forEach(repo => {
        const language = repo.language;
        if (language) {
            if (!languageCounts[language]) {
                languageCounts[language] = 0;
            }
            languageCounts[language]++;
        }
    });
    const mostUsedLanguage = Object.keys(languageCounts).reduce(
        (a, b) => (languageCounts[a] > languageCounts[b] ? a : b),
        null
    );
    return mostUsedLanguage;
}

// Function to generate roast (unchanged)
async function generateRoast(
    profile,
    repos,
    totalContributions,
    totalStars,
    readme,
    mostUsedLanguage
) {
    const prompt = `
You’re an AI for roasting profiles (fun)
Roast the following GitHub profile:
Username: ${profile.login}
Bio: ${profile.bio || "N/A"}
Total Contributions: ${totalContributions}
Total Public Repositories: ${profile.public_repos}
Total Private Repositories: ${profile.private_repos}
Total Stars: ${totalStars}
Most Used Language: ${mostUsedLanguage || "N/A"}
Followers: ${profile.followers}
Following: ${profile.following}
Company: ${profile.company || "N/A"}
Location: ${profile.location || "N/A"}
Blog: ${profile.blog || "N/A"}
Twitter: ${profile.twitter_username || "N/A"}
GitHub Profile: ${profile.html_url}
README: ${readme}
Make it something that’ll surely make the user cry. This is a project. Max of 80 words in reply. Make it personal. Make the person also laugh but 1000000% painful.
100% roasting 
Don't act nice 
Very wicked text. Show no respect. You're a roast king
for fun tho
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const roastText = await response.text();
    return roastText;
}

// Event listener for form submission
document.getElementById("roastForm").addEventListener("submit", async event => {
    event.preventDefault();
    let username = document.getElementById("username").value.trim(); // Trim whitespace
    if (!username) {
        alert("Please enter a GitHub username.");
        return;
    }

    document.getElementById("roastbtn").textContent = "Generating Roast...";

    try {
        console.log(`Fetching profile for username: ${username}`);
        const profile = await fetchGitHubProfile(username);
        console.log("Profile fetched:", profile);

        console.log(`Fetching total contributions for username: ${username}`);
        const totalContributions = await fetchTotalContributions(username);
        console.log("Total contributions fetched:", totalContributions);

        console.log(`Fetching README for username: ${username}`);
        const readme = await fetchReadme(username);
        console.log("README fetched:", readme);

        console.log(`Fetching repositories for username: ${username}`);
        const repos = await fetchGitHubRepos(username);
        const mostUsedLanguage = getMostUsedLanguage(repos);
        console.log("Most used language:", mostUsedLanguage);

        const totalStars = repos.reduce(
            (acc, repo) => acc + repo.stargazers_count,
            0
        );
        console.log("Total stars:", totalStars);

        console.log("Generating roast...");
        const roastText = await generateRoast(
            profile,
            repos,
            totalContributions,
            totalStars,
            readme,
            mostUsedLanguage
        );
        console.log("Roast generated:", roastText);

        const profileHTML = generateProfileHTML(
            profile,
            repos,
            totalContributions,
            totalStars,
            readme,
            mostUsedLanguage,
            roastText
        );
        document.getElementById("profileResult").innerHTML = profileHTML;

        // Update the total roast count in Firestore
        const roastCountRef = doc(db, "stats", "totalRoasts");
        const roastCountSnap = await getDoc(roastCountRef);
        if (roastCountSnap.exists()) {
            await updateDoc(roastCountRef, {
                count: roastCountSnap.data().count + 1
            });
        } else {
            await setDoc(roastCountRef, { count: 1 });
        }
        console.log("Total roast count updated in Firestore");
    } catch (error) {
        console.error("Error during roast generation:", error);
        alert(`Error: ${error.message}`);
        document.getElementById("roastbtn").textContent = "Roast Me";
    }
});

// Function to generate profile HTML (unchanged, except resetting button text and handling missing fields)
function generateProfileHTML(
    profile,
    repos,
    totalContributions,
    totalStars,
    readme,
    mostUsedLanguage,
    roastText
) {
    document.getElementById("roastbtn").textContent = "Roast Me";
    document.getElementById("profileResultWrap").style.display = "block";
    document.getElementById("fullname").textContent = profile.name || "N/A";
    document.getElementById("username").value = "";
    document.getElementById("username2").textContent = profile.login;
    document.getElementById("avatar").src = profile.avatar_url;
    return `<p class="roast-text">${roastText}</p>`;
}
