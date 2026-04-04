/**
 * Poll City AI Assist
 *
 * Provider abstraction layer for AI features.
 * Supports Anthropic and OpenAI. Falls back to mock output when no API key is set.
 */

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResult {
  text: string;
  provider: string;
  isMock: boolean;
}

// ─── Provider Interface ────────────────────────────────────────────────────

interface AIProvider {
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
}

// ─── Anthropic Provider ───────────────────────────────────────────────────

class AnthropicProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: options.maxTokens ?? 1024,
        system: options.systemPrompt ?? POLL_CITY_SYSTEM_PROMPT,
        messages: options.messages.map((m) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return {
      text: data.content[0]?.text ?? "",
      provider: "anthropic",
      isMock: false,
    };
  }
}

// ─── OpenAI Provider ──────────────────────────────────────────────────────

class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const messages = [
      { role: "system", content: options.systemPrompt ?? POLL_CITY_SYSTEM_PROMPT },
      ...options.messages,
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0]?.message?.content ?? "",
      provider: "openai",
      isMock: false,
    };
  }
}

// ─── Mock Provider ────────────────────────────────────────────────────────

class MockAIProvider implements AIProvider {
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const lastMessage = options.messages[options.messages.length - 1]?.content ?? "";

    // Simulate contextual mock responses
    let text = "";

    if (lastMessage.toLowerCase().includes("summarize")) {
      text = `**Voter Notes Summary** *(Mock — add API key to enable live AI)*\n\nBased on the interaction history, this voter has expressed strong interest in local transit improvements and housing affordability. They were receptive at the door and indicated potential volunteer interest. A follow-up call is recommended to solidify support and explore volunteer recruitment. Key issues: transit expansion, rent stabilization.`;
    } else if (lastMessage.toLowerCase().includes("script") || lastMessage.toLowerCase().includes("talking point")) {
      text = `**Suggested Talking Points** *(Mock — add API key to enable live AI)*\n\n1. **Transit**: Sam Rivera is committed to expanding local bus routes and fighting for a dedicated cycling lane on the main corridor.\n2. **Housing**: Our plan includes a community land trust model to keep 200 units permanently affordable.\n3. **Local business**: A small business task force will be created in the first 90 days.\n\nRemember: Listen first, then respond to the voter's specific concerns.`;
    } else if (lastMessage.toLowerCase().includes("follow") || lastMessage.toLowerCase().includes("priority")) {
      text = `**Priority Follow-up List** *(Mock — add API key to enable live AI)*\n\nBased on your campaign data, I recommend prioritizing:\n\n1. **Undecided voters** with recorded issues matching your platform (highest conversion potential)\n2. **Leaning support** who haven't been contacted in 14+ days (risk of going cold)\n3. **Volunteer-interested** contacts not yet assigned a role\n\nWould you like me to generate a call script for any of these groups?`;
    } else {
      text = `**Poll City AI Assist** *(Mock mode — add API key to enable)*\n\nI can help you with:\n- Summarizing voter notes\n- Generating phone/door scripts\n- Identifying follow-up priorities\n- Drafting outreach messages\n\nWhat would you like help with today?`;
    }

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));

    return {
      text,
      provider: "mock",
      isMock: true,
    };
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────

const POLL_CITY_SYSTEM_PROMPT = `You are Poll City AI Assist, an expert campaign operations assistant. You help campaign teams with:
- Analyzing voter data and interaction notes
- Generating canvassing scripts and talking points
- Identifying priority contacts for follow-up
- Drafting outreach communications
- Summarizing campaign progress

Always be concise, practical, and campaign-focused. Prioritize actionable insights. When summarizing voter notes, identify key issues, support level signals, and recommended next steps.`;

// ─── Factory ──────────────────────────────────────────────────────────────

function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (provider === "anthropic" && anthropicKey) {
    return new AnthropicProvider(anthropicKey);
  }
  if (provider === "openai" && openaiKey) {
    return new OpenAIProvider(openaiKey);
  }
  // Auto-detect
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  if (openaiKey) return new OpenAIProvider(openaiKey);

  return new MockAIProvider();
}

// ─── Exported Service ─────────────────────────────────────────────────────

export const aiAssist = {
  /**
   * Core completion — send messages and get a response
   */
  complete: async (options: AICompletionOptions): Promise<AICompletionResult> => {
    const provider = createAIProvider();
    return provider.complete(options);
  },

  /**
   * Summarize voter notes for a given contact
   */
  summarizeVoterNotes: async (
    contactName: string,
    notes: string,
    interactions: { type: string; notes: string; createdAt: string }[]
  ): Promise<AICompletionResult> => {
    const provider = createAIProvider();
    const interactionSummary = interactions
      .map((i) => `- ${i.createdAt}: ${i.type} — ${i.notes || "No notes"}`)
      .join("\n");

    return provider.complete({
      systemPrompt: POLL_CITY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Summarize the voter profile and interaction history for ${contactName}.\n\nNotes: ${notes || "None"}\n\nInteraction History:\n${interactionSummary || "No interactions recorded"}\n\nProvide: 1) Brief summary, 2) Key issues, 3) Current support assessment, 4) Recommended next action.`,
        },
      ],
    });
  },

  /**
   * Generate a canvassing script for a specific voter
   */
  generateScript: async (
    contactName: string,
    issues: string[],
    supportLevel: string
  ): Promise<AICompletionResult> => {
    const provider = createAIProvider();
    return provider.complete({
      systemPrompt: POLL_CITY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a brief, friendly canvassing script for a ${supportLevel.replace("_", " ")} voter named ${contactName} who cares about: ${issues.join(", ") || "general community issues"}. Keep it under 150 words, conversational, and end with a clear ask.`,
        },
      ],
    });
  },

  /**
   * Check if AI is in mock mode
   */
  isMockMode: (): boolean => {
    return !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY;
  },
};
