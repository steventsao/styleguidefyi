# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

styleguide.fyi publishes a coding guide for people and agents, independent rule assessments, and a source-attributed catalog of public guides. This extension adds original explanatory articles, search metadata, RSS, and newsletter launch signups.

## Capabilities and Constraints

The existing guide, public rule anchors, captured-source provenance, and read-only agent tools remain authoritative. Pages are built with Astro. The user requested Cloudflare-only newsletter infrastructure; a Worker and D1 collect consented launch signups. Email sending is not configured. Pending addresses are not confirmed subscribers.

## Evidence on Hand

Guide data, reviewer fingerprints, original-source captures and licenses, and source code are in this repository. Blog articles link back to that material. Do not invent author credentials, subscriber counts, endorsements, or search rankings.

## Product Principles

- Explain the reason and trade-off behind advice.
- Preserve the distinction between original writing, adopted rules, reviewer assessments, and external captures.
- Make content readable without JavaScript and keep newsletter data private.
