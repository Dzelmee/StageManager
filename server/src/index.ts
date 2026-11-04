import app from "./app";

const PORT = 3333;

app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("  StageManager API");
  console.log("=================================");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Health:   http://localhost:${PORT}/api/health`);
  console.log("=================================");
  console.log("");
});