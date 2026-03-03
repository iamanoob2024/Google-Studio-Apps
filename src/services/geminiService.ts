import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY!;

export const getGeminiResponse = async (
  prompt: string,
  model: string = "gemini-3-flash-preview",
  config?: any
) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });
  return response.text;
};

export const getThinkingResponse = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });
  return response.text;
};

export const generateImage = async (
  prompt: string,
  aspectRatio: string = "1:1",
  imageSize: string = "1K"
) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio,
        imageSize,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const editImage = async (base64ImageData: string, prompt: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData.split(",")[1],
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const transcribeAudio = async (base64Audio: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: "audio/wav",
          },
        },
        { text: "Transcribe this audio." },
      ],
    },
  });
  return response.text;
};

export const analyzeImage = async (base64ImageData: string, prompt: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData.split(",")[1],
            mimeType: "image/png",
          },
        },
        { text: prompt },
      ],
    },
  });
  return response.text;
};

export const generateVideo = async (prompt: string, base64Image?: string, aspectRatio: "16:9" | "9:16" = "16:9") => {
  const ai = new GoogleGenAI({ apiKey });
  let operation = await ai.models.generateVideos({
    model: "veo-3.1-fast-generate-preview",
    prompt,
    image: base64Image ? {
      imageBytes: base64Image.split(",")[1],
      mimeType: "image/png",
    } : undefined,
    config: {
      numberOfVideos: 1,
      resolution: "720p",
      aspectRatio,
    },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  const response = await fetch(downloadLink, {
    method: "GET",
    headers: {
      "x-goog-api-key": apiKey,
    },
  });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
