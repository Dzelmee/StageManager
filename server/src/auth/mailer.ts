import { IS_PRODUCTION } from "./config";
import { maskEmail } from "./crypto";

type AccountEmail = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Ponto único de envio de e-mail.
 *
 * Nesta versão não há provedor SMTP configurado. Em produção, plugue
 * aqui um serviço transacional (Resend, SES, Postmark...) e mantenha
 * o token fora dos logs. Em desenvolvimento, o link é impresso no
 * terminal para permitir testar o fluxo.
 */
export async function sendAccountEmail(
  email: AccountEmail
) {
  if (process.env.SMTP_URL) {
    console.warn(
      "SMTP_URL configurada, mas nenhum provedor de e-mail foi implementado ainda. O e-mail não foi enviado."
    );
  }

  console.info(
    `[auth][email] "${email.subject}" para ${maskEmail(
      email.to
    )}`
  );

  if (!IS_PRODUCTION) {
    console.info(`[auth][email][dev] ${email.text}`);
  }
}
