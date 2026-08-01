import { z } from 'zod';

export interface BrainTool<T = any> {
  name: string;
  description: string;
  schema: z.ZodType<T>;
  execute: (args: T) => Promise<any>;
}

/** Zod's own JSON Schema output already matches what every tool-calling provider expects — just drop the $schema/additionalProperties keys they don't need. */
function parametersFor(tool: BrainTool): any {
  const { $schema, additionalProperties, ...rest } = z.toJSONSchema(tool.schema) as any;
  return rest;
}

export function toOpenAITool(tool: BrainTool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: parametersFor(tool)
    }
  };
}

export function toAnthropicTool(tool: BrainTool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: parametersFor(tool)
  };
}
