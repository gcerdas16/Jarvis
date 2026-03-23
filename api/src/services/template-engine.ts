interface TemplateVars {
  industry?: string | null;
  companyType?: string | null;
  description?: string | null;
}

const SIGNATURE = `
<br/>
<table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif;">
  <tr>
    <td style="border-top: 3px solid #2563eb; padding-top: 16px;">
      <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: bold; color: #2563eb; letter-spacing: 1px;">GCWARE</p>
      <p style="margin: 0 0 2px 0; font-size: 14px; font-weight: bold; color: #1a1a1a;">Gustavo Cerdas</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #555;">AI & Automation Engineer</p>
      <p style="margin: 0; font-size: 13px; color: #555;">
        📞 +506 7109-7223 &nbsp;|&nbsp; 🌐 <a href="https://gcwarecr.com" style="color: #2563eb; text-decoration: none;">gcwarecr.com</a>
      </p>
    </td>
  </tr>
</table>`;

const UNSUBSCRIBE_TEXT = `
<br/>
<p style="font-size: 11px; color: #999;">
  Si no deseas recibir más información, simplemente responde a este correo
  indicando que deseas ser removido de nuestra lista.
</p>`;

export function renderTemplate(template: string, vars: TemplateVars): string {
  let result = template;

  result = result.replace(/\{\{industry\}\}/g, vars.industry || "su sector");
  result = result.replace(/\{\{companyType\}\}/g, vars.companyType || "organización");
  result = result.replace(/\{\{description\}\}/g, vars.description || "");

  result += SIGNATURE;
  result += UNSUBSCRIBE_TEXT;

  return result;
}
