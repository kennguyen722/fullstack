import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { initSocket } from "./socket.js";

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import serviceRoutes from "./routes/services.js";
import appointmentRoutes from "./routes/appointments.js";

const app = express();
app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);

const server = http.createServer(app);
initSocket(server);

server.listen(config.port, () => {
  console.log(`[Server] running on http://localhost:${config.port}`);
});
