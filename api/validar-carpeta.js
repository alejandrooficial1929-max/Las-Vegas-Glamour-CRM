import { google } from 'googleapis';

export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Método no permitido' });

  try {
    const { linkCarpeta, tareaRequerida } = req.body;
    if (!linkCarpeta || !tareaRequerida) throw new Error("Faltan parámetros de validación.");

    // 1. Extraer ID de la carpeta
    const match = linkCarpeta.match(/[-\w]{25,}/);
    if (!match) throw new Error("El enlace proporcionado no parece ser una carpeta de Google Drive válida.");
    const folderRaizId = match[0];

    // 2. Autenticación Drive
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 3. Inspección Recursiva (CON SOPORTE PARA UNIDADES COMPARTIDAS WORKSPACE)
    let todosLosArchivos = [];
    
    async function fetchCarpetasRecursivo(folderId) {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, size, fileExtension, parents)',
            pageSize: 1000,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives' // <--- ESTE ES EL TRUCO PARA QUE LEA UNIDADES COMPARTIDAS
        });
        const archivos = response.data.files || [];
        todosLosArchivos.push(...archivos);

        const carpetas = archivos.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
        for (const carpeta of carpetas) {
            await fetchCarpetasRecursivo(carpeta.id);
        }
    }
    
    await fetchCarpetasRecursivo(folderRaizId);

    if (todosLosArchivos.length === 0) {
        throw new Error(`La carpeta (ID: ${folderRaizId}) parece estar vacía o el Robot no puede ver su contenido interior. Asegúrate de que los archivos estén subidos y no en la papelera.`);
    }

    // AUDITORÍA APAGADA: Solo devolvemos éxito y el árbol para el explorador
    return res.status(200).json({ 
        status: 'success', 
        arbolArchivos: todosLosArchivos,
        raizId: folderRaizId
    });

  } catch (error) {
    let msg = error.message;
    // Interceptamos bloqueos y los traducimos a instrucciones claras
    if (msg.includes("has not been used in project") || msg.includes("is disabled")) {
        msg = "FALTA HABILITAR LA API EN GOOGLE CLOUD: Copia y entra a este enlace https://console.cloud.google.com/apis/api/drive.googleapis.com/overview?project=583597197408 y haz clic en el botón azul 'Habilitar' (Enable). Espera un par de minutos y vuelve a intentarlo.";
    } else if (msg.includes("File not found")) {
        msg = "El Robot de Vercel no tiene permiso para ver este enlace. Verifica que el correo del robot (alx-drive...) esté agregado en la carpeta de Drive con permisos de Lector o Editor.";
    }
    
    // Devolvemos 400 (Bad Request) para que la consola del navegador no lance el error rojo 500
    return res.status(400).json({ status: "error", message: msg });
  }
}