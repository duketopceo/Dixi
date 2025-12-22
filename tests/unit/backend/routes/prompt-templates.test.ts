import request from 'supertest';
import express, { Express } from 'express';

// Mock prompt templates service
const mockTemplates = [
  {
    id: 'default_1',
    name: 'Gesture Point',
    template: '{{emoji}} User is pointing at screen position ({{x}}, {{y}}). {{query}}',
    variables: [
      { name: 'emoji', description: 'Gesture emoji', defaultValue: '👉' },
      { name: 'x', description: 'X coordinate' },
      { name: 'y', description: 'Y coordinate' },
      { name: 'query', description: 'User query' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

jest.mock('../../../../packages/backend/src/services/promptTemplates', () => ({
  promptTemplates: {
    getTemplates: jest.fn(() => mockTemplates),
    getTemplate: jest.fn((id: string) => mockTemplates.find((t) => t.id === id) || null),
    createTemplate: jest.fn((template: any) => ({
      id: 'new-template-id',
      ...template,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    updateTemplate: jest.fn((id: string, updates: any) => {
      const template = mockTemplates.find((t) => t.id === id);
      if (!template) return null;
      return { ...template, ...updates, updatedAt: Date.now() };
    }),
    deleteTemplate: jest.fn((id: string) => {
      if (id.startsWith('default_')) return false;
      return true;
    }),
    renderTemplate: jest.fn((id: string, variables: Record<string, string>) => {
      const template = mockTemplates.find((t) => t.id === id);
      if (!template) return null;
      return template.template
        .replace(/\{\{emoji\}\}/g, variables.emoji || '👉')
        .replace(/\{\{x\}\}/g, variables.x || '0')
        .replace(/\{\{y\}\}/g, variables.y || '0')
        .replace(/\{\{query\}\}/g, variables.query || '');
    }),
  },
}));

// Import after mocking
import promptTemplatesRouter from '../../../../packages/backend/src/routes/prompt-templates';

describe('Prompt Templates Routes', () => {
  let app: Express;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/prompts', promptTemplatesRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/prompts/templates', () => {
    it('should list all templates', async () => {
      const response = await request(app).get('/api/prompts/templates');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templates');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });
  });

  describe('GET /api/prompts/templates/:id', () => {
    it('should return specific template', async () => {
      const response = await request(app).get('/api/prompts/templates/default_1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('template');
      expect(response.body.template.id).toBe('default_1');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app).get('/api/prompts/templates/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Template not found');
    });
  });

  describe('POST /api/prompts/templates', () => {
    it('should create new template', async () => {
      const templateData = {
        name: 'New Template',
        description: 'Test template',
        template: 'Hello {{name}}',
        variables: [
          { name: 'name', description: 'Name variable' },
        ],
      };

      const response = await request(app)
        .post('/api/prompts/templates')
        .send(templateData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('template');
      expect(response.body.template.name).toBe('New Template');
    });

    it('should return error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/prompts/templates')
        .send({ name: 'Test' }); // Missing template

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid template data');
    });
  });

  describe('PUT /api/prompts/templates/:id', () => {
    it('should update template', async () => {
      const response = await request(app)
        .put('/api/prompts/templates/default_1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('template');
      expect(response.body.template.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .put('/api/prompts/templates/non-existent')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Template not found');
    });
  });

  describe('DELETE /api/prompts/templates/:id', () => {
    it('should delete non-default template', async () => {
      const response = await request(app)
        .delete('/api/prompts/templates/new-template-id');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should not delete default templates', async () => {
      const response = await request(app)
        .delete('/api/prompts/templates/default_1');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('cannot be deleted');
    });
  });

  describe('POST /api/prompts/templates/:id/render', () => {
    it('should render template with variables', async () => {
      const response = await request(app)
        .post('/api/prompts/templates/default_1/render')
        .send({
          variables: {
            emoji: '👉',
            x: '0.5',
            y: '0.5',
            query: 'What is this?',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rendered');
      expect(response.body.rendered).toContain('0.5');
      expect(response.body.rendered).toContain('What is this?');
    });

    it('should return error for invalid variables', async () => {
      const response = await request(app)
        .post('/api/prompts/templates/default_1/render')
        .send({ variables: 'not-an-object' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid variables');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .post('/api/prompts/templates/non-existent/render')
        .send({ variables: {} });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Template not found');
    });
  });
});

