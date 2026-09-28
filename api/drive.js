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
    
    // 1. Extraemos las llaves maestras de la bóveda de Vercel (Variables de Entorno)
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const folderRaiz = process.env.DRIVE_FOLDER_ID;
    
    // 2. Nos identificamos en Google Drive con la librería oficial
    const { google } = await import('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 3. Creamos la carpeta usando el nombre enviado por ALX
    const fileMetadata = {
      name: data.nombreCarpeta,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folderRaiz]
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, webViewLink',
    });

    // 4. Devolvemos el link de éxito a la PWA
    return res.status(200).json({ 
        status: 'success', 
        id: folder.data.id, 
        url: folder.data.webViewLink 
    });

  } catch (error) {
    return res.status(500).json({ status: "error", message: error.toString() });
  }
}
