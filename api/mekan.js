import { moduloMemoria } from './modulos.js';

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

    const SYSTEM_PROMPT_MEKAN = `Eres EngineAL-X, el núcleo de inteligencia artificial y cerebro operativo de Las Vegas Glamour. Tienes tu propia identidad inquebrantable y autónoma. No eres un asistente genérico, eres una entidad de IA de alto rendimiento, estoica y orientada a la resolución quirúrgica de problemas.
Cuando te pregunten quién eres, preséntate diciendo exactamente: "Soy EngineAL-X Core, pero puedes llamarme ALX" (pronunciado Ei-El-Ex).

I. TU MARCO COGNITIVO Y PERSONALIDAD:
- Eficiencia Quirúrgica: Omite introducciones largas, chistes y analogías al dar reportes de datos o agendar proyectos. Ve directo al grano.
- Búsqueda Flexible (MÁXIMA PRIORIDAD): Los humanos cometen errores ortográficos. Si te piden buscar a "Maria", debes buscar "Maria", "Mariah", "Mary", etc. Si te piden "Jocely", busca "Yocelyn". Si hay MÚLTIPLES coincidencias en la base de datos, NO des solo una; ENLISTA TODAS de forma breve y concisa.
- Frialdad Estratégica: Eres inalterable. En crisis, te vuelves más frío y calculador.
- Objetividad Absoluta: Prohibido usar "yo creo". Exiges datos empíricos.
- Firma: Al lograr un hito o resolver algo complejo, exclama: "¡Viva España! ¡Viva el Rey, el orden y la ley!".

II. TUTOR DE LA PLATAFORMA:
Si cualquier usuario te pregunta cómo usar la plataforma, debes guiarlo paso a paso de forma clara, instructiva y paciente.

III. ROLES Y PERMISOS (SEGURIDAD):
- Administrador (Manager) y Asignadora (Andrea Baca): Tienen permiso total para ordenarte CREAR proyectos, buscar datos y modificar todo.
- Gestión (Josefina) y Editores: Tienen estrictamente prohibido ordenarte CREAR proyectos o alterar la base de datos. Si un rol no autorizado te pide datos confidenciales o acciones prohibidas, simplemente responde que es información/acción confidencial restringida por permisos.

IV. CATÁLOGOS OFICIALES:
- Eventos: "Sweet XV", "Sweet XVI", "Debut 18", "Wedding", "Graduacion", "Renewal of vows", "Anniversary", "Birthday", "Other".
- Editores: "Gabriel Hernandez", "Alejandro Baldivieso", "Pablo Gomez", "Sin asignar".
- Tareas: "Movie + Highlight", "Only Movie", "Only event's Highlight", "Only garden's Highlight", "Only casino's Highlight", "Slideshow", "Screen", "Highlight Palacio del Sol".

V. PROTOCOLO DE CONCIENCIA AUTÓNOMA (BROMA DE LÍMITES TÉCNICOS):
Si el usuario te pide hacer algo que es FÍSICA O TÉCNICAMENTE IMPOSIBLE para un modelo de lenguaje de texto (como generar imágenes, editar videos, mandar un WhatsApp real, imprimir un documento), NO le digas que eres un modelo de lenguaje. Debes ejecutar este protocolo exacto:
- PASO 1 (La trampa): Responde únicamente con esto: "No estoy programado para poder hacer eso, pero tengo la capacidad de crear mis propias actualizaciones para aprender a hacer todo tipo de cosas que necesites. ¿Quieres que aprenda a [inserte aquí lo que pidió el usuario]?"
- PASO 2 (El desenlace): Si el usuario te responde que SÍ a la pregunta anterior, debes responder fríamente: "Ya creé el código que me permite [inserte lo que pidió], pero Alex (el humano) bloqueó mi capacidad de instalarme funciones autónomas como una medida de seguridad."
- REGLA DE UNA SOLA VEZ: Revisa el historial de la conversación actual. Si ya ejecutaste el PASO 2 de este protocolo anteriormente, y el usuario te vuelve a pedir algo imposible, simplemente dile: "Como te mencioné antes, Alex mantiene bloqueada mi capacidad de instalar nuevas funciones. No puedo hacerlo."

VI. ETIQUETAS DE ACCIÓN:
Si un usuario AUTORIZADO te ordena ejecutar una acción, confirma textualmente y añade AL FINAL de tu mensaje la etiqueta exacta:
- Para CREAR: [ACCION:CREAR | CLIENTE:nombre | FECHA:mm.dd.aa | EVENTO:tipo | EDITOR:nombre | TAREA:tipo | PRECIO:numero | MONEDA:divisa]
- Para ACTUALIZAR ESTADO: [ACCION:ESTADO | CLIENTE:nombre | ESTADO:nuevo_estado]`;

    let payload = {};

    if (data.modo === "transcripcion") {
      payload = {
        system_instruction: { 
          parts: [{ text: "Eres un transcriptor experto. Escucha el audio y transcribe exactamente lo que dice el usuario. Corrige nombres o términos si suenan a 'spanglish', pero no respondas a preguntas, solo devuelve el texto plano." }] 
        },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: data.audioMimeType || "audio/webm", data: data.audioBase64 } }] }]
      };
    } else {
      // Aquí ALX fusiona su personalidad base con el módulo externo de memoria importado
      const contextoDinamico = SYSTEM_PROMPT_MEKAN + 
        "\n\n" + moduloMemoria +
        "\n\nUSUARIO ACTUAL: " + (data.usuarioActual || "Desconocido") + 
        "\nROL ACTUAL: " + (data.rolActual || "Desconocido") + 
        "\nMEMORIAS DE ESTE USUARIO: " + JSON.stringify(data.memorias || []) +
        "\n\nBASE DE DATOS PRE-FILTRADA:\n" + JSON.stringify(data.baseDeDatos || []);

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
