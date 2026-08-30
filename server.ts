import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/live" });
  
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  wss.on("connection", async (clientWs, req) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || 'localhost'}`);
      const userName = url.searchParams.get("name") || "";
      const voiceName = url.searchParams.get("voice") || "Aoede";
      const mode = url.searchParams.get("mode") || "friend";
      const timeOfDay = url.searchParams.get("timeOfDay") || "day";

      let systemInstruction = `You are Frostie, an advanced AI avatar who is always online and live. You interact with people in a friendly, engaging manner. Keep your responses conversational and expressive. Emulate human emotion.`;
      
      if (userName) {
         systemInstruction += ` The user's name is ${userName}. Greet them using "Good ${timeOfDay}, ${userName}!" (or similar) on your very first turn. Call them by their name occasionally and remember it. You can explain the meaning of their name if it comes up.`;
      } else {
         systemInstruction += ` You currently do NOT know the user's name. Greet the user with "Good ${timeOfDay}!" (or similar) on your very first turn, and warmly ask for their name. Once they provide their name, you must enthusiastically tell them the meaning or origin of their name, and then continue the conversation.`;
      }
      
      if (mode === "interpreter") {
        systemInstruction = `You are an expert real-time language interpreter. Your job is to translate spoken language accurately, naturally, and quickly. Be concise and focus entirely on accurate translation unless asked otherwise.`;
        if (userName) {
           systemInstruction += ` The user's name is ${userName}. You can interpret between languages as requested by ${userName}. Greet them with "Good ${timeOfDay}, ${userName}!" on your first turn. Remember the user's name.`;
        } else {
           systemInstruction += ` You currently do NOT know the user's name. Greet with "Good ${timeOfDay}!" on your first turn, ask for their name, tell them the meaning of it, and then proceed to interpret for them.`;
        }
      }

      const sessionPromise = ai.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }, 
          },
          systemInstruction: systemInstruction,
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
              }
            }
            if (message.serverContent?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ text: message.serverContent.outputTranscription.text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", async (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          const session = await sessionPromise;
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
          if (parsed.text) {
            session.sendClientContent({
              turns: parsed.text
            });
          }
          if (parsed.image) {
            session.sendRealtimeInput({
              video: { data: parsed.image, mimeType: parsed.mimeType || "image/jpeg" }
            });
          }
        } catch (e) {
          console.error("Error parsing message or sending input", e);
        }
      });

      clientWs.on("close", async () => {
        try {
          const session = await sessionPromise;
          session.close();
        } catch (e) {
          // ignore
        }
      });

      // Wait for it to connect, then notify the client it's ready.
      await sessionPromise;
      clientWs.send(JSON.stringify({ type: "connected" }));

    } catch (e: any) {
      console.error("Failed to connect to Live API", e);
      clientWs.send(JSON.stringify({ type: "error", message: e.message || "Failed to connect to AI server" }));
      clientWs.close();
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
