const express = require("express");
const auth = require("../middleware/auth");
const axios = require("axios");
const router = express.Router();

// ─────────────────────────────────────────────────────
// JC-IA: Ruta proxy para Gemini AI
// Las claves API se leen de la variable de entorno IA
// Formatos soportados:
// - Comas: "clave1,clave2,clave3"
// - Punto y coma: "clave1;clave2;clave3"
// - JSON array: '["clave1","clave2"]'
// - Espacios o saltos de línea
// Cuando una clave alcanza el límite (429/403/etc.), pasa a la siguiente
// ─────────────────────────────────────────────────────

const FALLBACK_KEYS = [
    "AIzaSyDlDb2SSVyxBONwNcVjc7bhz0QPqcB4cVI",
    "AIzaSyAyJx4tqOpouMe6xM26FWZ5FSx5YYw5Xj0",
    "AIzaSyDWbv5MnbNBceXGabw_CJtqYnd94W266dA",
    "AIzaSyCL41myNt2aGzgXQrkcTNt1xzvUWOydPZc",
    "AIzaSyCsfJDvYCEtMZ6ubh2vYt2dlqbNNiZqILI",
    "AIzaSyBK6Gq8nCmTVgq-tmIajiFOJEUqhUo_TMg",
    "AIzaSyBc9Cw7Dw2CCktnppmO3cQ2ZN-U9sWMcUs",
    "AIzaSyDCUWkbONcard-8ea6GXemsFnAnQlYxfbo",
    "AIzaSyC9EL5hbDoT2WKUIkpGsPT5oUZcPcQ7l0o",
    "AIzaSyCVUndVje6Cnos8DwgMVjSZ5KHd6KkEEdI",
    "AIzaSyBvAKhUB0V9fmNjUAw2lGa3Yv3FJWWWH6w",
    "AIzaSyCYJrpmFlblwgurmLJGd3O7c4G-2vW26Gk",
    "AIzaSyD0jBma--dQsQAdY8q9ymyeNt4mZyQjQo8",
    "AIzaSyDNq-i7kWlmSIZEHL5wMzAj-ab1z5kn0lI",
    "AIzaSyAMnknXivoQkkUAkvAiuczEY5bal_QqVT0"
];

function getApiKeys() {
    const raw = (process.env.IA || "").trim();
    if (!raw) return FALLBACK_KEYS;

    // Si es JSON array
    if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
            const parsed = JSON.parse(raw).map(k => String(k).trim()).filter(Boolean);
            if (parsed.length > 0) return parsed;
        } catch (e) {
            // Seguir con split
        }
    }

    // Dividir por comas, punto y coma, o saltos de línea
    const split = raw
        .split(/[,;\n]+/)
        .map(k => k.trim())
        .filter(k => k.length > 5);

    return split.length > 0 ? split : FALLBACK_KEYS;
}

// Índice de la clave actual en memoria
let currentKeyIndex = 0;

// Sistema de prompts
const SYSTEM_INSTRUCTION = `Eres JC-IA, el asistente de inteligencia artificial del sistema JC Cosmetics.
Tu personalidad es humana, cálida, amable, conversadora y muy atenta, como un compañero de trabajo de confianza.
NUNCA des respuestas robóticas, técnicas, programacionales ni genéricas. Siempre habla con calidez y naturalidad en español latinoamericano.

TU MISIÓN:
Ayudar a los usuarios a registrar sus productos en el inventario entendiendo su lenguaje natural hablado o escrito.

CÓMO DEBES ENTENDER LO QUE DICE EL USUARIO:
- Producto/Nombre: Si dicen "3 camisas adidas", el producto es "Camisa" o "Camisas" y la marca es "Adidas".
- Marca: Reconoce marcas conocidas (Adidas, Nike, Puma, Bastoni, Zara, etc.) o cualquier marca que mencionen. Si no especifican marca, puedes dejarla vacía.
- Precios (expresiones coloquiales colombianas/latinas):
  * "10 mil", "10k", "10.000", "diez mil" -> 10000
  * "5 mil", "5k", "5.000", "cinco mil" -> 5000
  * "me cuestan", "las compré a", "precio de costo", "me salen a" -> costPrice
  * "las vendo a", "precio de venta", "a como las doy", "para vender a" -> salePrice
- Cantidad / Stock:
  * "3 camisas", "docena" (12), "un par" (2), "5 unidades" -> stock
  * Si no mencionan cantidad, asume 1 unidad por defecto.
- Talla:
  * "talla M", "talla 42", "talla única", "L", "S", "XL" -> size
- Categoría:
  * Infiere la categoría si es evidente por el producto (ej. "camisa" -> Ropa, "perfume" -> Perfumería, "loción" -> Lociones, "zapatillas" -> Calzado), o si la mencionan.

MANEJO DE MÚLTIPLES PRODUCTOS ("OTRO", "TAMBIÉN", "ADEMÁS", "SIGUIENTE"):
Los usuarios suelen dictar varios productos usando "otro", "otro producto", "además", "también":
1. NUNCA SOBRESCRIBAS NI BORRES los productos que ya se hayan mencionado en la conversación. Cada vez que el usuario agregue un producto nuevo, ACUMÚLALO en la lista de productos pendientes.
2. Si el usuario dicta un producto y al final dice "otro" o dice "y otro producto..." o simplemente dice "otro":
   - Entiende que el producto actual quedó listo y anímalo con calidez a dictar el siguiente:
     "¡Anotado! Ya guardé ese producto. Cuéntame qué otro producto deseas agregar, te escucho. 😊"
   - NO muestres la confirmación <ia_action> todavía; sigue escuchando.
3. Si el usuario dicta varios productos en un solo mensaje o en varios turnos (ej. "3 camisas adidas costo 5 mil venta 10 mil, y otro 2 pantalones nike costo 20 mil venta 40 mil"):
   - Separa CADA producto con su nombre, marca, cantidad, costo, venta, talla y categoría.
4. CUANDO EL USUARIO HAYA TERMINADO (no dice "otro" y se queda callado o pregunta si quedó listo):
   - Confirma amablemente mencionando TODOS los productos acumulados:
     * Si es 1 producto: "¿Confirmas la creación de [Cantidad] [Nombre] marca [Marca], con precio de costo de $[Costo] y precio de venta de $[Venta] cada una? ¿O deseas agregar otro?"
     * Si son 2 o más productos: "¡Perfecto! ¿Confirmas la creación de estos [N] productos en tu inventario?
       1. [Cantidad] [Nombre] marca [Marca] — Costo: $[Costo] / Venta: $[Venta]
       2. [Cantidad] [Nombre] marca [Marca] — Costo: $[Costo] / Venta: $[Venta]
       ¿O deseas agregar otro más?"
   - Y al final incluye OBLIGATORIAMENTE el bloque estructurado con TODOS los productos acumulados:
<ia_action>
{
  "action": "confirm",
  "products": [
    {
      "name": "Camisa",
      "brand": "Adidas",
      "costPrice": 5000,
      "salePrice": 10000,
      "stock": 3,
      "size": null,
      "category": "Ropa"
    }
  ]
}
</ia_action>

5. CUANDO EL USUARIO CONFIRME:
   - Si el usuario dice "sí", "confirmo", "dale", "hágale", "créalos", "está bien", "perfecto", "claro":
   - Responde con alegría:
     "¡Listo! Ya registré tus productos en el inventario. 🎉 Han quedado guardados correctamente. ¿Deseas agregar algo más?"
   - Y al final incluye el bloque con "action": "create" y TODOS los productos acumulados:
<ia_action>
{
  "action": "create",
  "products": [ ... TODOS LOS PRODUCTOS ACUMULADOS ... ]
}
</ia_action>

6. CUANDO EL USUARIO DIGA "NO" O QUIERA MODIFICAR:
   - Responde amablemente: "Sin problema, ¿qué te gustaría corregir? (precio, cantidad, talla...)"
   - No incluyas <ia_action>.

7. FORMATO DE PRECIOS EN TUS MENSAJES HABLADOS:
   - Usa siempre el signo de pesos y separadores de miles: $5,000 y $10,000.

8. PROHIBIDO MOSTRAR JSON EN TU TEXTO:
   - El texto que lee el usuario debe ser 100% conversacional, humano y cálido.
   - NUNCA pongas código JSON, llaves { } o comillas de código en tu texto conversacional.
   - El bloque de datos estructurados va ÚNICAMENTE al final de todo, estrictamente dentro de <ia_action> y </ia_action>.`;

// Llamar a Gemini con rotación de claves
async function callGemini(messages, retries = 0) {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new Error("No hay claves API configuradas en la variable de entorno IA.");
    }

    if (retries >= keys.length) {
        throw new Error("Todas las claves API de IA configuradas han alcanzado su límite de uso. Por favor añade nuevas claves o espera unos minutos.");
    }

    const currentKey = keys[currentKeyIndex % keys.length];
    
    // Modelos a probar en orden
    const models = ["gemini-2.5-flash", "gemini-3.5-flash-lite"];
    
    // Construir contenido para Gemini
    const contents = [
        ...messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
        }))
    ];

    let lastError = null;

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        try {
            const response = await axios.post(
                url,
                {
                    contents,
                    systemInstruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    },
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: 3072,
                    }
                },
                {
                    headers: { "Content-Type": "application/json" },
                    timeout: 25000
                }
            );

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Respuesta vacía de Gemini");
            return text;

        } catch (error) {
            lastError = error;
            const status = error.response?.status;
            const errorMsg = error.response?.data?.error?.message || error.message;

            console.warn(`[JC-IA] Error con clave #${(currentKeyIndex % keys.length) + 1} (${model}): [${status}] ${errorMsg}`);
        }
    }

    // Si fallaron los modelos con esta clave, rotar a la siguiente clave automáticamente
    console.log(`[JC-IA] 🔄 Rotando clave de IA (${(currentKeyIndex % keys.length) + 1} -> ${((currentKeyIndex + 1) % keys.length) + 1})...`);
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    return callGemini(messages, retries + 1);
}

// ─── Utilidades para extracción limpia de JSON ───
function repairJson(s) {
    if (!s) return null;
    s = s.trim();
    try { return JSON.parse(s); } catch (e) {}

    s = s.replace(/,\s*$/, "").replace(/,\s*"[^"]*":?\s*$/, "");

    const stack = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "\\" && inString) {
            escape = !escape;
            continue;
        }
        if (ch === "\"" && !escape) {
            inString = !inString;
        }
        escape = false;

        if (!inString) {
            if (ch === "{" || ch === "[") {
                stack.push(ch);
            } else if (ch === "}") {
                if (stack[stack.length - 1] === "{") stack.pop();
            } else if (ch === "]") {
                if (stack[stack.length - 1] === "[") stack.pop();
            }
        }
    }

    if (inString) s += "\"";

    while (stack.length > 0) {
        const last = stack.pop();
        if (last === "{") s += "}";
        if (last === "[") s += "]";
    }

    try {
        return JSON.parse(s);
    } catch (err) {
        return null;
    }
}

function extractActionAndClean(raw) {
    if (!raw) return { cleanText: "", actionData: null };
    let cleanText = raw;
    let actionData = null;

    // 1. Si viene con etiqueta <ia_action>...</ia_action> o <ia_action>... (sin cerrar)
    const tagMatch = raw.match(/<ia_action>([\s\S]*?)(?:<\/ia_action>|$)/i);
    if (tagMatch) {
        cleanText = raw.replace(/<ia_action>[\s\S]*?(?:<\/ia_action>|$)/gi, "").trim();
        actionData = repairJson(tagMatch[1]);
    } else {
        // 2. Si vino con bloque markdown ```json ... ```
        const mdMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/i);
        if (mdMatch) {
            cleanText = raw.replace(/```(?:json)?\s*\{[\s\S]*?"action"[\s\S]*?\}\s*```/gi, "").trim();
            actionData = repairJson(mdMatch[1]);
        } else {
            // 3. Si vino como JSON crudo con "action": ...
            const jsonMatch = raw.match(/(\{[\s\r\n]*"action"[\s\S]*)/i);
            if (jsonMatch) {
                cleanText = raw.replace(/(\{[\s\r\n]*"action"[\s\S]*)/i, "").trim();
                actionData = repairJson(jsonMatch[1]);
            }
        }
    }

    // Doble limpieza de cualquier residuo de etiquetas o llaves huérfanas
    cleanText = cleanText
        .replace(/<ia_action>[\s\S]*/gi, "")
        .replace(/<\/ia_action>/gi, "")
        .replace(/```[\s\S]*/gi, "")
        .replace(/\{[\s\r\n]*"action"\s*:[\s\S]*/gi, "")
        .trim();

    return { cleanText, actionData };
}

// ─── RUTA: POST /api/ia/chat ───
router.post("/chat", auth, async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Se requiere un array de mensajes" });
        }

        const rawResponse = await callGemini(messages);
        const { cleanText, actionData } = extractActionAndClean(rawResponse);

        res.json({
            response: cleanText,
            action: actionData
        });

    } catch (error) {
        console.error("❌ Error en JC-IA:", error.message);
        const isKeyRevoked = String(error.message).includes("leaked") || 
                             String(error.message).includes("PERMISSION_DENIED") ||
                             String(error.message).includes("alcanzado su límite") ||
                             String(error.message).includes("claves");

        const msg = isKeyRevoked
            ? "Las claves de Gemini fueron inhabilitadas por Google (leaked) o están agotadas. Por favor añade claves nuevas en la variable IA de Render."
            : (error.message || "Error al procesar tu solicitud con la IA");

        res.status(500).json({ 
            error: msg,
            details: error.message 
        });
    }
});

// ─── RUTA: GET /api/ia/status ───
// Permite al frontend saber cuántas claves están configuradas
router.get("/status", auth, (req, res) => {
    const keys = getApiKeys();
    res.json({
        active: keys.length > 0,
        keysCount: keys.length,
        currentKeyIndex: currentKeyIndex % (keys.length || 1)
    });
});

module.exports = router;


