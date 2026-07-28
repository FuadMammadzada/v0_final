import { NextResponse } from "next/server"
import { z } from "zod"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { parseJsonBody } from "@/lib/server/request"

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

const carriersSchema = z.object({
  arcsData: z.array(coordinateSchema.passthrough()).min(1).max(108),
})

const countries = [
  "Germany",
  "France",
  "United Kingdom",
  "Spain",
  "Italy",
  "Netherlands",
  "Turkey",
  "Poland",
  "Romania",
  "Belgium",
  "Austria",
  "Czech Republic",
  "Greece",
  "Portugal",
  "Sweden",
  "Hungary",
  "Bulgaria",
  "Serbia",
  "Denmark",
  "Finland",
  "Norway",
  "Ireland",
  "Croatia",
  "Switzerland",
]

const firstNames = [
  "Mehmet",
  "Hans",
  "Pierre",
  "Maria",
  "Giovanni",
  "Carlos",
  "Anna",
  "Jan",
  "Elena",
  "Michael",
  "Sophie",
  "Dimitri",
  "Isabella",
  "Markus",
  "Aya",
  "Viktor",
  "Katerina",
  "Lars",
  "Emilia",
  "Stefan",
  "Natalia",
]

const lastNames = [
  "Yilmaz",
  "Schmidt",
  "Muller",
  "Garcia",
  "Rossi",
  "Silva",
  "Novak",
  "Kowalski",
  "Popescu",
  "Jensen",
  "Anderson",
  "Kovacs",
  "Papadopoulos",
  "Johansson",
  "O'Brien",
  "Dubois",
  "van Berg",
  "Petrov",
  "Horvath",
]

function pick<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length]
}

function generateCarriers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `${pick(firstNames, index * 17 + 3)} ${pick(lastNames, index * 31 + 7)}`,
    country: pick(countries, index * 13 + 11),
  }))
}

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, {
    key: "carriers",
    limit: 30,
    windowMs: 60_000,
    requireDistributed: true,
  })
  if (rateLimited) return rateLimited

  const parsed = await parseJsonBody(request, carriersSchema, { maxBytes: 32_768 })
  if (!parsed.ok) return parsed.response

  return NextResponse.json({ carriers: generateCarriers(parsed.data.arcsData.length) })
}
