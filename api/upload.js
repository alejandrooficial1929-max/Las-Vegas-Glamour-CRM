import { google } from 'googleapis';
import { Readable } from 'stream';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');

  try {
    const { nombreCarpeta, imagenBase64, mimeType, nombreArchivo } = req.body;
    
    if (!imagenBase64) throw new Error("No se recibió ninguna imagen.");

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const folderRaiz = process.env.DRIVE_FOLDER_ID;
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Buscamos la carpeta del cliente dentro de tu Drive
    const resBusqueda = await drive.files.list({
      q: `name='${nombreCarpeta}' and '${folderRaiz}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (resBusqueda.data.files.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No encontré la carpeta del proyecto en Drive.' });
    }

    const idCarpetaDestino = resBusqueda.data.files[0].id;

    // 2. Convertimos la imagen recibida a un formato que Drive entienda
    const buffer = Buffer.from(imagenBase64.split(',')[1] || imagenBase64, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 3. Subimos la foto directamente a esa subcarpeta
    const file = await drive.files.create({
      resource: {
        name: nombreArchivo || 'Nota_de_Clips.jpg',
        parents: [idCarpetaDestino]
      },
      media: {
        mimeType: mimeType || 'image/jpeg',
        body: stream
      },
      fields: 'id, webViewLink',
    });

    return res.status(200).json({ status: 'success', url: file.data.webViewLink });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
