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

    // 3. Inspección Recursiva
    let todosLosArchivos = [];
    
    async function fetchCarpetasRecursivo(folderId) {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, size, fileExtension, parents)',
            pageSize: 1000
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
        throw new Error("La carpeta está vacía o es inaccesible (asegúrate de darle permisos de lectura a la cuenta de servicio).");
    }

    // 4. MOTOR DE VALIDACIÓN DE REGLAS (AUDITORÍA)
    const tareaL = tareaRequerida.toLowerCase();
    const soloArchivos = todosLosArchivos.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
    const nombresArchivos = soloArchivos.map(f => f.name.toLowerCase());
    const extensiones = soloArchivos.map(f => (f.fileExtension || "").toLowerCase());

    // Regla 1: Bloqueo de Formatos de Video Prohibidos
    const formatosProhibidos = ['mov', 'avi', 'mkv', 'wmv', 'flv'];
    const videosProhibidos = extensiones.filter(ext => formatosProhibidos.includes(ext));
    if (videosProhibidos.length > 0) {
        throw new Error("RECHAZADO: Se encontraron formatos de video no permitidos (.mov, .avi, etc). Todos los videos deben ser .mp4.");
    }

    // Regla 2: Plantillas Obligatorias si hay película
    if (tareaL.includes("movie")) {
        const tienePlantilla = extensiones.some(ext => ['drp', 'prproj', 'fcpxml', 'aep'].includes(ext));
        if (!tienePlantilla) throw new Error("RECHAZADO: Falta el archivo de proyecto o plantilla (.drp, .prproj, .fcpxml). Es obligatorio para Movies.");
    }

    // Regla 3: Nomenclatura y Tareas Cumplidas
    if (tareaL.includes("movie") && !nombresArchivos.some(n => n.includes("movie") || n.includes("pelicula"))) {
        throw new Error("RECHAZADO: No se encontró ningún archivo nombrado como 'Movie' o 'Pelicula'.");
    }
    if (tareaL.includes("highlight") && !nombresArchivos.some(n => n.includes("highlight") || n.includes("resumen"))) {
        throw new Error("RECHAZADO: No se encontró ningún archivo nombrado como 'Highlight'.");
    }
    if (tareaL.includes("slideshow") && !nombresArchivos.some(n => n.includes("slide"))) {
        throw new Error("RECHAZADO: No se encontró ningún archivo nombrado como 'Slideshow'.");
    }

    // Si pasa todas las auditorías, devolvemos éxito y el árbol
    return res.status(200).json({ 
        status: 'success', 
        arbolArchivos: todosLosArchivos,
        raizId: folderRaizId
    });

  } catch (error) {
    let msg = error.message;
    // Interceptamos el bloqueo de Google Cloud y lo traducimos a instrucciones claras
    if (msg.includes("has not been used in project") || msg.includes("is disabled")) {
        msg = "FALTA HABILITAR LA API EN GOOGLE CLOUD: Copia y entra a este enlace https://console.cloud.google.com/apis/api/drive.googleapis.com/overview?project=583597197408 y haz clic en el botón azul 'Habilitar' (Enable). Espera un par de minutos y vuelve a intentarlo.";
    }
    // Devolvemos 400 (Bad Request) para que la consola del navegador no lance el error rojo 500
    return res.status(400).json({ status: "error", message: msg });
  }
}
