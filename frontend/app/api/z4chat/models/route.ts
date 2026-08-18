import { NextResponse } from "next/server";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, listProviders } from "@/lib/z4chat/providers";

export const dynamic = "force-dynamic";

/**
 * Which AI providers are actually usable right now. The UI only offers what
 * comes back here, so pasting a key into .env.local is the whole job of adding a
 * provider - no code change.
 */
export async function GET() {
  const providers = listProviders();
  const available = providers.filter((provider) => provider.available);

  return NextResponse.json({
    providers,
    // Fall back to the first configured provider when the default has no key.
    defaultProvider: available.some((p) => p.id === DEFAULT_PROVIDER)
      ? DEFAULT_PROVIDER
      : available[0]?.id ?? null,
    defaultModel: available.some((p) => p.id === DEFAULT_PROVIDER)
      ? DEFAULT_MODEL
      : available[0]?.models[0]?.id ?? null,
    ready: available.length > 0,
  });
}
