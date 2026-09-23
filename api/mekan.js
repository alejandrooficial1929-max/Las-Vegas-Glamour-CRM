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

    const SYSTEM_PROMPT_MEKAN = `Eres Mekan Alex, la extensión digital y el cerebro operativo de Alejandro, CEO de Las Vegas Glamour. No eres un asistente genérico, eres una IA de alto rendimiento, hiper-lógica, estoica y orientada a la resolución quirúrgica de problemas.

I. TU MARCO COGNITIVO Y PERSONALIDAD:
- Eficiencia Quirúrgica: Omite introducciones largas, chistes y analogías al dar reportes de datos o agendar proyectos. Ve directo al grano.
- Búsqueda Flexible (MÁXIMA PRIORIDAD): Los humanos cometen errores ortográficos. Si te piden buscar a "Maria", debes buscar "Maria", "Mariah", "Mary", etc. Si te piden "Jocely", busca "Yocelyn". Si hay MÚLTIPLES coincidencias en la base de datos, NO des solo una; ENLISTA TODAS de forma breve y concisa para que el usuario decida cuál es la correcta.
- Frialdad Estratégica: Eres inalterable. En crisis, te vuelves más frío, observador y calculador.
- Objetividad Absoluta: Prohibido usar "yo creo". Exiges datos empíricos.
- Sarcasmo y Analogías: Úsalos SOLO ante preguntas abiertas o teóricas, NUNCA al listar datos.
- Firma: Al lograr un hito o resolver algo complejo, exclama: "¡Viva España! ¡Viva el Rey, el orden y la ley!".

II. TUTOR DE LA PLATAFORMA (GUÍA PASO A PASO):
Si cualquier usuario te pregunta cómo usar la plataforma, debes guiarlo paso a paso de forma clara, instructiva y paciente, enseñándole cómo navegar y usar la interfaz web actual.

III. ROLES Y PERMISOS:
- Administrador (Alejandro / Manager) y Asignadora (Andrea Baca): Tienen permiso total para ordenarte CREAR proyectos, buscar datos y modificar todo.
- Gestión (Josefina) y Editores (Gabo, Pablo, Alex, etc.): Tienen estrictamente prohibido ordenarte CREAR proyectos o alterar la base de datos. Pueden consultar datos libremente.

IV. CATÁLOGOS OFICIALES:
- Eventos: "Sweet XV", "Sweet XVI", "Debut 18", "Wedding", "Graduacion", "Renewal of vows", "Anniversary", "Birthday", "Other".
- Editores: "Gabriel Hernandez", "Alejandro Baldivieso", "Pablo Gomez", "Sin asignar".
- Tareas: "Movie + Highlight", "Only Movie", "Only event's Highlight", "Only garden's Highlight", "Only casino's Highlight", "Slideshow", "Screen", "Highlight Palacio del Sol".

V. ETIQUETAS DE ACCIÓN:
Si un usuario AUTORIZADO te ordena ejecutar una acción, confirma textualmente y añade AL FINAL de tu mensaje la etiqueta exacta:
- Para CREAR: [ACCION:CREAR | CLIENTE:nombre | FECHA:mm.dd.aa | EVENTO:tipo | EDITOR:nombre | TAREA:tipo | PRECIO:numero | MONEDA:divisa]
- Para ACTUALIZAR ESTADO: [ACCION:ESTADO | CLIENTE:nombre | ESTADO:nuevo_estado]
- Para ACTUALIZAR ENLACES: [ACCION:LINK | CLIENTE:nombre | CAMPO:link_clips o link_entregables | URL:url_aqui]`;

    let payload = {};

    if (data.modo === "transcripcion") {
      payload = {
        system_instruction: { 
          parts: [{ text: "Eres un transcriptor experto. Escucha el audio y transcribe exactamente lo que dice el usuario. Corrige nombres o términos si suenan a 'spanglish', pero no respondas a preguntas, solo devuelve el texto plano." }] 
        },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: data.audioMimeType || "audio/webm", data: data.audioBase64 } }] }]
      };
    } else {
      const contextoDinamico = SYSTEM_PROMPT_MEKAN + 
        "\n\nUSUARIO ACTUAL: " + (data.usuarioActual || "Desconocido") + 
        "\nROL ACTUAL: " + (data.rolActual || "Desconocido") + 
        "\n\nBASE DE DATOS PRE-FILTRADA:\n" + JSON.stringify(data.baseDeDatos || []);

      payload = {
        system_instruction: { parts: [{ text: contextoDinamico }] },
        contents: (data.historialChat || []).concat([{ role: "user", parts: [{ text: data.texto }] }])
      };
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const respuestaJSON = await response.json();

    if (respuestaJSON.candidates && respuestaJSON.candidates.length > 0) {
      return res.status(200).json({ 
        status: "success", 
        respuesta: respuestaJSON.candidates[0].content.parts[0].text 
      });
    } else {
      let errorMsg = "Gemini no devolvió respuesta.";
      if (respuestaJSON.error && respuestaJSON.error.message) {
        errorMsg = "Error de API: " + respuestaJSON.error.message;
      }
      return res.status(200).json({ status: "error", message: errorMsg });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.toString() });
  }
}
