# Contributing to Dixi

Thank you for your interest in contributing to Dixi! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/Dixi.git`
3. Create a feature branch from `development`: `git checkout development && git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with clear messages: `git commit -m "Add feature: description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request targeting the `development` branch

## Development Setup

See the main README.md for detailed installation instructions.

## Code Style

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Python
- Follow PEP 8 style guide
- Use type hints where applicable
- Document functions with docstrings

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update documentation for any API changes
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address review feedback promptly

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Follow project guidelines and conventions

## Questions?

Open an issue for any questions or concerns.

---

## Detailed Code Style Guide

### TypeScript/JavaScript Style

#### Naming Conventions

```typescript
// Classes: PascalCase
class GestureRecognitionService {}

// Interfaces: PascalCase with 'I' prefix (optional)
interface IUserData {}
// Or without prefix (preferred in modern TS)
interface UserData {}

// Functions and variables: camelCase
function processGesture() {}
const currentGesture = null;

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Private class members: prefix with underscore
class Service {
  private _internalState: any;
}

// Type aliases: PascalCase
type GestureType = 'wave' | 'point' | 'pinch';

// Enums: PascalCase for enum name, UPPER_SNAKE_CASE for values
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  ERROR = 'ERROR'
}
```

#### Function Style

```typescript
// ✅ Good: Clear, descriptive names
function calculateGestureConfidence(landmarks: Landmark[]): number {
  // Implementation
}

// ❌ Bad: Abbreviated, unclear
function calcGestConf(lm: any): number {
  // Implementation
}

// ✅ Good: Single responsibility
function validateGestureData(data: GestureData): boolean {
  return data.type && data.confidence >= 0 && data.confidence <= 1;
}

// ❌ Bad: Multiple responsibilities
function validateAndProcessGesture(data: any): void {
  // Validation AND processing - split these!
}
```

#### TypeScript Specifics

```typescript
// ✅ Always use explicit types
function getGesture(): Gesture | null {
  return currentGesture;
}

// ❌ Avoid 'any' unless absolutely necessary
function processData(data: any) {  // Bad!
  // ...
}

// ✅ Use interfaces for object shapes
interface GestureData {
  type: string;
  position: { x: number; y: number };
  confidence: number;
  timestamp: number;
}

// ✅ Use union types for multiple possible types
type AIResponse = {
  text: string;
  metadata: ResponseMetadata;
} | { error: string };

// ✅ Use optional properties
interface Config {
  required: string;
  optional?: number;
}
```

### Python Style (PEP 8)

#### Naming Conventions

```python
# Classes: PascalCase
class GestureRecognitionService:
    pass

# Functions and variables: snake_case
def process_gesture():
    pass

current_gesture = None

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_MS = 5000

# Private members: prefix with single underscore
class Service:
    def __init__(self):
        self._internal_state = None

# Very private: double underscore (name mangling)
class Service:
    def __init__(self):
        self.__very_private = None
```

#### Docstrings

```python
def detect_gesture(frame, landmarks):
    """
    Detect gesture from hand landmarks.
    
    Args:
        frame (np.ndarray): Camera frame in BGR format
        landmarks (list): List of 21 hand landmarks
        
    Returns:
        dict: Gesture data with type, position, and confidence
        
    Raises:
        ValueError: If landmarks are invalid
        
    Example:
        >>> gesture = detect_gesture(frame, landmarks)
        >>> print(gesture['type'])
        'wave'
    """
    pass
```

### React/JSX Style

```tsx
// ✅ Functional components with TypeScript
interface GestureIndicatorProps {
  gesture: Gesture;
  onDismiss: () => void;
}

export const GestureIndicator: React.FC<GestureIndicatorProps> = ({ 
  gesture, 
  onDismiss 
}) => {
  // Hooks at the top
  const [visible, setVisible] = useState(true);
  const gestureStore = useGestureStore();
  
  // Effects after hooks
  useEffect(() => {
    // Side effects here
  }, [gesture]);
  
  // Event handlers
  const handleClick = () => {
    setVisible(false);
    onDismiss();
  };
  
  // Early returns for conditional rendering
  if (!gesture) return null;
  
  // Main render
  return (
    <div className="gesture-indicator">
      {/* JSX */}
    </div>
  );
};
```

---

## Git Workflow and Commit Guidelines

### Branch Structure

Dixi uses the following primary branches:

- **`main`**: Production-ready code. All merges to main should be stable and thoroughly tested.
- **`development`**: Integration branch for ongoing development. Feature branches are merged here first.

#### Workflow

1. Create feature branches from `development`
2. Submit PR to merge feature branch into `development`
3. After testing in `development`, changes are merged to `main` for release

### Branch Naming

```
feature/add-new-gesture-type
fix/camera-permission-bug
chore/update-dependencies
docs/improve-api-documentation
refactor/simplify-gesture-detection
test/add-integration-tests
```

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(vision): add support for custom gesture types

Implement ability to define custom gestures through configuration.
Users can now add new gesture definitions without modifying code.

Closes #123
```

```
fix(backend): resolve websocket memory leak

Fixed memory leak caused by not cleaning up disconnected clients.
Added proper cleanup in disconnect handler.

Fixes #456
```

```
docs(api): update gesture endpoint documentation

Added missing parameters and response examples.
```

### PR Guidelines

#### PR Title

```
feat: Add multi-hand gesture support
fix: Resolve camera initialization race condition
docs: Update deployment guide with Kubernetes examples
```

#### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## How to Test
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Related Issues
Closes #123
Related to #456
```

---

## Testing Requirements

### Coverage Requirements

- **Minimum coverage**: 70% for new code
- **Target coverage**: 80% overall
- **Critical paths**: 90%+ coverage

### Test Structure

#### Backend Tests

```typescript
// packages/backend/src/__tests__/gesture.test.ts

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../index';

describe('GET /api/gesture', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should return current gesture data', async () => {
    const response = await request(app)
      .get('/api/gesture')
      .expect(200);

    expect(response.body).toHaveProperty('type');
    expect(response.body).toHaveProperty('confidence');
  });

  it('should handle errors gracefully', async () => {
    // Mock error condition
    const response = await request(app)
      .get('/api/gesture')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});
```

#### Vision Service Tests

```python
# packages/vision/tests/test_gestures.py

import unittest
from main import GestureRecognitionService

class TestGestureRecognition(unittest.TestCase):
    def setUp(self):
        self.service = GestureRecognitionService()
    
    def test_detect_wave(self):
        # Mock landmarks for wave gesture
        landmarks = self._create_wave_landmarks()
        
        gesture = self.service.recognize_gesture(landmarks)
        
        self.assertEqual(gesture['type'], 'wave')
        self.assertGreater(gesture['confidence'], 0.8)
    
    def test_invalid_landmarks(self):
        with self.assertRaises(ValueError):
            self.service.recognize_gesture([])
```

### Running Tests

```bash
# Backend tests
cd packages/backend
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Vision tests
cd packages/vision
python -m pytest tests/

# With coverage
pytest --cov=. tests/

# Frontend tests
cd packages/frontend
npm test
```

---

## Documentation Standards

### Code Comments

```typescript
/**
 * Processes gesture data and broadcasts to all connected clients.
 * 
 * Applies cooldown logic to prevent duplicate broadcasts and triggers
 * AI inference for recognized gestures.
 * 
 * @param gestureData - Raw gesture data from vision service
 * @throws {ValidationError} If gesture data is malformed
 * @returns Promise that resolves when processing is complete
 * 
 * @example
 * ```ts
 * await processGesture({
 *   type: 'wave',
 *   confidence: 0.92,
 *   position: { x: 0.5, y: 0.5 }
 * });
 * ```
 */
async function processGesture(gestureData: GestureData): Promise<void> {
  // Implementation
}
```

### README Updates

When adding new features, update relevant documentation:

1. **README.md** - If feature changes user-facing functionality
2. **API.md** - If adding/changing API endpoints
3. **ARCHITECTURE.md** - If changing system architecture
4. **QUICKSTART.md** - If affecting getting started process

---

## Code Review Process

### As a Reviewer

1. **Check functionality**: Does it work as described?
2. **Review tests**: Are there adequate tests?
3. **Check style**: Does it follow style guidelines?
4. **Security**: Any potential vulnerabilities?
5. **Performance**: Any performance concerns?
6. **Documentation**: Is it well documented?

### Review Comments

```
// ✅ Good: Specific, actionable, respectful
"Consider using `Array.filter()` here for better readability:
```
const filtered = items.filter(item => item.active);
```
"

// ✅ Good: Ask questions
"Could you explain the reasoning behind using setTimeout here? 
Is there a race condition we're avoiding?"

// ❌ Bad: Vague, dismissive
"This is wrong."
"Bad code."
```

### Addressing Review Feedback

1. Respond to each comment
2. Make requested changes or explain why not
3. Push changes in new commits (don't force push)
4. Request re-review when ready

---

## Issue Templates

### Bug Report

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g., Ubuntu 22.04]
 - Browser: [e.g., Chrome 120]
 - Dixi Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information.
```

### Feature Request

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other relevant information.
```

---

## Development Environment Setup

### Recommended IDE Setup

#### VS Code

**Extensions**:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Python
- GitLens
- Docker
- REST Client

**settings.json**:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black"
}
```

### Pre-commit Hooks

Install husky for git hooks:

```bash
npm install --save-dev husky lint-staged

# Setup
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
```

**package.json**:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.py": ["black", "pylint"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## Adding New Features

### Adding a New Gesture Type

1. **Update Vision Service** (`packages/vision/main.py`):
```python
def recognize_new_gesture(landmarks):
    # Implement detection logic
    pass
```

2. **Add Tests**:
```python
def test_new_gesture():
    # Test implementation
    pass
```

3. **Update Frontend** (`packages/frontend/src/types/gesture.ts`):
```typescript
type GestureType = 'wave' | 'point' | 'pinch' | 'new_gesture';
```

4. **Update Documentation**:
   - Add to `docs/API.md`
   - Update `README.md` if user-facing

5. **Submit PR** with tests and documentation

### Adding a New AI Prompt Template

1. **Create Template** (`packages/backend/src/prompts/newTemplate.ts`):
```typescript
export function buildNewPrompt(context: string): string {
  return `System prompt\n\nContext: ${context}\n\nUser:`;
}
```

2. **Add Tests**
3. **Document usage**
4. **Submit PR**

---

## Performance Considerations

### When to Optimize

1. Profile first - don't guess
2. Focus on hot paths
3. Measure before and after
4. Document optimization rationale

### Common Optimizations

```typescript
// ❌ Bad: Creates new array every render
{items.filter(i => i.active).map(i => <Item key={i.id} {...i} />)}

// ✅ Good: Memoize filtered array
const activeItems = useMemo(
  () => items.filter(i => i.active),
  [items]
);
{activeItems.map(i => <Item key={i.id} {...i} />)}

// ❌ Bad: Inline function recreated every render
<Button onClick={() => handleClick(id)} />

// ✅ Good: Stable callback
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id]);
<Button onClick={handleButtonClick} />
```

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Both client and server side
3. **Sanitize user data** - Prevent injection attacks
4. **Use HTTPS** in production
5. **Keep dependencies updated** - Run `npm audit` regularly
6. **Follow principle of least privilege**
7. **Log security events** - Track failed auth attempts, etc.

---

## Getting Help

### Before Asking

1. Check existing documentation
2. Search closed issues
3. Run diagnostics script
4. Try debugging yourself

### When Asking

Include:
1. What you're trying to do
2. What you've tried
3. Error messages (full stack trace)
4. Environment details
5. Minimal reproduction steps

### Where to Ask

1. **GitHub Discussions** - General questions
2. **GitHub Issues** - Bugs and feature requests
3. **Discord** - Real-time chat (if available)
4. **Stack Overflow** - Tag: `dixi-projection`

---

## License and Legal

- All contributions must be compatible with the project license
- By contributing, you agree your contributions will be licensed under the same license
- Don't include code from GPL-licensed projects (license incompatibility)
- Attribute third-party code appropriately

---

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- `CONTRIBUTORS.md` file

Thank you for contributing to Dixi! 🎉

---

*Last updated: 2025-12-21*
