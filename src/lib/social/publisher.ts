import { decryptToken } from "@/lib/crypto/token";

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  content: string
): Promise<PublishResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, access_token: pageAccessToken }),
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message ?? "Facebook API error" };
    }
    return { success: true, externalPostId: json.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

async function publishToTwitter(
  accessToken: string,
  content: string
): Promise<PublishResult> {
  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text: content }),
    });
    const json = (await res.json()) as {
      data?: { id: string };
      errors?: Array<{ message: string }>;
    };
    if (!res.ok || json.errors) {
      return { success: false, error: json.errors?.[0]?.message ?? "Twitter API error" };
    }
    return { success: true, externalPostId: json.data?.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/**
 * Publish content to a connected social account.
 * Decrypts stored tokens before calling platform APIs.
 */
export async function publishToAccount(
  platform: string,
  accessTokenEnc: string,
  externalAccountId: string | null,
  content: string
): Promise<PublishResult> {
  const token = decryptToken(accessTokenEnc);

  if (platform === "facebook") {
    if (!externalAccountId) return { success: false, error: "No Facebook page ID stored" };
    return publishToFacebook(token, externalAccountId, content);
  }

  if (platform === "x") {
    return publishToTwitter(token, content);
  }

  return { success: false, error: `Publishing to ${platform} is not yet supported` };
}
