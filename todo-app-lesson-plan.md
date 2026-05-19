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

### Lesson 3.4 — Routing & Navigation
- [ ] Add React Router: routes for all todos, active, completed
- [ ] URL-driven filtering (bookmarkable states)
- [ ] Protected routes concept (auth simulation)
- [ ] 404 handling

**Concepts**: Client-side routing, URL as state, history API, route guards

### Lesson 3.5 — Accessibility Mastery
- [ ] Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader testing (VoiceOver on Mac)
- [ ] Focus management: auto-focus on new todo, focus trap in modals
- [ ] ARIA live regions for dynamic updates ("3 items left")
- [ ] Color contrast and reduced motion preferences

**Concepts**: ARIA patterns, focus management, a11y auditing, inclusive design

---

## Phase 4: Senior-Level & Production Mastery

### Lesson 4.1 — State Management at Scale
- [ ] Zustand or Jotai: lightweight global state (replace Context)
- [ ] State normalization for complex data
- [ ] Derived state with selectors
- [ ] Undo/redo functionality

**Concepts**: State libraries tradeoffs, normalized state shape, derived data, command pattern

### Lesson 4.2 — Advanced TypeScript
- [ ] Discriminated unions for todo actions
- [ ] Generic components (`List<T>`)
- [ ] Utility types: `Pick`, `Omit`, `Partial`, `Record`
- [ ] Type-safe event emitters and API responses
- [ ] `satisfies` operator and `const` assertions

**Concepts**: Advanced type patterns, type narrowing, conditional types, type-level programming

### Lesson 4.3 — CI/CD & DevOps for Frontend
- [ ] GitHub Actions: lint, test, build on every PR
- [ ] Preview deployments (Vercel/Netlify)
- [ ] Environment variables and configuration management
- [ ] Automated accessibility audits in CI (axe-core)

**Concepts**: Continuous integration, deployment pipelines, environment management

### Lesson 4.4 — Monitoring & Error Tracking
- [ ] Error boundaries with error reporting
- [ ] Performance monitoring (Web Vitals: LCP, FID, CLS)
- [ ] Logging strategies for production
- [ ] Feature flags for gradual rollouts

**Concepts**: Observability, performance metrics, production debugging, progressive delivery

### Lesson 4.5 — Architecture & Code Review
- [ ] Final refactor: clean architecture review
- [ ] File/folder structure for scalability
- [ ] Documentation: README, component docs, ADRs (Architecture Decision Records)
- [ ] Code review checklist: what senior engineers look for
- [ ] Final production-readiness audit (use the production-ready-checklist skill)

**Concepts**: Software architecture, technical documentation, code review culture, engineering maturity

---

## Graduation Criteria

By the end of this plan, you will be able to:

- [x] Build a React + TypeScript app from scratch with modern tooling
- [x] Write clean, typed, accessible, and tested components
- [x] Manage complex state with the right tool for the job
- [x] Optimize performance with measurable results
- [x] Integrate APIs with proper caching and error handling
- [x] Set up CI/CD and monitor production apps
- [x] Review code like a senior engineer
- [x] Make and justify architectural decisions

---

## How to Use This Plan

1. We go **one lesson at a time**, in order
2. I explain the concept, then we build together
3. Each lesson ends with a **working app** you can see in the browser
4. Ask questions at any point — that's how mastery happens
5. Say **"next lesson"** when you're ready to move on

**Ready to start with Lesson 1.1?**
