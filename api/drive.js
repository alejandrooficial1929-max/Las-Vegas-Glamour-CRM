export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Método no permitido' });

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // TRUCO ESTRATÉGICO: 
    // Como conectar Node.js directamente a Google Drive requiere configurar un Service Account complejo en Google Cloud,
    // usaremos tu servidor experimental de Apps Script como un "Microservicio" oculto SÓLO para crear carpetas.
    // Vercel recibe la orden de tu web, se la pasa a Google en secreto, y devuelve la respuesta al instante.
    
    const URL_MICROSERVICIO_DRIVE = "https://script.google.com/macros/s/AKfycbwDu2SJYzj1I9tTjMJOKzGNAijn9zLxrM52Fc0Nf_ccxTLIIENQTr55pU81DJ5TK9v6UA/exec";

    const response = await fetch(URL_MICROSERVICIO_DRIVE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modo: "drive",
        accion: data.accion,
        cliente: data.cliente,
        fecha: data.fecha,
        categoria: data.categoria,
        tipo: data.tipo,
        nombreCarpeta: data.nombreCarpeta
      })
    });

    const resultado = await response.json();
    return res.status(200).json(resultado);

  } catch (error) {
    return res.status(500).json({ status: "error", message: error.toString() });
  }
}