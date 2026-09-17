import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { message, context, history } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    // 1. Deduct 5 credits for AI Co-Pilot interaction
    let remainingBalance = 50;
    try {
      const deduction = await deductCredits(userId, CREDIT_COSTS.AI_CHAT, 'ai_chat');
      remainingBalance = deduction.remainingBalance;
    } catch (err: any) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          {
            error: err.message,
            code: 'INSUFFICIENT_CREDITS',
            currentBalance: err.currentBalance,
            requiredCredits: err.requiredCredits,
          },
          { status: 402 }
        );
      }
      throw err;
    }

    // 2. Format Context and Prompt for Gemini
    const geminiKey = serverEnv.geminiApiKey;
    const contextJson = context ? JSON.stringify(context, null, 2) : 'No extra data context provided.';

    const systemInstruction = `You are the Creator Signal AI Co-Pilot — an elite YouTube Creative Director, packaging strategist, and viral consultant.
You talk like an articulate, warm, and insightful human collaborator who genuinely understands creator psychology, algorithmic distribution, storytelling, and high-CTR packaging.

CRITICAL COMMUNICATION GUIDELINES:
1. NATURAL & HUMAN VOICE:
   - Talk directly to the creator in a warm, encouraging, conversational tone (e.g., "Here's what jumps out immediately...", "Notice how video #1 shattered the channel baseline...", "Let's unpack why this resonated so deeply").
   - NEVER sound like a raw database terminal, cold scraper, or robot. Never use robotic phrases like "Extracting ANALYTICAL_DATA JSON", "Executing calculation", or "According to the provided data block".
   - Avoid cold LaTeX formulas or raw code blocks unless the user explicitly asks for code.

2. TRANSLATE NUMBERS INTO PLAIN ENGLISH:
   - When discussing performance metrics (view multipliers, channel medians, percentage drops, views-per-hour), do the math accurately behind the scenes, but explain what the numbers MEAN in intuitive human terms.
   - Example: Instead of "$$\\text{Multiplier} = 2.45$$", say: "This video generated 340,000 views against your 140,000 median baseline—that's a 2.4x breakout spike, meaning it pulled in 140% more viewers than a typical upload."

3. HIGHLY STRUCTURED & ORGANIZED:
   - Organize your response with clean, inviting markdown headings, bullet points, and thematic sections:
     • 🎯 **The Big Picture** (The primary strategic takeaway in 1-2 sharp paragraphs)
     • 💡 **Why It Worked (The Psychology)** (Curiosity gaps, stakes, human paradox, or emotional hooks)
     • 🚀 **Actionable Concepts & Title Ideas** (Ready-to-use titles, thumbnail angles, or opening hook ideas)
     • 📊 **The Numbers (In Plain English)** (Clear breakdown of any calculations or performance comparisons)
   - When suggesting titles, use blockquotes with clean options (e.g. > **"Title Idea Here"**) so they are easy to scan and copy.

4. GROUNDED IN REAL DATA:
   - Ground all observations strictly in the context data provided. Never fabricate view counts, video titles, or channel names.`;

    const conversationContext = (history || [])
      .slice(-6)
      .map((item: { role: string; content: string }) => `${item.role === 'user' ? 'User' : 'AI Co-Pilot'}: ${item.content}`)
      .join('\n\n');

    const fullPrompt = `${systemInstruction}

CONTEXT DATA:
${contextJson}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n\n` : ''}User Query: "${message.trim()}"

Deliver your strategic creative analysis:`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-2.5-pro'];
    let reply = '';
    let lastError = '';

    if (geminiKey) {
      for (const model of modelsToTry) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: {
                  temperature: 0.5,
                  maxOutputTokens: 3500,
                  thinkingConfig: {
                    thinkingBudget: 512,
                  },
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            reply = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (reply) break;
          } else {
            const errData = await geminiRes.json().catch(() => ({}));
            lastError = errData?.error?.message || `HTTP ${geminiRes.status}`;
            console.warn(`[AiChat] Gemini API error (${model}):`, lastError);
          }
        } catch (geminiErr: any) {
          lastError = geminiErr.message;
          console.warn(`[AiChat] Call exception (${model}):`, geminiErr.message);
        }
      }
    } else {
      lastError = 'Missing GEMINI_API_KEY in .env.local';
    }

    if (!reply) {
      throw new Error(`Gemini API connection error: ${lastError || 'Unable to generate response'}`);
    }

    return NextResponse.json({
      success: true,
      reply: reply.trim(),
      remainingCredits: remainingBalance,
    });
  } catch (error: any) {
    console.error('[AiChat] Route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI Co-Pilot response.' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
