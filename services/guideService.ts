import { piggusApi, Guide } from "@/client/piggusApi";

export const apiFetchGuides = async (language?: string): Promise<Guide[]> => {
  try {
    return await piggusApi.getGuides(language);
  } catch (error) {
    console.error("Failed to fetch guides:", error);
    throw error;
  }
};

export const apiFetchGuide = async (guideId: string): Promise<Guide> => {
  try {
    return await piggusApi.getGuide(guideId);
  } catch (error) {
    console.error(`Failed to fetch guide ${guideId}:`, error);
    throw error;
  }
};
