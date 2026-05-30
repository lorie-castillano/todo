# Frontend Mastery Lesson Plan: Todo App

> **Goal**: Build a production-ready Todo app from scratch, progressing from beginner to senior-level frontend mastery.
> Each phase builds on the previous one. Every step produces a working app.

---

## Phase 1: Foundations (Beginner)

### Lesson 1.1 — Project Setup & Tooling ✅
- [x] Why Vite over Create React App (build tools explained)
- [x] Initialize a React + TypeScript project with Vite
- [x] Understand the project structure (what every file does)
- [x] Install and configure TailwindCSS
- [x] Set up ESLint + Prettier (why linting matters)
- [x] First commit with proper `.gitignore`

**Concepts**: Build tools, module bundlers, dev servers, hot module replacement (HMR)

### Lesson 1.2 — HTML5 & Semantic Markup ✅
- [x] Build the Todo app layout with semantic HTML (`main`, `section`, `header`, `form`, `ul`, `li`)
- [x] Accessibility basics: labels, ARIA roles, keyboard navigation
- [x] Why semantic HTML matters for SEO and screen readers

**Concepts**: Document flow, semantic elements, accessibility tree, WCAG basics

### Lesson 1.3 — CSS3 & Styling Fundamentals ✅
- [x] Style the Todo app with TailwindCSS
- [x] Understand the box model, Flexbox, and Grid
- [x] Responsive design: mobile-first approach
- [x] Dark mode with CSS custom properties and Tailwind

**Concepts**: Cascade, specificity, responsive breakpoints, design tokens, utility-first CSS

### Lesson 1.4 — React Fundamentals ✅
- [x] Functional components and JSX
- [x] Props and prop types with TypeScript interfaces
- [x] `useState` — manage the todo list
- [x] Event handling: adding and deleting todos
- [x] Conditional rendering: empty state, completed state
- [x] List rendering with proper `key` usage

**Concepts**: Component tree, one-way data flow, immutability, declarative UI

### Lesson 1.5 — TypeScript Essentials ✅
- [x] Define types/interfaces for `Todo` items
- [x] Type props, state, and event handlers
- [x] Union types for todo status (`pending | completed`)
- [x] Generics intro (understanding `useState<Todo[]>`)

**Concepts**: Static typing, type inference, type safety, compile-time vs runtime errors

---

## Phase 2: Intermediate Patterns

### Lesson 2.1 — Component Architecture ✅
- [x] Break the app into components: `TodoForm`, `TodoList`, `TodoItem`, `TodoFilter`
- [x] Single Responsibility Principle in components
- [x] Component composition vs prop drilling
- [x] Container vs presentational components (and why the line is blurry now)

**Concepts**: Component decomposition, separation of concerns, reusability

### Lesson 2.2 — State Management Deep Dive ✅
- [x] `useReducer` — refactor todo state with actions (`ADD`, `TOGGLE`, `DELETE`, `EDIT`)
- [x] Why reducers over `useState` for complex state
- [x] Lifting state up vs prop drilling problems
- [x] React Context API for global state (theme, filters)

**Concepts**: State machines, action/dispatch pattern, context vs prop drilling, when to use what

### Lesson 2.3 — Side Effects & Data Persistence ✅
- [x] `useEffect` — persist todos to `localStorage`
- [x] Effect cleanup and dependency arrays (common pitfalls)
- [x] Custom hook: `useLocalStorage`
- [x] Debouncing saves with `useRef`

**Concepts**: Effect lifecycle, closures in effects, stale state, custom hooks

### Lesson 2.4 — Forms & Validation ✅
- [x] Controlled vs uncontrolled components
- [x] Form validation (required, max length, duplicate detection)
- [x] Inline editing with escape/enter key handling
- [x] Optimistic UI updates

**Concepts**: Form state management, validation strategies, UX patterns

### Lesson 2.5 — Styling Architecture ✅
- [x] CSS Modules vs Tailwind vs CSS-in-JS (tradeoffs)
- [x] Animation: transitions for adding/removing todos (Framer Motion)
- [x] Loading skeletons and micro-interactions
- [x] Design system thinking: consistent spacing, colors, typography

**Concepts**: CSS architecture, animation performance, design systems

---

## Phase 3: Advanced Practices

### Lesson 3.1 — Testing Strategy ✅
- [x] Unit tests with Vitest: test the `todoReducer` (pure logic)
- [x] Component tests with React Testing Library: test `TodoForm`, `TodoItem`
- [x] Integration test: full add → complete → delete flow
- [x] What to test and what NOT to test
- [x] Test-driven development (TDD) workflow

**Concepts**: Testing pyramid, arrange-act-assert, mocking, test confidence

### Lesson 3.2 — Performance Optimization ✅
- [x] React DevTools Profiler: identify unnecessary re-renders
- [x] `React.memo`, `useMemo`, `useCallback` — when they actually help
- [x] Virtualized lists for large todo lists (`@tanstack/react-virtual`)
- [x] Code splitting with `React.lazy` and `Suspense`
- [x] Bundle analysis with Vite's built-in tools

**Concepts**: Reconciliation, virtual DOM diffing, memoization tradeoffs, bundle size

### Lesson 3.3 — API Integration & Async Patterns ✅
- [x] Build or mock a REST API for todos (MSW)
- [x] Fetch data with TanStack Query (React Query) for server state
- [x] Optimistic updates with mutation callbacks
- [x] Error boundaries for graceful failure

**Concepts**: Client state vs server state, caching, cache invalidation, optimistic UI, error handling

*Note: Skipped manual `useEffect` fetching in favor of TanStack Query, the modern standard for server state management.*

### Lesson 3.4 — Routing & Navigation ✅
- [x] Add React Router: routes for all todos, active, completed
- [x] URL-driven filtering (bookmarkable states)
- [ ] Protected routes concept (auth simulation) — *deferred to auth lesson*
- [x] 404 handling

**Concepts**: Client-side routing, URL as state, history API, route guards, NavLink

*Note: Protected routes deferred — will implement when we add authentication.*

### Lesson 3.5 — Accessibility Mastery ✅
- [x] Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [x] Screen reader testing (VoiceOver on Mac) — *manual testing step*
- [x] Focus management: auto-focus on new todo, focus trap in modals
- [x] ARIA live regions for dynamic updates ("3 items left")
- [x] Color contrast and reduced motion preferences

**Concepts**: ARIA patterns, focus management, a11y auditing, inclusive design, `prefers-reduced-motion`

*Note: Color contrast verified against WCAG AA standards. Reduced motion hook created and integrated into all animated components.*

---

## Phase 4: Senior-Level & Production Mastery

### Lesson 4.1 — State Management at Scale & Advanced TypeScript
- [x] Zustand or Jotai: lightweight global state (replace Context)
- [ ] ~~State normalization for complex data~~ — *skipped: todos managed by TanStack Query (server state)*
- [x] Derived state with selectors
- [x] Undo/redo functionality with command pattern
- [x] Discriminated unions for todo actions
- [x] Generic components (`List<T>`, `AnimatedList<T>`)
- [x] Utility types: `Pick`, `Omit`, `Partial`, `Record`, `Required`, `Readonly`
- [x] Type-safe event emitters and API responses (`ApiResult<T>`, `ApiError`)
- [x] `satisfies` operator and `const` assertions
- [x] **Bonus**: Branded types (`TodoId`) for compile-time ID safety
- [x] **Bonus**: Keyboard shortcuts (⌘Z / ⌘⇧Z) for undo/redo
- [x] **Bonus**: `window.matchMedia` polyfill for jsdom tests
- [x] **Bonus**: Type-safe key extractors with generic constraints

**Concepts**: State libraries tradeoffs, normalized state shape, command pattern, advanced type patterns, type-level programming

*Progress: 9/9 core items done + 4 bonus items. Lesson 4.1 complete!*

### Lesson 4.2 — CI/CD, Monitoring & Production DevOps
- [x] GitHub Actions: lint, test, build on every PR
- [x] Preview deployments (Vercel/Netlify)
- [x] Environment variables and configuration management
- [x] Automated accessibility audits in CI (axe-core)
- [x] Error boundaries with error reporting
- [x] Performance monitoring (Web Vitals: LCP, INP, CLS)
- [x] Logging strategies for production
- [ ] Feature flags for gradual rollouts

**Concepts**: Continuous integration, deployment pipelines, observability, performance metrics, progressive delivery

### Lesson 4.3 — Architecture, Documentation & Code Review
- [ ] Final refactor: clean architecture review
- [ ] File/folder structure for scalability
- [ ] Documentation: README, component docs, ADRs (Architecture Decision Records)
- [ ] Code review checklist: what senior engineers look for
- [ ] Final production-readiness audit (use the production-ready-checklist skill)

**Concepts**: Software architecture, technical documentation, code review culture, engineering maturity

---

## Phase 5: Backend & MCP Integration (Post-Frontend)

*This phase will begin after completing Phase 4. It transforms our frontend-only app into a full-stack, MCP-ready system for AI agent consumption.*

### Lesson 5.1 — Node.js Backend Foundation
- [ ] Fastify server setup with TypeScript
- [ ] Project structure: routes, services, middleware layers
- [ ] Environment configuration with validation
- [ ] Structured logging with correlation IDs
- [ ] Health check and graceful shutdown

**Concepts**: Backend architecture, separation of concerns, observability

### Lesson 5.2 — Database Design & Persistence
- [ ] PostgreSQL setup with Docker Compose
- [ ] Prisma ORM: schema design, migrations, client generation
- [ ] Todo CRUD operations with transactions
- [ ] Connection pooling and query optimization
- [ ] Soft deletes and audit timestamps

**Concepts**: Relational databases, ORM patterns, data integrity

### Lesson 5.3 — REST API Hardening
- [ ] Zod validation for all inputs
- [ ] Centralized error handling middleware
- [ ] Rate limiting per endpoint and client
- [ ] CORS and security headers (Helmet)
- [ ] OpenAPI/Swagger documentation

**Concepts**: API security, validation, documentation-driven development

### Lesson 5.4 — Model Context Protocol (MCP) Implementation
- [ ] MCP SDK integration (`@anthropic-ai/mcp`)
- [ ] Define todo tools: `create_todo`, `list_todos`, `complete_todo`, `delete_todo`
- [ ] Zod schemas for tool inputs (LLM-friendly validation)
- [ ] Resource endpoints: `/resources/todos` for read-only access
- [ ] Progress callbacks for batch operations

**Concepts**: MCP protocol, AI agent interfaces, tool-based APIs

### Lesson 5.5 — Agent Hardening & Production Readiness
- [ ] API key authentication with middleware
- [ ] Request/response audit logging
- [ ] Circuit breakers for external calls
- [ ] Resource quotas and abuse prevention
- [ ] Integration testing with MCP inspector

**Concepts**: Agent security, production hardening, compliance logging

### Lesson 5.6 — Full-Stack Integration
- [ ] Connect React frontend to real backend API
- [ ] Replace MSW with actual HTTP calls
- [ ] Frontend-to-backend end-to-end tests
- [ ] Docker multi-container setup (frontend + backend + db)
- [ ] Production deployment checklist

**Concepts**: Full-stack systems, containerization, production deployment

---

## Final Goal: MCP-Ready Todo System

By the end of Phase 5, you will have:

- **Frontend**: Production-grade React app (completed in Phase 1-4)
- **Backend**: Hardened Node.js API with PostgreSQL persistence
- **MCP Layer**: AI agent can interact via tools (`create_todo`, `complete_todo`, etc.)
- **Security**: Rate limits, auth, audit logs, input validation
- **Documentation**: OpenAPI specs + MCP tool definitions

**Senior Backend Tutor rule** (`senior-backend-tutor.md`) now active for Phase 5.

---

## Phase 6: A2A Protocol & Multi-Agent Systems

*Build on your MCP knowledge to create cooperating agents using Google's Agent-to-Agent (A2A) protocol.*

### Lesson 6.1 — A2A Protocol Fundamentals
- [ ] Understand A2A vs MCP: when to use each
- [ ] A2A discovery and capability negotiation
- [ ] Task lifecycle: send, subscribe, update, complete
- [ ] Artifact exchange between agents
- [ ] Push notifications and streaming updates

**Concepts**: Agent-to-Agent protocol, multi-agent orchestration, distributed task management

### Lesson 6.2 — Building the Task Manager Agent
- [ ] Fastify server with A2A endpoints (`/.well-known/agent.json`)
- [ ] Task storage and state machine (pending → working → complete)
- [ ] Implement `tasks/send`, `tasks/get`, `tasks/cancel`
- [ ] Streaming responses with Server-Sent Events
- [ ] Error handling and retry logic for agent communication

**Concepts**: A2A server implementation, task state management, streaming APIs

### Lesson 6.3 — Building the Worker Agent (MCP + A2A Hybrid)
- [ ] Agent that exposes both MCP tools AND A2A capabilities
- [ ] Register as remote MCP server via A2A discovery
- [ ] Handle complex tasks by delegating to MCP tools
- [ ] Report progress back to Task Manager via A2A

**Concepts**: Hybrid agent architecture, capability composition, remote MCP

### Lesson 6.4 — Multi-Agent Collaboration Prototype
- [ ] **Agent 1: Task Manager** — receives user requests, breaks down into subtasks
- [ ] **Agent 2: Todo Worker** — specialized in todo CRUD via MCP tools
- [ ] **Agent 3: Notification Worker** — handles reminders and alerts
- [ ] Set up local agent mesh with HTTP + SSE communication
- [ ] Demonstrate: "Remind me to call mom tomorrow" → Task Manager → Todo Worker (create) + Notification Worker (schedule)

**Concepts**: Agent mesh, task decomposition, multi-agent workflows, capability routing

### Lesson 6.5 — Production Multi-Agent Considerations
- [ ] Agent authentication and trust boundaries
- [ ] Rate limiting across agent boundaries
- [ ] Circuit breakers for unreliable agents
- [ ] Observability: tracing requests across agent calls
- [ ] Security: validating agent identities, sandboxing tool execution

**Concepts**: Production agent systems, trust and security, distributed tracing

---

## Phase 4 Extended: Deep TypeScript Mastery

*Enhance your TypeScript skills with advanced patterns specifically for backend and agent integration.*

### Lesson 4.6 — Advanced TypeScript for Backend & Agents
- [ ] **Template literal types** for route paths and event names
- [ ] **Conditional types** for API response shapes based on request
- [ ] **Infer and mapped types** for deriving Zod schemas from TypeScript
- [ ] **Branded types** for type-safe IDs (TodoId, UserId, AgentId)
- [ ] **Function overloads** for flexible MCP tool signatures
- [ ] **Declaration merging** for extending third-party types (MCP SDK)
- [ ] **Type guards and assertions** for runtime validation narrowing
- [ ] **Async generator types** for streaming A2A responses

**Concepts**: Type-level programming, type-safe APIs, runtime-type boundary

### Lesson 4.7 — TypeScript Integration Patterns
- [ ] Share types between frontend and backend (monorepo setup)
- [ ] Generate TypeScript from OpenAPI specs
- [ ] Generate Zod schemas from TypeScript interfaces (zod-to-ts)
- [ ] Type-safe event emitters for agent communication
- [ ] RPC-style type safety for A2A calls (similar to tRPC)

**Concepts**: End-to-end type safety, schema generation, type sharing

---

## Final Goal: Multi-Agent MCP-Ready System with Advanced TypeScript

By the end of all phases, you will have:

- **Frontend**: Production-grade React app with advanced TypeScript patterns
- **Backend**: Hardened Node.js API with PostgreSQL and comprehensive types
- **MCP Layer**: AI agent tools with full type safety
- **A2A Layer**: Multi-agent system with cooperating Task Manager and Worker agents
- **Type Safety**: End-to-end TypeScript from database to frontend to agent protocols
- **Security**: Rate limits, auth, audit logs across all boundaries
- **Documentation**: OpenAPI + MCP tool definitions + A2A agent cards

**Total Scope**: 6 phases, 19 lessons, estimated 6-7 weeks at 2 hrs/day

---

## Phase 7: System Design Mastery

*Refresh core system architecture concepts and apply them to a real AI architecture problem. This phase bridges theory and practice.*

### Lesson 7.1 — System Design Fundamentals Review
- [ ] **Scalability patterns**: horizontal vs vertical scaling, load balancing, caching strategies
- [ ] **Database design**: SQL vs NoSQL tradeoffs, sharding, replication, indexing strategies
- [ ] **Microservices vs monoliths**: when to choose each, service boundaries, inter-service communication
- [ ] **API design**: REST vs GraphQL vs gRPC, versioning, rate limiting strategies
- [ ] **CAP theorem and consistency models**: strong vs eventual consistency, ACID vs BASE

**Concepts**: Distributed systems, scalability, reliability, tradeoff analysis

### Lesson 7.2 — Core System Components Deep Dive
- [ ] **Message queues**: Kafka, RabbitMQ, SQS — when and why, at-least-once vs exactly-once delivery
- [ ] **Caching layers**: Redis, CDN, browser caching, cache invalidation strategies
- [ ] **Search and indexing**: Elasticsearch, full-text search, vector databases for AI
- [ ] **Real-time systems**: WebSockets, SSE, long-polling, pub/sub patterns
- [ ] **Authentication & authorization**: OAuth 2.0, JWT, session management, SSO

**Concepts**: Component selection, integration patterns, failure handling

### Lesson 7.3 — AI System Architecture Patterns
- [ ] **LLM inference architecture**: model serving, batching, streaming responses
- [ ] **Vector databases and RAG**: embedding storage, similarity search, knowledge retrieval
- [ ] **Agent orchestration patterns**: supervisor agents, fan-out/fan-in, state management
- [ ] **Rate limiting and cost control**: token budgets, tiered access, request queuing
- [ ] **Observability in AI systems**: prompt logging, token tracking, A/B testing models

**Concepts**: AI-specific infrastructure, cost optimization, monitoring LLM applications

### Lesson 7.4 — Case Study: Design a Multi-Agent Task Management System
- [ ] **Problem statement**: Design a system where multiple AI agents collaborate on complex tasks
- [ ] **Requirements gathering**: functional, non-functional, scale estimates
- [ ] **High-level design**: agent registry, task queue, result aggregator, human-in-the-loop
- [ ] **Component selection**: database (PostgreSQL + Redis), message broker (Kafka/RabbitMQ), vector DB
- [ ] **API design**: A2A protocol endpoints, MCP tool definitions, webhook callbacks
- [ ] **Scalability considerations**: agent pooling, backpressure, circuit breakers
- [ ] **Failure modes**: agent crashes, network partitions, poison messages
- [ ] **Trade-off discussion**: latency vs consistency, cost vs accuracy, complexity vs maintainability

**Concepts**: End-to-end architecture design, real-world constraints, defending design decisions

### Lesson 7.5 — Architecture Implementation Review
- [ ] **Review our actual implementation**: compare Phase 6 multi-agent system to the design
- [ ] **Gap analysis**: what we simplified, what we could improve
- [ ] **Production readiness**: monitoring, alerting, disaster recovery
- [ ] **Cost estimation**: infra costs at scale, optimization opportunities
- [ ] **Evolution roadmap**: how the architecture would evolve with more agents, more users

**Concepts**: Design vs reality, iterative architecture, technical debt management

---

## Final Complete Goal: Full-Stack Senior Engineer with System Design + AI Architecture

By the end of all 7 phases, you will have:

- **Frontend**: Production-grade React with advanced TypeScript patterns
- **Backend**: Hardened Node.js API with PostgreSQL, MCP tools, A2A protocol
- **Multi-Agent System**: 3+ cooperating agents with task orchestration
- **Type Safety**: End-to-end TypeScript from database to frontend to agent protocols
- **Security**: Rate limits, auth, audit logs across all boundaries
- **System Design**: Refreshed core concepts + hands-on AI architecture design practice
- **Architecture Skills**: Ability to design and defend a multi-agent AI system at scale

**Total Scope**: 7 phases, 24 lessons, estimated 8-9 weeks at 2 hrs/day

---

## Phase 8: AI Governance, Safety & Responsible Engineering

*Understand AI governance frameworks and apply responsible AI principles to production systems. Critical for building trustworthy AI applications.*

### Lesson 8.1 — AI Governance Frameworks Overview
- [ ] **NIST AI Risk Management Framework (AI RMF)**: core functions (Govern, Map, Measure, Manage)
- [ ] **EU AI Act**: risk categories (minimal, limited, high, unacceptable), compliance requirements
- [ ] **Key principles**: transparency, accountability, fairness, privacy, human oversight
- [ ] **Governance in practice**: AI system cards, model documentation, impact assessments
- [ ] **Industry standards**: ISO/IEC 42001, IEEE standards for AI ethics

**Concepts**: AI governance, regulatory compliance, risk management, responsible AI

### Lesson 8.2 — Applying AI Safety to Our Multi-Agent System
- [ ] **Human-in-the-loop design**: when and how to require human approval
- [ ] **Agent behavior constraints**: sandboxing, permission boundaries, kill switches
- [ ] **Audit trails and accountability**: tracking every agent decision
- [ ] **Fairness and bias**: ensuring todo prioritization doesn't discriminate
- [ ] **Transparency**: logging agent reasoning for debugging and trust

**Concepts**: AI safety, human oversight, auditability, responsible deployment

### Lesson 8.3 — Privacy and Data Protection in AI Systems
- [ ] **Data minimization**: only collect what's needed for agent operation
- [ ] **PII handling**: detecting and protecting personal information in agent inputs
- [ ] **Consent and purpose limitation**: clear data use policies
- [ ] **Right to explanation**: users can understand agent decisions
- [ ] **Data retention and deletion**: implementing data lifecycle policies

**Concepts**: Privacy by design, GDPR considerations, data ethics

### Lesson 8.4 — Building Trustworthy AI: Final Review
- [ ] **System card for our multi-agent todo system**: documenting capabilities and limitations
- [ ] **Risk assessment**: identifying and mitigating potential harms
- [ ] **Monitoring for misuse**: detecting anomalous agent behavior
- [ ] **Incident response plan**: what to do when agents behave unexpectedly
- [ ] **Final responsible AI checklist**: pre-deployment safety review

**Concepts**: Trustworthy AI, safety engineering, operational ethics

---

## Final Complete Goal: Responsible Full-Stack Senior Engineer with AI Architecture

By the end of all 8 phases, you will have:

- **Frontend**: Production-grade React with advanced TypeScript patterns
- **Backend**: Hardened Node.js API with PostgreSQL, MCP tools, A2A protocol
- **Multi-Agent System**: 3+ cooperating agents with task orchestration
- **Type Safety**: End-to-end TypeScript from database to frontend to agent protocols
- **Security**: Rate limits, auth, audit logs across all boundaries
- **System Design**: Refreshed core concepts + hands-on AI architecture design practice
- **AI Governance**: Knowledge of NIST AI RMF or EU AI Act + applied safety principles
- **Architecture Skills**: Ability to design, defend, and responsibly deploy multi-agent AI systems at scale

---

## Phase 9: LLM Fundamentals, AI Security & Production Optimization

*Complete your AI readiness with deep LLM knowledge, security hardening, and production-grade optimizations.*

### Lesson 9.1 — LLM Fundamentals & Prompt Engineering
- [ ] **How LLMs work**: transformers, attention mechanisms, context windows, tokenization
- [ ] **Token economics**: counting tokens, cost per token, context window limits
- [ ] **Prompt engineering patterns**: zero-shot, few-shot, chain-of-thought, ReAct pattern
- [ ] **Structured output**: forcing JSON/XML from LLMs, output schemas, parsing reliability
- [ ] **Model selection**: when to use GPT-4 vs GPT-3.5 vs open-source models

**Concepts**: Transformer architecture, prompt patterns, output control, model tradeoffs

### Lesson 9.2 — AI Security: Prompt Injection & Output Safety
- [ ] **Prompt injection attacks**: DAN, jailbreaking, indirect injection via documents
- [ ] **Defensive patterns**: input validation, prompt hardening, system prompt isolation
- [ ] **Output filtering**: PII detection, toxicity moderation, fact-checking strategies
- [ ] **Sandboxing tool execution**: restricted environments, permission boundaries
- [ ] **Security testing**: red-teaming your agents, adversarial prompt testing

**Concepts**: AI security, adversarial robustness, input/output sanitization

### Lesson 9.3 — Production RAG: Evaluation & Optimization
- [ ] **Chunking strategies**: semantic chunking, fixed-size, overlap, recursive splitting
- [ ] **Embedding models**: OpenAI, sentence-transformers, fine-tuning embeddings
- [ ] **Retrieval optimization**: hybrid search (sparse + dense), re-ranking (Cohere, cross-encoders)
- [ ] **RAG evaluation metrics**: MRR, NDCG, answer relevance, faithfulness, context precision
- [ ] **Production RAG patterns**: query preprocessing, incremental indexing, caching

**Concepts**: Information retrieval, evaluation metrics, retrieval quality

### Lesson 9.4 — AI Testing, Evaluation & A/B Testing
- [ ] **LLM evaluation frameworks**: RAGAS, TruLens, custom benchmarks
- [ ] **Regression testing**: ensuring model updates don't break agent behavior
- [ ] **A/B testing models**: measuring business impact, statistical significance
- [ ] **Synthetic data generation**: creating edge case test datasets
- [ ] **Human evaluation pipelines**: collecting ground truth, inter-rater agreement

**Concepts**: ML evaluation, statistical testing, dataset creation, human-in-the-loop validation

### Lesson 9.5 — Cost Optimization & Production Observability
- [ ] **Caching strategies**: semantic cache, exact match cache, prompt caching, response caching
- [ ] **Model routing**: intelligent routing (complex→GPT-4, simple→GPT-3.5), fallbacks
- [ ] **Batching and streaming**: optimizing token throughput, latency vs cost tradeoffs
- [ ] **Cost tracking per user/feature**: billing, showback, budget alerts
- [ ] **AI observability**: prompt/response tracing, latency breakdown, model drift detection

**Concepts**: Cost engineering, latency optimization, production monitoring, budget management

---

## Final Complete Goal: Production-Ready AI Engineer

By the end of all 9 phases, you will have:

- **Frontend**: Production-grade React with advanced TypeScript patterns
- **Backend**: Hardened Node.js API with PostgreSQL, MCP tools, A2A protocol
- **Multi-Agent System**: 3+ cooperating agents with task orchestration
- **Type Safety**: End-to-end TypeScript from database to frontend to agent protocols
- **Security**: Rate limits, auth, audit logs, **prompt injection defenses**, output filtering
- **System Design**: Refreshed core concepts + hands-on AI architecture design practice
- **AI Governance**: Knowledge of NIST AI RMF or EU AI Act + applied safety principles
- **LLM Expertise**: Transformer fundamentals, prompt engineering, model selection
- **Production RAG**: Chunking, embeddings, evaluation metrics, optimization
- **Cost Engineering**: Caching, model routing, budget management, observability
- **Architecture Skills**: Ability to design, defend, and responsibly deploy multi-agent AI systems at scale

---

## Graduation Criteria

By the end of this plan, you will be able to:

- [x] Build a production-grade React + TypeScript frontend with advanced patterns
- [x] Write clean, typed, accessible, and tested components
- [x] Manage complex state with Zustand/Jotai and implement undo/redo
- [x] Apply advanced TypeScript: generics, discriminated unions, utility types, branded types
- [x] Optimize performance with measurable results (Web Vitals, memoization, virtualization)
- [x] Integrate APIs with TanStack Query, proper caching, and error handling
- [x] Set up CI/CD pipelines and monitor production apps (GitHub Actions, error tracking)
- [x] Review code like a senior engineer and document architectural decisions (ADRs)
- [x] Build hardened Node.js backends with PostgreSQL, Prisma, and Zod validation
- [x] Implement MCP protocol: define tools, schemas, resources for AI agent consumption
- [x] Build A2A protocol servers with task lifecycle management and streaming updates
- [x] Design and deploy multi-agent systems with capability routing and distributed tracing
- [x] Apply system design principles: scalability, CAP theorem, microservices patterns
- [x] Design AI system architecture: LLM serving, RAG, vector databases, agent orchestration
- [x] Apply AI governance frameworks: NIST AI RMF, EU AI Act, system cards, risk assessment
- [x] Understand LLM fundamentals: transformers, attention, tokenization, prompt engineering
- [x] Harden AI systems against prompt injection, jailbreaking, and output safety risks
- [x] Build production RAG: chunking, embeddings, hybrid search, evaluation metrics
- [x] Optimize AI costs: caching, model routing, budget management, observability
- [x] Design, defend, and responsibly deploy multi-agent AI systems at scale

---

## How to Use This Plan

1. We go **one lesson at a time**, in order
2. I explain the concept, then we build together
3. Each lesson ends with a **working app** you can see in the browser
4. Ask questions at any point — that's how mastery happens
5. Say **"next lesson"** when you're ready to move on
6. Give me actual time I finished for each lesson so we can track progress

---

## Progress Status

| Phase | Status | Lessons |
|-------|--------|---------|
| Phase 1: Foundations | ✅ Complete | 5/5 |
| Phase 2: Intermediate Patterns | ✅ Complete | 5/5 |
| Phase 3: Advanced Practices | ✅ Complete | 5/5 |
| Phase 4: Senior-Level & Production | 🚧 In Progress | 1.75/3 (4.1 ✅, 4.2 at 6/8 items) |
| Phase 5: Backend & MCP Integration | 🔲 Pending | 0/6 |
| Phase 6: A2A Protocol & Multi-Agent | 🔲 Pending | 0/5 |
| Phase 7: System Design Mastery | 🔲 Pending | 0/5 |
| Phase 8: AI Governance & Safety | 🔲 Pending | 0/4 |
| Phase 9: LLM Fundamentals & Production | 🔲 Pending | 0/5 |

**Next up: Finish Lesson 4.2 — Logging strategies + Feature flags (2 items left)**

**Total Scope**: 9 phases, 31 lessons, estimated 10-11 weeks at 2 hrs/day

---

## 🎯 Target Checkpoint Schedule

> **Commitment**: 2 hrs/day, weekdays only (~10 hrs/week)
> **Target graduation**: **August 31, 2026**
> **Plan start of remaining work**: May 30, 2026

Each checkpoint has a **target date**. When you complete a phase, write the **actual date** next to it and check your status using the Progress Report Guide below.

| Checkpoint | Target Date | Actual Date | Status |
|------------|-------------|-------------|--------|
| **Lesson 4.2 complete** (logging + feature flags) | Jun 2, 2026 | _____ | _____ |
| **Lesson 4.3 complete** (Phase 4 done) | Jun 6, 2026 | _____ | _____ |
| **Phase 5 complete** (Backend & MCP) | Jun 27, 2026 | _____ | _____ |
| **Phase 6 complete** (A2A & Multi-Agent) | Jul 18, 2026 | _____ | _____ |
| **Phase 7 complete** (System Design) | Aug 1, 2026 | _____ | _____ |
| **Phase 8 complete** (AI Governance) | Aug 15, 2026 | _____ | _____ |
| **Phase 9 complete** (LLM & Production AI) 🎓 | Aug 29, 2026 | _____ | _____ |

**Buffer**: Targets land 2 days before Aug 31 — built-in slack for tough lessons or missed days.

---

## 📊 Progress Report Guide

Use this after completing **each phase checkpoint** to know if you need to adjust. Compare your **actual date** to the **target date**:

### 🟢 On Time / Advanced — "Great job!"
- **Actual date ≤ target date**
- You're pacing perfectly or ahead. Keep the 2 hrs/day rhythm.
- **If 3+ days ahead**: You're *advanced*. Optional — tackle bonus items (circuit breakers, Elasticsearch, advanced RAG) you'd otherwise skip, or bank the time as buffer.

### 🟡 Slightly Behind — "Catch-up mode"
- **Actual date is 1–4 days late**
- Recoverable without stress. Pick one:
  - Add **30 min** to your next 5 weekday sessions (2.5 hrs/day)
  - Do **one weekend session** (1–2 hrs) to absorb the gap
- Re-check at the next checkpoint.

### 🔴 Significantly Behind — "Re-plan needed"
- **Actual date is 5+ days late**
- The Aug 31 goal is at risk. Choose one strategy:
  - **Increase pace**: 3 hrs/day weekdays until back on target
  - **Add weekends**: 2 hrs each Sat + Sun (+20 hrs over the remaining stretch)
  - **Trim scope**: Apply the strategic skips (SQLite over PostgreSQL, conceptual-only RAG, skip circuit breakers) — see notes below
- If still behind after 2 checkpoints, **move graduation to mid-September** rather than burning out.

### Quick Self-Check Formula
```
Days off target = (actual completion date) − (target date)

≤ 0 days   → 🟢 On time / advanced
1–4 days   → 🟡 Slightly behind, minor catch-up
5+ days    → 🔴 Re-plan: add hours, weekends, or trim scope
```

### Strategic Scope Trims (use only if 🔴)
| Lesson | Streamline to save time |
|--------|------------------------|
| 5.2 Database | Use SQLite instead of full PostgreSQL setup |
| 5.5 Agent hardening | Core auth + audit only; skip circuit breakers for MVP |
| 7.2 Core components | Focus on caching + message queues; skip Elasticsearch |
| 9.3 Production RAG | Conceptual only — you already have RAG basics |

---

## 📅 Progress Log

> Record the **actual finish date** for each lesson here. This feeds the checkpoint status above.

| Lesson | Target | Actual | Notes |
|--------|--------|--------|-------|
| 4.1 — State + Advanced TS | — | ✅ Done | Completed ahead of schedule |
| 4.2 — CI/CD & Monitoring | Jun 2 | 6/8 in progress | Logging + feature flags remain |
| 4.3 — Architecture & Docs | Jun 6 | _____ | |
