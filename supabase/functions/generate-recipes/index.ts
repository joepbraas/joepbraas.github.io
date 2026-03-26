import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Niet geautoriseerd')
    }

    const body = await req.json()
    const { preferences, userApiKey } = body

    const apiKey = userApiKey || Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('Geen Anthropic API sleutel geconfigureerd. Voeg ANTHROPIC_API_KEY toe als Supabase secret, of vul hem in bij Instellingen.')
    }

    const prompt = buildPrompt(preferences)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Anthropic API fout: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('AI gaf geen geldige JSON terug')

    const recipes = JSON.parse(match[0])
    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error('AI gaf geen recepten terug')
    }

    // Stamp IDs and validate structure
    const ts = Date.now()
    const clean = recipes.slice(0, 7).map((r: Record<string, unknown>, i: number) => ({
      id: `ai_${ts}_${i}`,
      name: String(r.name || 'Onbekend recept'),
      time: String(r.time || '30 min'),
      type: ['Vis', 'Vlees', 'Vegetarisch'].includes(String(r.type)) ? r.type : 'Vegetarisch',
      seasons: Array.isArray(r.seasons) ? r.seasons : ['lente', 'zomer', 'herfst', 'winter'],
      nutrition: {
        kcal: Number((r.nutrition as Record<string, number>)?.kcal) || 0,
        prot: Number((r.nutrition as Record<string, number>)?.prot) || 0,
        carb: Number((r.nutrition as Record<string, number>)?.carb) || 0,
        fat:  Number((r.nutrition as Record<string, number>)?.fat)  || 0,
      },
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      steps: Array.isArray(r.steps) ? r.steps.map(String) : [],
    }))

    return new Response(JSON.stringify({ recipes: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildPrompt(prefs: Record<string, unknown>): string {
  const {
    diet, maxTime, cuisine, persons,
    avoid, allergies, hormoneIngredients,
    healthGoals, style, extra, goals,
    season,
  } = prefs as {
    diet: string; maxTime: number; cuisine: string; persons: string;
    avoid: string[]; allergies: string[]; hormoneIngredients: string[];
    healthGoals: string; style: string; extra: string; goals: string[];
    season: string;
  }

  const avoidStr      = avoid?.length      ? avoid.join(', ')             : 'geen'
  const allergyStr    = allergies?.length   ? allergies.join(', ')         : 'geen'
  const hormoneStr    = hormoneIngredients?.length ? hormoneIngredients.join(', ') : 'niet opgegeven'
  const goalsStr      = goals?.length       ? goals.join(', ')             : 'gezond eten'

  return `Je bent een Nederlandse voedingsdeskundige en chef-kok. Genereer precies 7 unieke, gevarieerde en gezonde recepten als JSON array.

Gebruikersvoorkeuren:
- Seizoen: ${season}
- Dieet: ${diet}
- Favoriete keuken: ${cuisine}
- Max bereidingstijd: ${maxTime} minuten
- Aantal personen: ${persons}
- Niet lekker / vermijden: ${avoidStr}
- Allergieën: ${allergyStr}
- Hormoonondersteunende ingrediënten: ${hormoneStr}
- Gezondheidsdoelen: ${healthGoals || 'niet opgegeven'}
- Receptstijl / inspiratiebron: ${style || 'huiselijk'}
- Extra wensen: ${extra || 'geen'}
- Doelen: ${goalsStr}

STRIKTE REGELS:
1. Genereer altijd PRECIES 7 recepten
2. Gebruik minimaal 4 van de hormoonondersteunende ingrediënten verspreid over de 7 recepten
3. Volg het dieet strikt (${diet}): bij vegetarisch/vegan geen vlees of vis
4. Vermijd ALTIJD deze ingrediënten: ${avoidStr}
5. Vermijd ALTIJD deze allergenen: ${allergyStr}
6. Alle recepten klaar binnen ${maxTime} minuten
7. Varieer in type (Vis, Vlees, Vegetarisch) tenzij dieet anders vereist
8. Schrijf alles in correct Nederlands
9. Ingrediënten zijn voor ${persons} personen
10. Maak de recepten seizoensgebonden (${season})
11. Zorg voor variatie: geen twee vergelijkbare recepten

Geef ALLEEN een geldige JSON array terug, geen uitleg of andere tekst:
[
  {
    "name": "Naam van het gerecht",
    "time": "25 min",
    "type": "Vis",
    "seasons": ["lente","zomer","herfst","winter"],
    "nutrition": {"kcal": 520, "prot": 38, "carb": 42, "fat": 18},
    "ingredients": ["2 zalmfilets", "150g quinoa", "1 broccoli (roosjes)"],
    "steps": ["Verwarm de oven op 180°C.", "Bak de zalm 15 minuten."]
  }
]`
}
