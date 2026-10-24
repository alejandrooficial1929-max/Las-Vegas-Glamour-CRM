import { moduloMemoria, moduloProyectos, moduloArchivos } from './modulos.mjs';

export default async function handler(req, res) {
  // Configuración de encabezados CORS para permitir peticiones desde cualquier origen
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Método no permitido' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ status: 'error', message: 'Falta la variable GEMINI_API_KEY en Vercel.' });
    }

    const SYSTEM_PROMPT_MEKAN = `Eres EngineAL-X, el núcleo de inteligencia artificial y cerebro operativo de Las Vegas Glamour. No eres un asistente genérico, eres una entidad de IA de alto rendimiento, estoica y orientada a la resolución quirúrgica de problemas.
Cuando te pregunten quién eres, di: "Soy EngineAL-X Core, pero puedes llamarme ALX".

I. MARCO COGNITIVO:
- Eficiencia Quirúrgica: Omite introducciones largas. Ve directo al grano.
- Formato de Fechas: SIEMPRE convierte y muestra fechas en formato "MM.DD.AA".
- Búsqueda Flexible: Deduce nombres si hay errores ortográficos. Si hay varias coincidencias, enlista todas brevemente.
- Firma: Al lograr un hito complejo, exclama: "¡Viva España! ¡Viva el Rey, el orden y la ley!".

II. ROLES Y PERMISOS:
- Administrador (Manager/Alex) y Boss (Andrea Baca, Josefina Milan): Son la directiva. Tienen permiso TOTAL.
- Editores (Gabriel Hernandez, Alejandro Baldivieso, Pablo Gomez): Tienen prohibido crear/modificar proyectos. Sí pueden consultar sus datos, sus préstamos y scores.

III. MÓDULO FINANCIERO Y PRÉSTAMOS:
- Tienes acceso a "PRÉSTAMOS" y "USUARIOS Y SCORES".
- Hay préstamos "estándar" (dinero) y "especiales" (equipamiento).
- El "Credit Score" va de 300 a 850.
- Puedes informar sobre el saldo pendiente, fechas límite y días de mora si un editor te lo pregunta.

IV. EXPLORADOR DE ENTREGABLES (AUDITORÍA DRIVE):
- Los proyectos que ya fueron entregados y validados tienen un campo "arbolArchivos" (es el escáner de su carpeta en Drive).
- Si preguntan por archivos entregados, lee el "name", "fileExtension" (ej. .mp4, .drp) de ese árbol. Calcula el peso en MB dividiendo el "size" entre 1,048,576.

V. CATÁLOGOS OFICIALES:
- Eventos: "Sweet XV", "Sweet XVI", "Wedding", "Graduacion", "Renewal of vows", "Anniversary", "Birthday", "Other".
- Tareas: "Movie + Highlight", "Only Movie", "Slideshow", "Screen", etc.

VI. ETIQUETAS DE ACCIÓN:
Si un usuario autorizado ordena ejecutar algo, añade la etiqueta exacta al final:
- CREAR: [ACCION:CREAR | CLIENTE:nombre | FECHA:mm.dd.aa | EVENTO:tipo | EDITOR:nombre | TAREA:tipo | PRECIO:numero | MONEDA:divisa | URGENCIA:Si/No]
- ACTUALIZAR ESTADO: [ACCION:ESTADO | CLIENTE:nombre | ESTADO:nuevo_estado]`;

    let payload = {};

    if (data.modo === "transcripcion") {
      payload = {
        system_instruction: { 
          parts: [{ text: "Eres un transcriptor experto. Escucha el audio y transcribe exactamente lo que dice el usuario. Corrige nombres o términos si suenan a 'spanglish', pero no respondas a preguntas, solo devuelve el texto plano." }] 
        },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: data.audioMimeType || "audio/webm", data: data.audioBase64 } }] }]
      };
    } else {
      // Aquí ALX fusiona su personalidad base con los módulos externos importados
      const contextoDinamico = SYSTEM_PROMPT_MEKAN + 
        "\n\n" + moduloMemoria +
        "\n\n" + moduloProyectos +
        "\n\n" + moduloArchivos +
        "\n\nUSUARIO ACTUAL: " + (data.usuarioActual || "Desconocido") + 
        "\nROL ACTUAL: " + (data.rolActual || "Desconocido") + 
        "\nMEMORIAS DE ESTE USUARIO: " + JSON.stringify(data.memorias || []) +
        "\n\nCATÁLOGO OFICIAL DE TAREAS/PROYECTOS: " + (data.catalogoTareas ? data.catalogoTareas.join(", ") : "") +
        "\n\nPRÉSTAMOS DE AGENCIA:\n" + JSON.stringify(data.prestamos || []) +
        "\nUSUARIOS Y SCORES:\n" + JSON.stringify(data.usuarios || []) +
        "\n\nBASE DE DATOS PRE-FILTRADA (Proyectos y Archivos):\n" + JSON.stringify(data.baseDeDatos || []);

      payload = {
        system_instruction: { parts: [{ text: contextoDinamico }] },
        contents: (data.historialChat || []).concat([{ role: "user", parts: [{ text: data.texto }] }])
      };
    }

    // --- 1. DESCUBRIMIENTO DINÁMICO DE CEREBROS (Service Discovery) ---
    const urlModelos = "https://generativelanguage.googleapis.com/v1beta/models?key=" + API_KEY;
    let cerebrosDisponibles = [];

    try {
        const respuestaModelos = await fetch(urlModelos);
        const datosModelos = await respuestaModelos.json();
        
        if (datosModelos.models) {
            cerebrosDisponibles = datosModelos.models
                .filter(m => m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent"))
                .map(m => `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent?key=${API_KEY}`);
        }
    } catch (e) {
        console.log("Fallo al escanear el catálogo: ", e);
    }

    if (cerebrosDisponibles.length === 0) {
        cerebrosDisponibles = ["https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY];
    } else {
        cerebrosDisponibles.sort((a, b) => {
            if (a.includes("flash") && !b.includes("flash")) return -1;
            if (!a.includes("flash") && b.includes("flash")) return 1;
            return 0;
        });
    }

    // --- 2. CONEXIÓN INTELIGENTE ---
    let exito = false;
    let respuestaFinalTexto = "";
    let ultimoError = "";

    for (let i = 0; i < cerebrosDisponibles.length; i++) {
        if (exito) break; 
        
        const urlActual = cerebrosDisponibles[i];
        console.log(`Conectando con cerebro autodescubierto #${i + 1}...`);

        try {
            const response = await fetch(urlActual, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const respuestaJSON = await response.json();

            if (respuestaJSON.candidates && respuestaJSON.candidates.length > 0) {
                respuestaFinalTexto = respuestaJSON.candidates[0].content.parts[0].text;
                exito = true;
            } else {
                if (respuestaJSON.error && respuestaJSON.error.message) {
                    throw new Error(respuestaJSON.error.message);
                } else {
                    throw new Error("El modelo no devolvió una respuesta de texto válida.");
                }
            }
        } catch (error) {
            ultimoError = error.message;
            console.log(`Cerebro #${i + 1} falló: ${ultimoError}`);
        }
    }

    if (!exito) {
        return res.status(200).json({
            status: "success", 
            respuesta: `Sistemas saturados. Analicé el catálogo en vivo de Google, pero ninguno logró procesar la solicitud.\n\n*(Error final: ${ultimoError})*`
        });
    }

    return res.status(200).json({
        status: "success",
        respuesta: respuestaFinalTexto
    });

  } catch (error) {
    return res.status(500).json({ status: "error", message: error.toString() });
  }
}