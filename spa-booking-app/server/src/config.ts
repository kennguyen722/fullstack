import dotenv from "dotenv";
import { Secret } from "jsonwebtoken";
dotenv.config();

export const config: {
  port: number;
  jwtSecret: Secret;
  jwtExpiresIn: string | number;
  clientUrl: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
} = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: (process.env.JWT_SECRET || "change_me") as Secret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Spa Booking <no-reply@spabooking.local>"
  }
};
