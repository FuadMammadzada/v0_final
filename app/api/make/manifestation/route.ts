import { handleManifestationRequest } from "@/lib/server/manifestation-workflow"

export const maxDuration = 300

export async function POST(request: Request) {
  return handleManifestationRequest(request)
}
