# Development Roadmap

## Table of Contents
- [Code Organization](#code-organization)

## Code Organization

### Current Architecture Analysis

The current module structure contains a mix of core services and business process modules without clear separation:

```
src/module/
├── app/                    # Main application
├── asset/                  # Asset management
├── auth/                   # Authentication
├── config/                 # Configuration
├── contact/                # Contact management
├── content/                # Content handling
├── db/                     # Database connectivity
├── email-campaign/         # Email marketing (Business Process)
├── email-template/         # Template rendering
├── file/                   # File management
├── gmail/                  # Email delivery
├── gpt/                    # AI/LLM integration
├── logger/                 # Logging infrastructure
├── metadata/               # Metadata handling
├── pdf/                    # PDF generation
├── quiz/                   # Quiz functionality
├── storage/                # File storage
├── user/                   # User management
├── user-quiz-result/       # Quiz results
└── workflow/               # Workflow management
```

### Proposed Architecture: Core vs Business Process Separation

Reorganize modules to distinguish between fundamental, reusable capabilities and business-specific workflows.

#### Core Services Structure (`src/module/core/`)

**Infrastructure Services** - System-level capabilities:
- `config/` - Application configuration management
- `logger/` - Centralized logging infrastructure
- `db/` - Database connectivity and ORM
- `storage/` - File storage services (Azure Blob, local, etc.)
- `auth/` - Authentication and authorization mechanisms

**Domain Services** - Business domain capabilities:
- `gmail/` - Email delivery service
- `email-template/` - Handlebars template rendering engine
- `file/` - File management and processing
- `pdf/` - PDF generation and manipulation
- `gpt/` - AI/LLM integration services
- `asset/` - Static asset management
- `metadata/` - Metadata extraction and handling

**Entity Services** - Data model management:
- `user/` - User entity CRUD operations
- `contact/` - Contact management services

#### Business Process Modules (`src/module/`)

**Current Business Processes:**
- `email-campaign/` - Email marketing workflow orchestration

**Potential Future Business Processes:**
- `user-onboarding/` - New user registration and setup workflow
- `content-publishing/` - Content creation, review, and publishing workflow
- `quiz-management/` - Quiz creation, administration, and assessment workflow
- `document-processing/` - File upload → PDF conversion → analysis pipeline

#### Classification Decisions Needed

**Modules requiring analysis:**
- `content/` - Determine if core service or business workflow
- `quiz/` + `user-quiz-result/` - Possibly combine into `quiz-management/` business process
- `workflow/` - Evaluate if general infrastructure or specific business processes
- `asset/` vs `file/` - Assess overlap and potential consolidation

#### Proposed Final Structure

```
src/module/
├── core/
│   ├── infrastructure/
│   │   ├── config/
│   │   ├── logger/
│   │   ├── db/
│   │   ├── storage/
│   │   └── auth/
│   ├── services/
│   │   ├── gmail/
│   │   ├── email-template/
│   │   ├── file/
│   │   ├── pdf/
│   │   ├── gpt/
│   │   ├── asset/
│   │   └── metadata/
│   └── entities/
│       ├── user/
│       └── contact/
├── email-campaign/         # Business process
├── quiz-management/        # Business process (combined quiz + results)
├── content-workflow/       # Business process (if content/ is workflow)
├── document-processing/    # Business process (file → PDF → analysis)
└── app/                   # Main application module
```

### Benefits of Core vs Business Process Architecture

#### Development Benefits
- **Clear Separation of Concerns**: Infrastructure vs business logic boundaries
- **Dependency Flow**: Business processes depend on core services, never reverse
- **Reusability**: Core services can be shared across multiple business processes
- **Team Organization**: Clear ownership between infrastructure and product teams

#### Maintenance Benefits
- **Easier Navigation**: Developers know immediately whether they're working with infrastructure or business logic
- **Testing Strategy**: Unit tests for core services, integration tests for business processes
- **Reduced Coupling**: Business processes remain isolated from each other
- **Scalability**: Core services can evolve independently of business processes

#### Architectural Benefits
- **Service Discovery**: Easy identification of available capabilities
- **API Design**: Clear interfaces between core services and business orchestration
- **Documentation**: Natural grouping for API documentation and developer guides
- **Future Growth**: New business processes can leverage existing core services

### Migration Strategy

#### Phase 1: Analysis and Planning
1. Audit existing modules to categorize core vs business process
2. Identify dependencies between modules
3. Plan migration order to minimize disruption
4. Update import statements and module references

#### Phase 2: Core Services Migration
1. Create `src/module/core/` structure
2. Move infrastructure services (config, logger, db, storage, auth)
3. Move domain services (gmail, email-template, file, pdf, gpt, asset, metadata)
4. Move entity services (user, contact)
5. Update all import references

#### Phase 3: Business Process Organization
1. Keep `email-campaign/` at root level as established business process
2. Evaluate and potentially combine `quiz/` + `user-quiz-result/` into `quiz-management/`
3. Assess `content/` and `workflow/` modules for business process classification
4. Create new business process modules as needed

#### Phase 4: Validation and Documentation
1. Update all module imports throughout the application
2. Verify all tests pass with new structure
3. Update developer documentation
4. Create architectural decision records (ADRs) for the reorganization