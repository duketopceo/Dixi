/**
 * AI Prompt Templates Service
 * 
 * Manages reusable AI prompt templates with variable substitution.
 */

interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables: TemplateVariable[];
  createdAt: number;
  updatedAt: number;
}

export class PromptTemplatesService {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const defaults: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Gesture Point',
        description: 'Template for point gesture queries',
        template: '{{emoji}} User is pointing at screen position ({{x}}, {{y}}). {{query}}',
        variables: [
          { name: 'emoji', description: 'Gesture emoji', defaultValue: '👉' },
          { name: 'x', description: 'X coordinate' },
          { name: 'y', description: 'Y coordinate' },
          { name: 'query', description: 'User query' },
        ],
      },
      {
        name: 'Gesture Wave',
        description: 'Template for wave gesture',
        template: '{{emoji}} User waved. {{query}}',
        variables: [
          { name: 'emoji', description: 'Gesture emoji', defaultValue: '👋' },
          { name: 'query', description: 'User query' },
        ],
      },
      {
        name: 'General Query',
        description: 'General purpose query template',
        template: '{{query}}',
        variables: [
          { name: 'query', description: 'User query' },
        ],
      },
    ];

    defaults.forEach((template, index) => {
      const id = `default_${index + 1}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  }

  /**
   * Get all templates
   */
  getTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get specific template
   */
  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Create new template
   */
  createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): PromptTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const newTemplate: PromptTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.validateTemplate(newTemplate);
    this.templates.set(id, newTemplate);

    return newTemplate;
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>): PromptTemplate | null {
    const existing = this.templates.get(id);
    if (!existing) return null;

    const updated: PromptTemplate = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };

    this.validateTemplate(updated);
    this.templates.set(id, updated);

    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    // Don't allow deleting default templates
    if (id.startsWith('default_')) {
      return false;
    }
    return this.templates.delete(id);
  }

  /**
   * Render template with variables
   */
  renderTemplate(id: string, variables: Record<string, string>): string | null {
    const template = this.templates.get(id);
    if (!template) return null;

    let rendered = template.template;

    // Replace all variables
    for (const variable of template.variables) {
      const value = variables[variable.name] || variable.defaultValue || '';
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: PromptTemplate): void {
    if (!template.name || !template.template) {
      throw new Error('Template must have name and template fields');
    }

    // Check that all variables in template are defined
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = template.template.matchAll(variableRegex);
    const usedVariables = new Set<string>();

    for (const match of matches) {
      usedVariables.add(match[1]);
    }

    const definedVariables = new Set(template.variables.map(v => v.name));
    for (const usedVar of usedVariables) {
      if (!definedVariables.has(usedVar)) {
        throw new Error(`Template uses undefined variable: ${usedVar}`);
      }
    }
  }
}

// Singleton instance
export const promptTemplates = new PromptTemplatesService();

