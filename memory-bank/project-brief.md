# Project Brief: Nerdy Ad Engine

## Overview
Autonomous ad copy generation system for Varsity Tutors (Nerdy) that generates Facebook & Instagram ad copy, evaluates quality across 5 dimensions, and measurably improves over time.

## Goals
- Generate high-quality ad copy for Varsity Tutors SAT prep campaigns
- Evaluate ads across 5 dimensions (clarity, value prop, CTA, brand voice, emotional resonance)
- Self-improving feedback loop: generate -> evaluate -> diagnose -> regenerate
- Scrape Meta Ad Library for competitive intelligence and calibration
- Track performance-per-token as the north star metric
- Dashboard for viewing ads, scores, and quality trends

## Requirements
- v1: Text-only pipeline (no image generation)
- 50+ distinct ads across varied briefs (192+ unique brief combinations)
- Quality threshold: 7.0/10 weighted average to enter ad library
- Max 3 regeneration attempts per brief
- Full tracing via LangSmith
- Brand voice must always match Varsity Tutors guidelines (empowering, knowledgeable, approachable, results-focused)

## Deliverables
- Working ad generation pipeline (LangGraph)
- Meta Ad Library scraper
- Elysia API server
- Next.js dashboard with quality trend visualization
- Docker setup
- Decision log and technical writeup
