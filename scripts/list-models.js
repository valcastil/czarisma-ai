const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcode the key from .env.example or just log instructions if missing
// In this environment we can't easily read .env without dotenv, but we can try to read process.env if run with --env-file in newer node
// For simplicity, I'll ask the user to input it or try to grab it from the code I just wrote if I was running in the app context.
// Actually, since I am running this via `node`, I need to read the file.

const fs = require('fs');
const path = require('path');

function getEnvValue(key) {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        if (match && match[1]) {
            return match[1].trim();
        }
    } catch (e) {
        console.error("Could not read .env file");
    }
    return null;
}

async function listModels() {
    const apiKey = getEnvValue('EXPO_PUBLIC_GEMINI_API_KEY');
    if (!apiKey) {
        console.error("No API key found in .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Note: The client SDK doesn't always expose listModels directly on the main class in all versions
    // But let's try the standard way for the node SDK
    // Usually it is via a ModelManager or similar, but looking at docs for 0.24.1:
    // It seems genAI.getGenerativeModel is the main entry.
    // However, usually there is an admin or API method.
    // If listModels isn't available, we'll know.

    try {
        // Attempt to fetch via raw fetch if SDK doesn't have it, but let's try assuming SDK might have it on the class or just try a standard model first.
        // Actually the error message "Call ListModels to see the list" implies it exists.
        // It might be on the instance?
        // Let's try to verify if we can make a direct call if the SDK method is obscure.

        console.log("Checking API Key: " + apiKey.substring(0, 8) + "...");

        // Fetch directly from API to be sure
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Gemini Models:");
            const geminiModels = data.models.filter(m => m.name.toLowerCase().includes('gemini'));
            if (geminiModels.length === 0) {
                console.log("No models found containing 'gemini'.");
                console.log("First 5 models found: ", data.models.slice(0, 5).map(m => m.name));
            } else {
                geminiModels.forEach(m => console.log(`- ${m.name}`));
            }
        } else {
            console.log("Error listing models:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
