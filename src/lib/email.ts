import nodemailer from "nodemailer";

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_FROM && (process.env.SMTP_USER ? process.env.SMTP_PASS : true)
  );
}

/**
 * Envoie un e-mail via SMTP si SMTP_HOST et SMTP_FROM sont définis.
 * Sinon journalise uniquement (aucune erreur bloquante).
 *
 * Variables : SMTP_HOST, SMTP_PORT (587 par défaut), SMTP_SECURE (true si 465),
 * SMTP_USER, SMTP_PASS (optionnel si serveur local sans auth),
 * SMTP_FROM (adresse expéditrice, ex. "NEXORA <noreply@votredomaine.com>").
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; mode?: "smtp" | "log"; error?: string }> {
  if (!smtpConfigured()) {
    console.warn(
      "[NEXORA] E-mail non envoyé : configurez SMTP_HOST et SMTP_FROM dans .env (voir .env.example)."
    );
    console.log("[NEXORA EMAIL LOG] À:", to, "|", subject, "|", html.slice(0, 120) + "…");
    return { ok: true, mode: "log" };
  }

  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM!;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth:
        user && pass
          ? { user, pass }
          : undefined,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { ok: true, mode: "smtp" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[NEXORA SMTP]", msg);
    return { ok: false, error: msg };
  }
}
