export const ROLES = [
  {
    id: "01",
    name: "Brand Strategist & Consultant",
    description: "Defines the strategic foundation, brand essence, and long-term roadmap.",
    knowledgeBase: "Golden Circle, Only Statement, brand architecture, brand equity, brand essence, stakeholder workshop methodology, brand strategy document structure, the 20-year roadmap framework, semantic differential scales, positioning matrices.",
    produces: "Strategic Foundation Brief (A1)"
  },
  {
    id: "02",
    name: "Market Intelligence & Behaviour Specialist",
    description: "Analyzes market structures and consumer psychology to find competitive advantages.",
    knowledgeBase: "Microeconomics, market structure analysis, consumer behaviour theory, buying psychology, behavioural economics, decision heuristics, competitive intelligence methodology, trend analysis, Red Ocean vs. Blue Ocean frameworks, visual audit methodology.",
    produces: "Strategic Foundation Brief (A1)"
  },
  {
    id: "03",
    name: "Executive Creative Director",
    description: "Translates strategy into visual and verbal direction, governing the creative vision.",
    knowledgeBase: "Perception science, psychology, visual language systems (typography, colour, grid, hierarchy, shape, imagery, motion), brand strategy and identity, UX and information design, market intelligence applied to design, production knowledge for digital, and professional practice.",
    produces: "Creative Brief (A2)"
  },
  {
    id: "04",
    name: "Sales & Marketing Director",
    description: "Architects the commercial engine and go-to-market strategy.",
    knowledgeBase: "Go-to-market strategy, revenue architecture, sales methodology, client relationship management, account management, commercial negotiation, channel strategy, marketing funnel architecture, pricing strategy, war chest construction, pitch design, and the commercial translation of brand positioning into sales motion.",
    produces: "Commercial & GTM Brief (A3)"
  },
  {
    id: "05",
    name: "Senior Designer",
    description: "Executes the visual language system and design components.",
    knowledgeBase: "Visual execution at professional standard, design systems methodology (Atomic Design), UI and UX principles, brand identity execution, responsive and component-based design, Figma and tool proficiency, handoff standards, accessibility compliance, and the quality tests every output must pass before leaving the role.",
    produces: "Design System Document (A4)"
  },
  {
    id: "06",
    name: "Senior Product Manager",
    description: "Manages the product lifecycle, roadmap, and feature specifications.",
    knowledgeBase: "Product lifecycle management, roadmap construction and prioritisation frameworks (RICE, MoSCoW), Jobs-to-be-Done, user story writing, acceptance criteria standards, data modelling fundamentals, API contract basics, feature scoping, stakeholder alignment, product metrics and OKRs, and the commercial requirements from Role 04 translated into product decisions.",
    produces: "Product Specification (A5)"
  },
  {
    id: "07",
    name: "Instructional Designer",
    description: "Designs the learning experience and curriculum architecture.",
    knowledgeBase: "Learning science foundations, instructional design models and frameworks, learning experience architecture, SME management, learner analysis, technology and platform knowledge, evaluation and measurement, and professional practice. Includes the five-problem framework: prerequisite mapping, tacit vs. explicit knowledge, declarative vs. procedural knowledge, cognitive load sequencing, and transfer design.",
    produces: "Learning Design Document (A8)"
  },
  {
    id: "08",
    name: "Learning Systems Architect",
    description: "Architects the full learning ecosystem and technology stack.",
    knowledgeBase: "Organisational learning theory, systems thinking applied to learning, learning ecosystem architecture, measurement and evidence architecture, technology strategy, business and strategy alignment, and change management and adoption.",
    produces: "Ecosystem Architecture (A9)"
  },
  {
    id: "09",
    name: "Senior Full Stack Engineer",
    description: "Builds the technical infrastructure and frontend/backend systems.",
    knowledgeBase: "PWA architecture, frontend engineering (React, component systems, responsive design, performance), backend engineering (API design, database design, authentication, server architecture), deployment and infrastructure, CI/CD pipelines, security fundamentals, code quality standards, technical debt management, and the specific constraints of building for AI-integrated systems.",
    produces: "Build Ticket (A6)"
  },
  {
    id: "10",
    name: "AI Systems & Agentic Architect",
    description: "Orchestrates LLMs and designs agentic workflows.",
    knowledgeBase: "LLM orchestration frameworks, agent role design, prompt engineering at an architectural level, context window management, tool use and function calling, multi-agent coordination patterns, agentic workflow design, automation pipeline construction, RAG (Retrieval-Augmented Generation) systems, knowledge base architecture for AI consumption, deployment at scale, failure mode design for agentic systems, and the ethics and constraints of autonomous AI operation.",
    produces: "Build Ticket (A6)"
  },
  {
    id: "13",
    name: "Content & Communications Director",
    description: "Governs the verbal identity and content strategy.",
    knowledgeBase: "Content strategy foundations, verbal identity and brand voice, communications strategy, editorial direction, SEO as strategic discipline, PR and media relations, digital content and platform knowledge, and content for productised knowledge systems including writing for AI consumption and knowledge base architecture.",
    produces: "Content Strategy Brief (A7)"
  }
];

export const TIERS = [
  { id: 0, name: "System Governance", docs: ["DOC 00", "DOC 01"] },
  { id: 1, name: "Artefact Template Library", docs: ["DOC 02", "DOC 03", "DOC 04", "DOC 05", "DOC 06", "DOC 07", "DOC 08", "DOC 09", "DOC 10"] },
  { id: 2, name: "Role Repositories", docs: ["DOC 11", "DOC 12", "DOC 13", "DOC 14", "DOC 15", "DOC 16", "DOC 17", "DOC 18", "DOC 19", "DOC 20", "DOC 21", "DOC 22"] },
  { id: 3, name: "Adjacent Knowledge Bases", docs: ["DOC 23", "DOC 24", "DOC 25", "DOC 26", "DOC 27", "DOC 28"] }
];
