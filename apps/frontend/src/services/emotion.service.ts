import apiClient from "./api-client";
import type {
  EmotionResult,
  EmotionHistory,
  EmotionStatistics,
} from "@/types/emotion.types";

export const emotionService = {
  async predict(file: File, sourceType: string): Promise<EmotionResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_type", sourceType);

    const response = await apiClient.post<EmotionResult>(
      "/emotions/predict",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  async getHistory(
    page: number = 1,
    pageSize: number = 10
  ): Promise<EmotionHistory> {
    const response = await apiClient.get<EmotionHistory>("/emotions/history", {
      params: {
        page,
        page_size: pageSize,
      },
    });
    return response.data;
  },

  async getStatistics(): Promise<EmotionStatistics> {
    const response = await apiClient.get<EmotionStatistics>(
      "/emotions/statistics"
    );
    return response.data;
  },

  async getById(id: string): Promise<EmotionResult> {
    const response = await apiClient.get<EmotionResult>(`/emotions/${id}`);
    return response.data;
  },

  async deleteResult(id: string): Promise<void> {
    await apiClient.delete(`/emotions/${id}`);
  },
};
