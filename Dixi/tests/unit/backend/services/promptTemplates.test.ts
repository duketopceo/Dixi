import { PromptTemplatesService, promptTemplates } from '../../../../packages/backend/src/services/promptTemplates';

describe('Prompt Templates Service', () => {
  let service: PromptTemplatesService;

  beforeEach(() => {
    service = new PromptTemplatesService();
  });

  describe('getTemplates', () => {
    it('should return all templates including defaults', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.name === 'Gesture Point')).toBe(true);
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', () => {
      const templates = service.getTemplates();
      if (templates.length > 0) {
        const template = service.getTemplate(templates[0].id);
        expect(template).toEqual(templates[0]);
      }
    });

    it('should return null for non-existent id', () => {
      expect(service.getTemplate('non-existent')).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', () => {
      const template = service.createTemplate({
        name: 'Test Template',
        description: 'Test description',
        template: 'Hello {{name}}',
        variables: [
          { name: 'name', description: 'Name variable' },
        ],
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.template).toBe('Hello {{name}}');
      expect(template.variables).toHaveLength(1);
    });

    it('should throw error for invalid template (undefined variable)', () => {
      expect(() => {
        service.createTemplate({
          name: 'Invalid',
          template: 'Hello {{undefinedVar}}',
          variables: [
            { name: 'name', description: 'Name' },
          ],
        });
      }).toThrow('undefined variable');
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        service.createTemplate({
          name: '',
          template: '',
          variables: [],
        });
      }).toThrow('name and template fields');
    });
  });

  describe('updateTemplate', () => {
    it('should update existing template', () => {
      const templates = service.getTemplates();
      if (templates.length > 0) {
        const updated = service.updateTemplate(templates[0].id, {
          name: 'Updated Name',
        });

        expect(updated).toBeDefined();
        expect(updated?.name).toBe('Updated Name');
        expect(updated?.id).toBe(templates[0].id);
      }
    });

    it('should return null for non-existent id', () => {
      expect(service.updateTemplate('non-existent', { name: 'Test' })).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete non-default template', () => {
      const template = service.createTemplate({
        name: 'To Delete',
        template: 'Test',
        variables: [],
      });

      const deleted = service.deleteTemplate(template.id);
      expect(deleted).toBe(true);
      expect(service.getTemplate(template.id)).toBeNull();
    });

    it('should not delete default templates', () => {
      const templates = service.getTemplates();
      const defaultTemplate = templates.find((t) => t.id.startsWith('default_'));
      
      if (defaultTemplate) {
        const deleted = service.deleteTemplate(defaultTemplate.id);
        expect(deleted).toBe(false);
        expect(service.getTemplate(defaultTemplate.id)).toBeDefined();
      }
    });
  });

  describe('renderTemplate', () => {
    it('should render template with variables', () => {
      const template = service.createTemplate({
        name: 'Render Test',
        template: 'Hello {{name}}, you are {{age}} years old',
        variables: [
          { name: 'name', description: 'Name' },
          { name: 'age', description: 'Age' },
        ],
      });

      const rendered = service.renderTemplate(template.id, {
        name: 'John',
        age: '25',
      });

      expect(rendered).toBe('Hello John, you are 25 years old');
    });

    it('should use default values when variable not provided', () => {
      const template = service.createTemplate({
        name: 'Default Test',
        template: 'Hello {{name}}',
        variables: [
          { name: 'name', description: 'Name', defaultValue: 'World' },
        ],
      });

      const rendered = service.renderTemplate(template.id, {});
      expect(rendered).toBe('Hello World');
    });

    it('should return null for non-existent template', () => {
      expect(service.renderTemplate('non-existent', {})).toBeNull();
    });
  });

  describe('promptTemplates singleton', () => {
    it('should be an instance of PromptTemplatesService', () => {
      expect(promptTemplates).toBeInstanceOf(PromptTemplatesService);
    });
  });
});

