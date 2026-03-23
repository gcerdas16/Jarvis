import { prisma } from "../utils/db";

const CAMPAIGN = {
  name: "Campaña General — Automatización e IA",
  subjectLine: "Una consulta rápida",
  bodyTemplate: `<p>Buenos días,</p>

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

<p>Quedo atento,</p>`,

  followUp1: `<p>Buenos días,</p>

<p>Le escribí hace unos días sobre automatización para su empresa.</p>

<p>Solo quería reforzar algo: muchas de las empresas con las que trabajo tenían el mismo problema — procesos que se hacían manual porque "siempre se hizo así". Hoy esos mismos procesos corren solos.</p>

<p>Si tienen algo que les quite tiempo, con gusto lo evaluamos en una llamada de 10 minutos.</p>

<p>Saludos,</p>`,

  followUp2: `<p>Buenos días,</p>

<p>Este es mi último seguimiento. Si la automatización no es prioridad en este momento lo entiendo perfectamente.</p>

<p>Pero si más adelante necesitan evaluar opciones para ahorrar tiempo en su operación, mi correo queda abierto.</p>

<p>Saludos,</p>`,

  followUp3: null,
};

async function main() {
  console.log("[Seed] Creating campaign...");

  // Deactivate all existing campaigns
  await prisma.campaign.updateMany({ data: { isActive: false } });

  const campaign = await prisma.campaign.create({
    data: {
      name: CAMPAIGN.name,
      subjectLine: CAMPAIGN.subjectLine,
      bodyTemplate: CAMPAIGN.bodyTemplate,
      followUp1: CAMPAIGN.followUp1,
      followUp2: CAMPAIGN.followUp2,
      followUp3: CAMPAIGN.followUp3,
      isActive: true,
    },
  });

  console.log(`[Seed] Campaign created: ${campaign.id}`);
  console.log(`[Seed] Name: ${campaign.name}`);
  console.log(`[Seed] Active: ${campaign.isActive}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
