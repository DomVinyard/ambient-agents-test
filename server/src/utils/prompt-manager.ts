import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Dotprompt } from 'dotprompt';
import * as fs from 'fs';
import * as path from 'path';
import { jsonSchemaToZod } from 'json-schema-to-zod';

export interface PromptConfig {
  model: any;
  promptText: string;
  schema: z.ZodTypeAny;
  config: any;
}

export class PromptManager {
  private dotprompt: Dotprompt;

  constructor() {
    const partials = this.loadPartials();
    this.dotprompt = new Dotprompt({
      partials
    });
  }

  /**
   * Load all partials from the partials directory
   */
  private loadPartials(): Record<string, string> {
    const partialsDir = path.join(process.cwd(), 'src', 'prompts', 'partials');
    const partials: Record<string, string> = {};
    
    try {
      const partialFiles = fs.readdirSync(partialsDir);
      
      for (const filename of partialFiles) {
        if (filename.endsWith('.hbs')) {
          const partialName = filename.replace('.hbs', '');
          const partialPath = path.join(partialsDir, filename);
          const partialContent = fs.readFileSync(partialPath, 'utf-8');
          
          partials[partialName] = partialContent;
        }
      }
    } catch (error) {
      console.error('Error loading partials:', error);
    }
    
    return partials;
  }

  /**
   * Load and process a .prompt file with the Dotprompt library
   */
  async loadPromptFile(filename: string, variables: Record<string, any>): Promise<PromptConfig> {
    const filePath = path.join(process.cwd(), 'src', 'prompts', `${filename}.prompt`);
    const promptSource = fs.readFileSync(filePath, 'utf-8');
    
    // Parse the prompt to extract metadata and template
    const parsedPrompt = this.dotprompt.parse(promptSource);
    
    // Render the template with variables
    const renderedPrompt = await this.dotprompt.render(promptSource, { input: variables });
    
    // Extract the model name from metadata
    const modelName = parsedPrompt.model?.split('/')[1] || 'gpt-4o-mini';
    
    // Create OpenAI model with structured outputs enabled (strict mode)
    const model = openai(modelName, {
      structuredOutputs: true
    });
    
    // Extract and convert the output schema
    const outputSchema = parsedPrompt.output?.schema;
    let zodSchemaInstance: z.ZodTypeAny;
    
    if (outputSchema) {
      // Convert JSON Schema to Zod using the library
      try {
        const zodSchemaCode = jsonSchemaToZod(outputSchema);
        
        // Evaluate the generated Zod schema code with z in context
        zodSchemaInstance = new Function('z', `return ${zodSchemaCode}`)(z);
      } catch (error) {
        console.error('Error converting JSON Schema to Zod:', error);
        throw new Error(`Failed to convert schema in ${filename}.prompt: ${error}`);
      }
    } else {
      throw new Error(`No output schema defined in ${filename}.prompt`);
    }
    
    // Extract the rendered text from messages
    const promptText = renderedPrompt.messages
      .map(msg => msg.content.map(part => 'text' in part ? part.text : '').join(''))
      .join('\n');
      
    return {
      model,
      promptText,
      schema: zodSchemaInstance,
      config: parsedPrompt.config || {}
    };
  }
} 