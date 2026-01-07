import { Router, Request, Response } from 'express';
import { wsService } from '../index';
import { validateProjectionMapping, validateProjectionContent } from '../middleware/validation';
import logger from '../utils/logger';
import { CalibrationResponse, CalibrationPayload } from '../types/projection';

const router = Router();

// In-memory scene storage (upgrade to database later)
const sceneStorage = new Map<string, any>();

// Enhanced calibration mapping storage with homography support
let calibrationMapping: {
  calibrated: boolean;
  points?: Array<{ id: string; cameraX: number; cameraY: number }>;
  homographyMatrix?: number[][];
  createdAt?: string;
} | null = null;

// Get projection status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    active: true,
    renderAPI: process.env.RENDER_API || 'webgl',
    gpuAcceleration: process.env.ENABLE_GPU_ACCELERATION === 'true',
    connectedClients: wsService ? wsService.getClientCount() : 0,
    calibrated: calibrationMapping?.calibrated || false
  });
});

// Get calibration mapping
router.get('/mapping', (req: Request, res: Response) => {
  try {
    if (!calibrationMapping || !calibrationMapping.calibrated) {
      return res.json({ calibrated: false });
    }
    
    res.json({
      calibrated: true,
      points: calibrationMapping.points,
      homographyMatrix: calibrationMapping.homographyMatrix,
      createdAt: calibrationMapping.createdAt
    });
  } catch (error) {
    logger.error('Failed to get calibration mapping:', error);
    res.status(500).json({
      error: 'Failed to get calibration mapping',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update projection mapping (with validation)
router.post('/mapping', validateProjectionMapping, (req: Request, res: Response) => {
  try {
    const { points, createdAt, calibrationData, transform, homographyMatrix } = req.body;
    
    // Support new calibration payload format
    if (points && Array.isArray(points) && points.length === 4) {
      const calibrationPayload: CalibrationPayload = {
        points: points.map((p: any) => ({
          id: p.id,
          cameraX: p.cameraX,
          cameraY: p.cameraY
        })),
        createdAt: createdAt || new Date().toISOString()
      };

      // Validate all required IDs are present
      const requiredIds: Array<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'> = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
      const pointIds = calibrationPayload.points.map(p => p.id);
      const missingIds = requiredIds.filter(id => !pointIds.includes(id));
      
      if (missingIds.length > 0) {
        return res.status(400).json({
          error: 'Invalid calibration payload',
          details: `Missing required point IDs: ${missingIds.join(', ')}`
        });
      }

      // Store calibration mapping (with optional homography matrix)
      calibrationMapping = {
        calibrated: true,
        points: calibrationPayload.points,
        homographyMatrix: homographyMatrix || undefined,
        createdAt: calibrationPayload.createdAt
      };

      logger.info('Calibration mapping stored', { 
        pointCount: calibrationPayload.points.length,
        hasHomography: !!homographyMatrix,
        createdAt: calibrationPayload.createdAt 
      });

      // Broadcast projection update
      if (wsService) {
        wsService.broadcastProjection({
          type: 'mapping_update',
          calibrationData: calibrationPayload,
          homographyMatrix,
          calibrated: true,
          timestamp: Date.now()
        });
      }

      return res.json({
        calibrated: true,
        points: calibrationMapping.points,
        homographyMatrix: calibrationMapping.homographyMatrix,
        createdAt: calibrationMapping.createdAt
      });
    }
    
    // Legacy support: handle old format (calibrationData, transform)
    if (calibrationData || transform) {
      logger.info('Updating projection mapping (legacy format)');
      
      // Broadcast projection update
      if (wsService) {
        wsService.broadcastProjection({
          type: 'mapping_update',
          calibrationData,
          transform,
          timestamp: Date.now()
        });
      }

      return res.json({ 
        message: 'Projection mapping updated',
        calibrationData,
        transform
      });
    }

    // No valid payload format
    return res.status(400).json({
      error: 'Invalid calibration payload',
      details: 'Must provide either points array or calibrationData/transform'
    });
  } catch (error) {
    logger.error('Failed to update projection mapping:', error);
    res.status(500).json({ 
      error: 'Failed to update projection mapping',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Set projection content (with validation)
router.post('/content', validateProjectionContent, (req: Request, res: Response) => {
  try {
    const { content, position, style } = req.body;
    
    logger.debug('Updating projection content', { hasPosition: !!position, hasStyle: !!style });
    
    // Broadcast content update
    if (wsService) {
      wsService.broadcastProjection({
        type: 'content_update',
        content,
        position,
        style,
        timestamp: Date.now()
      });
    }

    res.json({ 
      message: 'Projection content updated',
      content
    });
  } catch (error) {
    logger.error('Failed to update projection content:', error);
    res.status(500).json({ 
      error: 'Failed to update projection content',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save scene
router.post('/scene', (req: Request, res: Response) => {
  try {
    const { scene, name } = req.body;
    
    if (!scene || !scene.objects) {
      return res.status(400).json({
        error: 'Invalid scene data',
        details: 'Scene must contain objects array'
      });
    }

    const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sceneData = {
      id: sceneId,
      name: name || `Scene_${Date.now()}`,
      ...scene,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sceneStorage.set(sceneId, sceneData);
    
    logger.info('Scene saved', { sceneId, objectCount: scene.objects.length });

    res.json({
      message: 'Scene saved successfully',
      sceneId,
      scene: sceneData
    });
  } catch (error) {
    logger.error('Failed to save scene:', error);
    res.status(500).json({
      error: 'Failed to save scene',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Load scene
router.get('/scene/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scene = sceneStorage.get(id);

    if (!scene) {
      return res.status(404).json({
        error: 'Scene not found',
        details: `No scene found with id: ${id}`
      });
    }

    logger.info('Scene loaded', { sceneId: id });

    res.json({
      message: 'Scene loaded successfully',
      scene
    });
  } catch (error) {
    logger.error('Failed to load scene:', error);
    res.status(500).json({
      error: 'Failed to load scene',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List all scenes
router.get('/scenes', (req: Request, res: Response) => {
  try {
    const scenes = Array.from(sceneStorage.values()).map((scene) => ({
      id: scene.id,
      name: scene.name,
      objectCount: scene.objects?.length || 0,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
    }));

    res.json({
      message: 'Scenes retrieved successfully',
      scenes,
      count: scenes.length
    });
  } catch (error) {
    logger.error('Failed to list scenes:', error);
    res.status(500).json({
      error: 'Failed to list scenes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete scene
router.delete('/scene/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = sceneStorage.delete(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Scene not found',
        details: `No scene found with id: ${id}`
      });
    }

    logger.info('Scene deleted', { sceneId: id });

    res.json({
      message: 'Scene deleted successfully',
      sceneId: id
    });
  } catch (error) {
    logger.error('Failed to delete scene:', error);
    res.status(500).json({
      error: 'Failed to delete scene',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
