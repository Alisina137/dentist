import nodemailer from "nodemailer";

type Delivery = { to: string; subject: string; url: string };
export async function sendAccountMail({ to, subject, url }: Delivery) {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !from || !user || !password) {
    if (process.env.NODE_ENV === "production") throw new Error("Transactional SMTP is required in production");
    if (!["localhost", "127.0.0.1"].includes(new URL(process.env.API_BASE_URL || "http://localhost:4000").hostname)) {
      throw new Error("Development verification URLs are restricted to localhost");
    }
    // DEVELOPMENT ONLY. Never log email tokens on shared or production servers.
    console.info("[LOCAL DEVELOPMENT EMAIL — NOT SENT]", { to, subject, url });
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass: password }
  });
  await transport.sendMail({ from, to, subject, text: "Open this DandanLink account link: " + url + "\nIf you did not request it, ignore this email." });
}
