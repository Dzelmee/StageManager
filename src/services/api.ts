const API_URL = "http://localhost:3333";

export type ApiHealth = {
  status: string;
  application: string;
  timestamp: string;
};

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Erro da API: ${response.status}`);
  }

  return response.json();
}