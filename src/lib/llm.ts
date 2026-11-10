// Ask a model for an answer in an exact JSON shape (a zod schema), with Claude through the official
// Anthropic SDK or OpenAI through the official OpenAI SDK. Used by tailoring and the AI helper.
// Both go through this site's own relays (/anthropic-api, /openai-api), never straight from the browser.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { Settings } from "../types";
import { OPENAI_BASE } from "./ai";
import { modelLabel, type ModelRef } from "./models";

export class LlmError extends Error {}

export type Turn = { role: "user" | "assistant"; content: string };

type Ask<S extends z.ZodType> = {
  system: string;
  messages: Turn[];
  schema: S;
  /** Name for the schema (OpenAI wants one). */
  name: string;
  /** How hard Claude should think; ignored where a model does not support it. */
  effort?: "low" | "medium" | "high";
};

// Models whose refusals the API can hand to a fallback model inside the same request.
const FALLBACK_OK = /^claude-(opus-5-5|sonnet-5-5|opus-5|fable)/;
// Haiku 4.5 predates the effort setting.
const NO_EFFORT = /haiku-4-5|claude-3/;

export async function askStructured<S extends z.ZodType>(settings: Settings, ref: ModelRef, ask: Ask<S>): Promise<z.infer<S>> {
  return ref.provider === "openai" ? askOpenAi(settings, ref, ask) : askClaude(settings, ref, ask);
}

async function askClaude<S extends z.ZodType>(settings: Settings, ref: ModelRef, ask: Ask<S>): Promise<z.infer<S>> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) throw new LlmError(`${modelLabel(ref)} needs a Claude API key. Add one in Settings, or choose an OpenAI model.`);
  const anthropic = new Anthropic({
    apiKey,
    baseURL: `${window.location.origin}/anthropic-api`,
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
  const fallback = FALLBACK_OK.test(ref.id);
  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model: ref.id,
      max_tokens: 16000,
      output_config: {
        format: betaZodOutputFormat(ask.schema),
        ...(ask.effort && !NO_EFFORT.test(ref.id) ? { effort: ask.effort } : {}),
      },
      // If Claude declines, the API finishes the same request on a fallback model.
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      system: ask.system,
      messages: ask.messages,
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new LlmError("Anthropic rejected the Claude API key. Check it in Settings.");
    if (e instanceof Anthropic.RateLimitError) throw new LlmError("Claude: too many requests right now. Wait a minute and try again.");
    if (e instanceof Anthropic.NotFoundError) throw new LlmError(`${modelLabel(ref)} is not available for this key. Choose another model.`);
    if (e instanceof Anthropic.APIError) throw new LlmError(`${modelLabel(ref)} failed (${e.status ?? "network"}): ${e.message}`);
    throw e;
  }
  if (response.stop_reason === "refusal") throw new LlmError(`${modelLabel(ref)} declined this request. Try rewording it.`);
  if (response.stop_reason === "max_tokens") throw new LlmError("The answer was too long. Shorten the text and try again.");
  if (!response.parsed_output) throw new LlmError(`${modelLabel(ref)}'s answer could not be read. Try again.`);
  return response.parsed_output as z.infer<S>;
}

async function askOpenAi<S extends z.ZodType>(settings: Settings, ref: ModelRef, ask: Ask<S>): Promise<z.infer<S>> {
  const apiKey = settings.openaiKey.trim();
  if (!apiKey) throw new LlmError(`${modelLabel(ref)} needs an OpenAI API key. Add one in Settings, or choose a Claude model.`);
  const openai = new OpenAI({ apiKey, baseURL: OPENAI_BASE(), dangerouslyAllowBrowser: true, maxRetries: 1 });
  let completion;
  try {
    completion = await openai.chat.completions.parse({
      model: ref.id,
      messages: [{ role: "system", content: ask.system }, ...ask.messages],
      response_format: zodResponseFormat(ask.schema, ask.name),
    });
  } catch (e) {
    if (e instanceof OpenAI.AuthenticationError) throw new LlmError("OpenAI rejected the API key. Check it in Settings.");
    if (e instanceof OpenAI.RateLimitError) throw new LlmError("OpenAI: too many requests or no credit left. Wait a minute or check your billing.");
    if (e instanceof OpenAI.NotFoundError) throw new LlmError(`${modelLabel(ref)} is not available for this key. Choose another model.`);
    if (e instanceof OpenAI.APIError) throw new LlmError(`${modelLabel(ref)} failed (${e.status ?? "network"}): ${e.message}`);
    throw e;
  }
  const choice = completion.choices[0];
  if (choice?.message.refusal) throw new LlmError(`${modelLabel(ref)} declined this request. Try rewording it.`);
  if (choice?.finish_reason === "length") throw new LlmError("The answer was too long. Shorten the text and try again.");
  if (!choice?.message.parsed) throw new LlmError(`${modelLabel(ref)}'s answer could not be read. Try again.`);
  return choice.message.parsed as z.infer<S>;
}
