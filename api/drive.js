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
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const folderRaiz = process.env.DRIVE_FOLDER_ID;
    const folderRaizFacturas = '1Qb8onZgF4W8dv8CPIZ-ohdwyV-YRxV_2';
    const folderRaizProyectos = '1KNa35lpytHrh2qD7Nzg0UZKRpCKzO9sX';
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Helper inteligente: Busca si la carpeta ya existe en la Unidad Compartida, si no, la crea.
    async function obtenerOCrearCarpeta(nombre, idPadre) {
        const resBusqueda = await drive.files.list({
            q: `name='${nombre}' and '${idPadre}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
            supportsAllDrives: true,            // SOPORTE UNIDADES COMPARTIDAS
            includeItemsFromAllDrives: true,    // SOPORTE UNIDADES COMPARTIDAS
            corpora: 'allDrives'                // SOPORTE UNIDADES COMPARTIDAS
        });

        if (resBusqueda.data.files.length > 0) {
            return resBusqueda.data.files[0].id;
        }

        const resCreacion = await drive.files.create({
            resource: {
                name: nombre,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [idPadre]
            },
            fields: 'id',
            supportsAllDrives: true             // SOPORTE UNIDADES COMPARTIDAS
        });
        return resCreacion.data.id;
    }

    // 1. CREACIÓN DE PROYECTO DESDE EL FRONTEND (FORMULARIO)
    if (data.accion === 'crearCarpetaProyecto') {
        const { cliente, fecha, categoria, tipo } = data;
        const folderName = `${cliente} ${fecha}`;
        
        // Crea la estructura anidada: Categoría (Ej. Screen) -> Tipo (Ej. Sweet XV) -> Cliente
        const idCat = await obtenerOCrearCarpeta(categoria, folderRaizProyectos);
        const idTipo = await obtenerOCrearCarpeta(tipo, idCat);
        
        const folder = await drive.files.create({
            resource: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [idTipo]
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true             // SOPORTE UNIDADES COMPARTIDAS
        });

        return res.status(200).json({ status: 'success', urlCarpeta: folder.data.webViewLink });
    } 
    
    // 2. CREACIÓN DE CARPETA PARA FACTURAS (MANAGER)
    else if (data.accion === 'crearCarpetaFactura') {
        // Extraer el año del nombre de la carpeta (Ej. "Factura - LVG0001-2026 - Gabriel") -> "2026"
        const matchAnio = data.nombreCarpeta.match(/-(\d{4}) -/);
        const anioCarpeta = matchAnio ? matchAnio[1] : new Date().getFullYear().toString();
        
        // Buscar o crear la subcarpeta del año dentro de la raíz de comprobantes
        const idCarpetaAnio = await obtenerOCrearCarpeta(anioCarpeta, folderRaizFacturas);

        const folder = await drive.files.create({
            resource: {
                name: data.nombreCarpeta,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [idCarpetaAnio] 
            },
            fields: 'id, webViewLink',
            supportsAllDrives: true             // SOPORTE UNIDADES COMPARTIDAS
        });

        return res.status(200).json({ status: 'success', urlCarpeta: folder.data.webViewLink, idCarpeta: folder.data.id });
    }
    
    // 3. CREACIÓN DIRECTA DESDE EL CHATBOT ALX
    else {
        const folderName = data.nombreCarpeta;
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [folderRaiz]
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id, webViewLink',
            supportsAllDrives: true             // SOPORTE UNIDADES COMPARTIDAS
        });

        return res.status(200).json({ status: 'success', id: folder.data.id, url: folder.data.webViewLink });
    }

  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}