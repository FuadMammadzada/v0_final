import { handleManifestationRequest } from "@/lib/server/manifestation-workflow"

export async function POST(request: Request) {
  return handleManifestationRequest(request)
}
