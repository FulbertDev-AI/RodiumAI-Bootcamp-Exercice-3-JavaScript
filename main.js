import 'dotenv/config';
import { RodiumAI } from "rodiumai";
import readline from 'readline';
import fs from 'fs';
const apiKey = process.env.RODIUMAI_API_KEY;
if (!apiKey) {
    console.error("Erreur : La clé API RODIUMAI_API_KEY est introuvable.");
    process.exit(1);
}

const client = new RodiumAI({ apiKey: apiKey });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const questionAsync = (query) => new Promise((resolve) => rl.question(query, resolve));

async function stepChat() {
    while (true) {
        console.log("\n========== [JS] Étape 1: Chat ==========");
        const q = await questionAsync("Votre question : ");
        if (!q.trim()) continue;

        try {
            const response = await client.chat.completions.create({
                model: "openai/gpt-4o",
                messages: [{ role: "user", content: q }]
            });
            console.log(`\n[Réponse] :\n${response.choices[0].message.content}`);
            console.log(`Coût : ${response.cost_rodi || 'N/A'} RODI`);
        } catch (err) {
            console.error("Erreur :", err.message);
        }

        const choice = await questionAsync("\nRester sur cette étape (r) ou passer à la suivante (s) ? [r/s] : ");
        if (choice.trim().toLowerCase() === 's') return 'next';
    }
}

async function stepImage() {
    while (true) {
        console.log("\n========== [JS] Étape 2: Image ==========");
        const prompt = await questionAsync("Décrivez l'image : ");
        if (!prompt.trim()) continue;

        try {
            console.log("Génération de l'image...");
            const response = await client.images.generate({
                model: "google/gemini-3.1-flash-lite-image",
                prompt: prompt,
                response_format: "b64_json"
            });
            const buffer = Buffer.from(response.data[0].b64_json, 'base64');
            fs.writeFileSync("image.png", buffer);
            console.log("Image enregistrée : image.png");
        } catch (err) {
            console.error("Erreur :", err.message);
        }

        const choice = await questionAsync("\nRevenir en arrière (b), rester (r) ou passer à la suivante (s) ? [b/r/s] : ");
        if (choice.trim().toLowerCase() === 'b') return 'back';
        if (choice.trim().toLowerCase() === 's') return 'next';
    }
}

async function stepVideo() {
    while (true) {
        console.log("\n========== [JS] Étape 3: Vidéo ==========");
        const prompt = await questionAsync("Décrivez la vidéo : ");
        if (!prompt.trim()) continue;

        try {
            console.log("Génération de la vidéo en cours...");
            const response = await client.video.generations.create({
                model: "google/veo-3.1-fast",
                prompt: prompt
            });
            const videoUrl = response.data[0].url;
            const res = await fetch(videoUrl);
            const arrayBuffer = await res.arrayBuffer();
            fs.writeFileSync("video.mp4", Buffer.from(arrayBuffer));
            console.log("Vidéo enregistrée : video.mp4");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes("Video generation is not yet available.")) {
                console.error("La génération vidéo n'est pas encore prise en charge par le SDK RodiumAI installé.");
                console.error("Consultez https://docs.rodiumai.io/changelog pour vérifier quand cette fonctionnalité sera disponible.");
            } else {
                console.error("Erreur :", message);
            }
        }

        const choice = await questionAsync("\nRevenir en arrière (b), rester (r) ou quitter (q) ? [b/r/q] : ");
        if (choice.trim().toLowerCase() === 'b') return 'back';
        if (choice.trim().toLowerCase() === 'q') {
            rl.close();
            break;
        }
    }
}

async function main() {
    let step = 1;
    while (step <= 3) {
        if (step === 1) {
            const res = await stepChat();
            if (res === 'next') step = 2;
        } else if (step === 2) {
            const res = await stepImage();
            if (res === 'back') step = 1;
            else if (res === 'next') step = 3;
        } else if (step === 3) {
            const res = await stepVideo();
            if (res === 'back') step = 2;
            else break;
        }
    }
}

main();