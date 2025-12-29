# File Service Architecture Guide

## Overview
This document establishes the architectural patterns, conventions, and design decisions for the File Service project. Following these guidelines ensures consistency, maintainability, and reduces the need for repetitive explanations during development.

## API Design Conventions

### Endpoint Naming Standards

#### Controller Naming
- Use **singular nouns** for controller routes: `@Controller('email-template')`
- Never use plural forms in the base controller path
- Use kebab-case for multi-word controllers

#### Route Segments
- **Base resource**: Always singular (`/email-template`, `/user`, `/file`)
- **List operations**: Add `/list` segment for plural operations (`/email-template/list`)
- **Actions**: Use descriptive verbs (`/cache/clear`, `/render/simple`)
- **Resource identification**: Use parameter patterns (`/:id`, `/:name`)

#### Examples of Correct Patterns
```typescript
@Controller('email-template')  // ✅ Singular base
export class EmailTemplateController {
  
  @Get('list')                 // ✅ /email-template/list (plural data)
  getAvailableTemplates() {}
  
  @Get(':name/data')           // ✅ /email-template/{name}/data
  getTemplateData() {}
  
  @Post('render')              // ✅ /email-template/render
  renderTemplate() {}
  
  @Post('render/simple')       // ✅ /email-template/render/simple
  renderSimpleTemplate() {}
  
  @Post('cache/clear')         // ✅ /email-template/cache/clear
  clearCache() {}
}
```

#### Why This Pattern?
1. **Semantic Clarity**: `/email-template/list` clearly indicates "list all email templates"
2. **Resource Focus**: The controller represents a single resource type
3. **Extensibility**: Easy to add related operations under the same resource
4. **Consistency**: Predictable URL structure across all APIs

### HTTP Method Guidelines

#### GET Requests
- **Retrieval only** - No side effects
- **Cacheable** - Should be safe to repeat
- **Query parameters** for filtering/pagination

#### POST Requests  
- **Creation** - Creating new resources
- **Actions** - Operations that change state
- **Complex queries** - When query params become unwieldy

#### PUT/PATCH Requests
- **Updates** - Modifying existing resources
- PUT for full replacement, PATCH for partial updates

#### DELETE Requests
- **Removal** - Deleting resources
- Should be idempotent

## Module Architecture

### Standard Module Structure
Every feature module should follow this structure:

```
src/module/{feature-name}/
├── {feature}.module.ts          # Module definition
├── {feature}.service.ts         # Business logic
├── {feature}.controller.ts      # API endpoints
├── {feature}.service.spec.ts    # Service tests
├── {feature}.controller.spec.ts # Controller tests
├── interfaces/                  # TypeScript interfaces (if complex)
│   ├── {feature}.interface.ts
│   └── index.ts
└── API_TESTING.md              # API testing documentation
```

### Dependency Injection Patterns

#### Service Dependencies
```typescript
@Injectable()
export class EmailCampaignService {
  constructor(
    private readonly emailTemplateService: EmailTemplateService,
    private readonly gmailService: GmailService,
  ) {}
}
```

#### Module Imports
```typescript
@Module({
  imports: [EmailTemplateModule, GmailModule],
  providers: [EmailCampaignService],
  controllers: [EmailCampaignController],
  exports: [EmailCampaignService],
})
export class EmailCampaignModule {}
```

## Configuration Management

### Configuration Principles
1. **No hardcoded values** in business logic
2. **Centralized configuration** through `AppConfigService`
3. **Environment-specific** config files
4. **Type-safe** configuration interfaces

### Configuration Pattern
```typescript
// ✅ Correct - Use configuration service
constructor(
  private readonly configService: AppConfigService,
) {
  const config = this.configService.getConfig();
  this.apiUrl = config.external.someApi.url;
}

// ❌ Wrong - Hardcoded values
const apiUrl = 'https://hardcoded-url.com';
```

## Data Transfer Objects (DTOs)

### Interface Definitions
```typescript
export interface CreateUserDto {
  name: string;
  email: string;
  role?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: string;
}
```

### Validation Patterns
- Use class-validator decorators for input validation
- Define clear interface contracts
- Separate input/output DTOs when needed

## Error Handling

### Service Layer
```typescript
try {
  const result = await this.externalService.call();
  return result;
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new BadRequestException('Descriptive error message');
}
```

### Controller Layer
```typescript
@Post('action')
async performAction(@Body() dto: ActionDto) {
  try {
    return await this.service.performAction(dto);
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error; // Re-throw known errors
    }
    throw new InternalServerErrorException('Unexpected error occurred');
  }
}
```

## Authentication & Authorization

### Public Endpoints (Temporary Testing)
```typescript
@Get('list')
@Auth({ public: true })  // Temporary for testing
getPublicData() {}
```

### Protected Endpoints
```typescript
@Post('sensitive-action')
@Auth({ roles: ['admin'] })
performSensitiveAction() {}
```

## Documentation Standards

### API Documentation
- **Swagger decorators** for all endpoints
- **Clear descriptions** for complex operations
- **Example requests/responses** in API docs
- **Local API_TESTING.md** files in each module

### Code Documentation
- **JSDoc comments** for complex methods
- **Interface documentation** for public APIs
- **Architecture decisions** documented in this file

## Testing Patterns

### Service Tests
- **Mock external dependencies**
- **Test business logic** thoroughly
- **Use proper TypeScript types** in mocks

### Controller Tests
- **Mock service dependencies**
- **Test HTTP concerns** (routing, validation, responses)
- **Verify proper service calls**

### Integration Tests
- **Test complete workflows**
- **Use test database** when needed
- **Verify end-to-end functionality**

## File Organization

### Documentation Placement
- **Module-specific docs**: Place next to the module (e.g., `API_TESTING.md` in module folder)
- **Project-wide docs**: Place in `/docs` folder
- **Architecture guides**: This file and related guides in `/docs`

### Code Organization
- **Feature-based modules** rather than technical layers
- **Shared utilities** in `/shared` or `/common`
- **Configuration** centralized in `/config`

## Development Workflow

### Code Changes
1. **Understand** existing patterns first
2. **Follow established conventions** documented here
3. **Update documentation** when patterns change
4. **Write tests** for new functionality
5. **Maintain consistency** with existing codebase

### Architecture Decisions
- **Document new patterns** in this guide
- **Discuss breaking changes** before implementation  
- **Update examples** when patterns evolve
- **Keep this guide current** with actual codebase

---

## Pattern Examples from Codebase

### Email Template Module (Reference Implementation)
The email-template module exemplifies these patterns:

**Controller Structure:**
```typescript
@Controller('email-template')  // Singular resource
export class EmailTemplateController {
  @Get('list')                 // Plural operation with /list
  @Post('render')              // Action verb
  @Post('render/simple')       // Nested action  
  @Get(':name/data')           // Resource parameter
  @Post('cache/clear')         // Clear action
}
```

**Service Integration:**
```typescript
// Email campaign uses email template service
constructor(
  private readonly emailTemplateService: EmailTemplateService,
  private readonly gmailService: GmailService,
) {}
```

This architecture guide should be referenced for all development decisions and updated as patterns evolve.