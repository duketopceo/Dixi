import { Router, Request, Response } from 'express';
import { promptTemplates } from '../services/promptTemplates';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/prompts/templates
 * List all templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = promptTemplates.getTemplates();

    res.json({
      message: 'Templates retrieved successfully',
      templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('Failed to list templates:', error);
    res.status(500).json({
      error: 'Failed to retrieve templates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prompts/templates/:id
 * Get specific template
 */
router.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = promptTemplates.getTemplate(id);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        details: `No template found with id: ${id}`,
      });
    }

    res.json({
      message: 'Template retrieved successfully',
      template,
    });
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({
      error: 'Failed to retrieve template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prompts/templates
 * Create new template
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, description, template, variables } = req.body;

    if (!name || !template) {
      return res.status(400).json({
        error: 'Invalid template data',
        details: 'Template must have name and template fields',
      });
    }

    // Convert simple variables array to TemplateVariable format if needed
    const templateVariables = (variables || []).map((v: any) => 
      typeof v === 'string' 
        ? { name: v, description: `${v} variable` }
        : v
    );

    const newTemplate = promptTemplates.createTemplate({
      name,
      description,
      template,
      variables: templateVariables,
    });

    logger.info('Template created', { templateId: newTemplate.id, name });

    res.status(201).json({
      message: 'Template created successfully',
      template: newTemplate,
    });
  } catch (error) {
    logger.error('Failed to create template:', error);
    res.status(500).json({
      error: 'Failed to create template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/prompts/templates/:id
 * Update template
 */
router.put('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = promptTemplates.updateTemplate(id, updates);

    if (!updated) {
      return res.status(404).json({
        error: 'Template not found',
        details: `No template found with id: ${id}`,
      });
    }

    logger.info('Template updated', { templateId: id });

    res.json({
      message: 'Template updated successfully',
      template: updated,
    });
  } catch (error) {
    logger.error('Failed to update template:', error);
    res.status(500).json({
      error: 'Failed to update template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/prompts/templates/:id
 * Delete template
 */
router.delete('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = promptTemplates.deleteTemplate(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Template not found or cannot be deleted',
        details: `Template with id: ${id} not found or is a default template`,
      });
    }

    logger.info('Template deleted', { templateId: id });

    res.json({
      message: 'Template deleted successfully',
      templateId: id,
    });
  } catch (error) {
    logger.error('Failed to delete template:', error);
    res.status(500).json({
      error: 'Failed to delete template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prompts/templates/:id/render
 * Render template with variables
 */
router.post('/templates/:id/render', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({
        error: 'Invalid variables',
        details: 'Variables must be an object',
      });
    }

    const rendered = promptTemplates.renderTemplate(id, variables);

    if (!rendered) {
      return res.status(404).json({
        error: 'Template not found',
        details: `No template found with id: ${id}`,
      });
    }

    res.json({
      message: 'Template rendered successfully',
      rendered,
      templateId: id,
    });
  } catch (error) {
    logger.error('Failed to render template:', error);
    res.status(500).json({
      error: 'Failed to render template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

