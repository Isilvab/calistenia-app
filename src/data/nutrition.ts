// Nutrition data — food protein table and tips

export interface FoodItem {
  name: string
  // TODO: el diseño menciona campo "portion" separado, pero en data.js la porción
  // está embebida en el nombre (ej. "100 g pollo cocido", "2 huevos enteros").
  // Separar en prompt futuro si se necesita para cálculos.
  protein: number  // gramos de proteína
}

export interface NutritionTip {
  title: string
  body: string
}

export const FOODS: FoodItem[] = [
  { name: '2 huevos enteros',        protein: 12 },
  { name: '100 g pollo cocido',      protein: 26 },
  { name: '100 g carne magra',       protein: 26 },
  { name: 'Atún en agua (140 g)',    protein: 27 },
  { name: 'Lentejas cocidas (1 tz)', protein: 18 },
  { name: 'Porotos/frijoles (1 tz)', protein: 15 },
  { name: 'Leche (1 tz)',            protein: 8  },
  { name: 'Yogur natural (200 g)',   protein: 12 },
  { name: 'Queso fresco (100 g)',    protein: 13 },
  { name: 'Avena (100 g)',           protein: 13 },
]

export const NUTRITION_TIPS: NutritionTip[] = [
  { title: 'Reparte la proteína', body: '4 comidas de ~30 g cada una distribuye mejor la síntesis muscular.' },
  { title: 'Una fuente clara',    body: 'Cada comida con una fuente identificable de proteína.' },
  { title: 'Color en el plato',   body: 'Verdura o fruta en mínimo 3 comidas al día.' },
  { title: 'Hidratación',         body: '30–35 ml por kg de peso corporal. Más si entrenas.' },
  { title: 'Dormir es entrenar',  body: '7–9 h. Más impacto que cualquier suplemento.' },
  { title: 'Sin demonizar',       body: 'Reduce ultraprocesados, pero no los conviertas en tabú.' },
]
