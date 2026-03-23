import "dotenv/config";
import { sendEmail } from "../services/resend-client";
import { renderTemplate } from "../services/template-engine";

const TEST_RECIPIENTS = ["gcwarecr@gmail.com"];

const SUBJECT = "Una consulta rápida";

const BODY_TEMPLATE = `<p>Buenos días,</p>

<p>Mi nombre es Gustavo Cerdas, me dedico a implementar automatizaciones e inteligencia artificial para empresas aquí en Costa Rica.</p>

<p>Le escribo porque ando buscando empresas que tengan interés en mejorar algún proceso interno, y quería preguntarle directamente:</p>

<p><strong>¿Hay algo en su operación diaria que sienten que les consume demasiado tiempo o que podrían hacer mejor?</strong></p>

<p>Le comento porque es lo que hago todos los días. Por ejemplo:</p>

<ul>
  <li>Sistemas que leen facturas con IA y las registran automáticamente en inventario y contabilidad — sin que nadie tenga que digitar nada</li>
  <li>Chatbots de WhatsApp para atender clientes, agendar citas o recibir pedidos a cualquier hora</li>
  <li>Conexiones entre sistemas que ya usan para que no tengan que estar pasando datos a mano</li>
</ul>

<p>Si tienen algo identificado o simplemente quieren explorar opciones, con gusto lo conversamos por aquí o en una llamada corta.</p>

<p>Quedo atento,</p>`;

async function main() {
  console.log("[Test] Sending test emails...");

  const rendered = renderTemplate(BODY_TEMPLATE, {});

  for (const to of TEST_RECIPIENTS) {
    console.log(`[Test] Sending to ${to}...`);
    const messageId = await sendEmail({ to, subject: SUBJECT, body: rendered });

    if (messageId) {
      console.log(`[Test] Sent to ${to} — ID: ${messageId}`);
    } else {
      console.error(`[Test] FAILED to send to ${to}`);
    }
  }

  console.log("[Test] Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
