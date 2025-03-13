import { Anthropic } from "@llamaindex/anthropic";
import { OpenAI } from "@llamaindex/openai";
import { GeminiSession } from "@llamaindex/google";
import fs from "fs";
const google = new GeminiSession({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function acompletion({
  model,
  messages,
}: {
  model: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<string> {
  const [provider] = model.split("/");
  const modelName = model.split("/")[1];

  try {
    switch (provider) {
      case "anthropic":
        const anthropic = new Anthropic({
          model: modelName,
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const anthropicResponse = await anthropic.chat({
          messages: messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          stream: false,
        });
        return typeof anthropicResponse.message.content === "string"
          ? anthropicResponse.message.content
          : (anthropicResponse.message.content[0] as { text: string }).text;

      case "openai":
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("OpenAI API key is not configured");
        }

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: modelName,
        });

        const openaiResponse = await openai.chat({
          messages: messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          stream: false,
        });

        return typeof openaiResponse.message.content === "string"
          ? openaiResponse.message.content
          : (openaiResponse.message.content[0] as { text: string }).text;

      case "google":
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("Gemini API key is not configured");
        }
        const gemini = google.getGenerativeModel({
          model: modelName,
        });

        const system = messages.find((msg) => msg.role === "system");

        const contents = messages
          .filter((msg) => msg.role !== "system")
          .map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
          }));

        const geminiResponse = await gemini.generateContent({
          contents,
          systemInstruction: system?.content,
        });
        return geminiResponse.response.text();

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (err: any) {
    console.error("API Call Error:", {
      provider,
      model: modelName,
      error: {
        name: err.name,
        message: err.message,
        cause: err.cause,
        stack: err.stack,
      },
    });

    if (err.cause?.code === "ECONNREFUSED") {
      throw new Error(
        `Connection refused while calling ${provider} API. Please check if the API endpoint is correct and accessible.`
      );
    }

    throw err;
  }
}
