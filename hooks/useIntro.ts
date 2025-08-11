import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_KEY = "INTRO_V0";

export function useIntro() {
  const [introCompleted, setIntroCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIntroStatus();
  }, []);

  const checkIntroStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(INTRO_KEY);
      setIntroCompleted(completed === "completed");
    } catch (error) {
      console.error("Failed to check intro status:", error);
      setIntroCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const markIntroCompleted = async () => {
    try {
      await AsyncStorage.setItem(INTRO_KEY, "completed");
      setIntroCompleted(true);
    } catch (error) {
      console.error("Failed to mark intro as completed:", error);
      // Don't throw error, just continue
      setIntroCompleted(true);
    }
  };

  const resetIntro = async () => {
    try {
      await AsyncStorage.removeItem(INTRO_KEY);
      setIntroCompleted(false);
    } catch (error) {
      console.error("Failed to reset intro:", error);
    }
  };

  return {
    introCompleted,
    loading,
    markIntroCompleted,
    resetIntro,
  };
}
