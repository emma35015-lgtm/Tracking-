import type { SupabaseClient } from "@supabase/supabase-js";

// "OXXO CONDESA #1234  " → "oxxo condesa"
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/[#*]?\d{3,}/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mapa de keywords → nombre de categoría default (sembrada en el signup).
// Se evalúa solo si el usuario no tiene una regla propia para el comercio.
const KEYWORD_MAP: [RegExp, string][] = [
  [/\b(uber eats|didi food|rappi|mcdonald|burger|kfc|domino|pizza|starbucks|cafe|caf[eé]teria|restaurante?|taquer[ií]a|sushi|oxxo|7 eleven|seven eleven)\b/, "Comida"],
  [/\b(walmart|soriana|chedraui|bodega aurrera|aurrera|costco|sams|sam s|la comer|heb|h e b|superama|mercado|abarrotes|super)\b/, "Supermercado"],
  [/\b(uber|didi|cabify|taxi|metro|metrobus|gasolinera|gasolina|pemex|estacionamiento|parking|caseta|autopista)\b/, "Transporte"],
  [/\b(cfe|telmex|izzi|totalplay|megacable|agua|gas natural|home depot|ikea|ferreter[ií]a|mueble)\b/, "Hogar"],
  [/\b(farmacia|farmacias|similares|guadalajara|del ahorro|doctor|dentista|hospital|laboratorio|gimnasio|gym|smartfit)\b/, "Salud"],
  [/\b(cinepolis|cinemex|cine|teatro|concierto|boletia|ticketmaster|bar|cantina|videojuego|steam|playstation|nintendo|xbox)\b/, "Entretenimiento"],
  [/\b(zara|bershka|pull bear|h m|shein|liverpool|palacio de hierro|suburbia|nike|adidas|zapater[ií]a)\b/, "Ropa"],
  [/\b(netflix|spotify|disney|hbo|max|prime video|amazon prime|youtube premium|icloud|apple com|apple music|google one|chatgpt|claude)\b/, "Suscripciones"],
  [/\b(aerom[eé]xico|volaris|viva aerobus|airbnb|hotel|hostal|booking|expedia|vuelo)\b/, "Viajes"],
];

function keywordCategory(merchantNormalized: string): string | null {
  for (const [pattern, category] of KEYWORD_MAP) {
    if (pattern.test(merchantNormalized)) return category;
  }
  return null;
}

// Devuelve el category_id para un comercio: primero la regla del usuario,
// luego el mapa de keywords, si no, null ("Sin categoría").
export async function categorize(
  supabase: SupabaseClient,
  userId: string,
  merchant: string | null
): Promise<string | null> {
  if (!merchant) return null;
  const normalized = normalizeMerchant(merchant);
  if (!normalized) return null;

  const { data: rule } = await supabase
    .from("merchant_rules")
    .select("category_id")
    .eq("user_id", userId)
    .eq("merchant_normalized", normalized)
    .maybeSingle();
  if (rule) return rule.category_id;

  const categoryName = keywordCategory(normalized);
  if (!categoryName) return null;

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", categoryName)
    .maybeSingle();
  return category?.id ?? null;
}
