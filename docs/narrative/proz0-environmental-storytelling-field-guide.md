# P-NARR-003 — ProZ0 Environmental Storytelling Field Guide

**Task:** P-NARR-003 / Issue #116  
**Role:** NARRATIVE_WORLD_DIRECTOR  
**Member:** B-NWD-01  
**Home Company:** COMPANY_B  
**Coordinating PM:** PM-B / B-PM-01  
**Lock:** PMB-P-NARR-003-R1  
**Status:** IMPLEMENTATION_COMPLETE — REVIEW_PENDING  
**Artifact scope:** Narrative/worldbuilding authoring guidance only.  
**Review route:** B-NWD-01 → PM-B.  
**Project Owner action:** NONE unless new canon beyond approved Layer 1 + Layer 2 is proposed.

---

## 0. Authority, sources, and use of this guide

This field guide operationalizes already-approved ProZ0 narrative foundations. It does not add new fictional facts and does not create gameplay, visual-production, audio-production, UI, schema, runtime, world-generation, or QA authority.

### Authoritative task and source versions

- Issue #116 / P-NARR-003 — source task and lock PMB-P-NARR-003-R1.
- PM-B activation comment #116 comment 5846934683.
- Activation baseline: main @ 4c1e6a2732d096783f8ec8c354479fdda03d5e7d.
- Issue #82 / P-NARR-002 — ACCEPTED / DONE.
- Project Owner bounded approval: #82 comment 5791922687.
  - Layer 1 — Foundation: APPROVED.
  - Layer 2 — Mystery Architecture: APPROVED.
  - Layer 3 — Deep Lore: remains PROPOSAL / OPEN QUESTION / DEFERRED.
- World Bible: docs/narrative/proz0-world-bible-foundation.md.
  - Source blob at activation baseline: c4fc48bbca9a99483821facd061ec55817188bce.
- Issue #84 / P-TD-002 — ACCEPTED / DONE.
- Narrative Evidence Taxonomy: docs/technical/proz0-narrative-evidence-taxonomy.md.
  - Source blob at activation baseline: 7f4dbec2772ff8660e3968948843f51d58c974de.
  - Accepted through PR #94; merge commit c1cae8a7838f22100520010a81c079cc147ce439.
- Issue #65 / P1-NARR-001 — ACCEPTED / DONE.
- Phase 1 Ruin Mystery Hook: docs/narrative/phase-1-ruin-mystery-hook.md.
  - Source blob at activation baseline: ffc9a6d2524f0457d914483170d831de70a8ff48.

The World Bible file still contains its pre-PO-review lifecycle wording in places. The later explicit Project Owner decision on #82 controls: approved Layer 1 + Layer 2 may be used; Layer 3 may not be promoted to canon.

### Protected unresolved truths

Unless a later higher-precedence Source of Truth explicitly changes them, this guide must not establish:

- exact prior-civilization identity or builder species;
- exact relationship between humanity and the prior civilization;
- final Great Dispersal explanation;
- final nature of Something Older;
- final prior-civilization fate;
- unresolved human-catastrophe or Seed Colony historical specifics;
- final/canonical ending or endgame choice;
- the true purpose of the Phase 1 ruin;
- decoded function, cultural meaning, extraordinary property, or final origin of the Ancient Alloy Shard.

### Classification discipline

Use the existing project classifications:

- CONFIRMED — supported by approved sources within their exact scope.
- PO DECISION — explicit Project Owner direction.
- PROPOSAL — working direction that is not canon.
- OPEN QUESTION — intentionally unresolved.
- CONSTRAINT — a boundary that authoring must respect.
- DEFERRED — a postponed decision.

A vivid environmental idea does not become CONFIRMED because it appears in art, audio, a level layout, a data record, or this guide. Instantiated content inherits authority from its approved source.

---

# 1. PURPOSE AND AUTHORING MODEL

## 1.1 Purpose

ProZ0 should let players learn about the world by reading the world.

Environmental storytelling should communicate meaning through relationships among:

- spaces;
- objects;
- material condition;
- absence;
- maintenance;
- reuse;
- damage;
- topology;
- environmental contradiction;
- comparison between sites;
- comparison between human settlement and earlier engineered evidence.

The goal is not to eliminate text, logs, audio, or explicit explanation. The goal is to ensure that the central mystery does not depend on exposition-heavy delivery to become coherent.

When the environment can carry the first burden of proof, it should.

## 1.2 The authoring model: evidence first

A strong ProZ0 environmental story separates what exists from what it means.

Author in this order:

1. **Physical or relational observation** — what can be supported by the authored environment.
2. **Interpretive opening** — what a reasonable player might infer.
3. **Ambiguity boundary** — what the evidence still cannot establish.
4. **Comparison opportunity** — what another site, condition, motif, material relation, or ecological pattern could later challenge.
5. **Recontextualization path** — how later evidence can change the preferred interpretation while preserving the original observation.

Do not author backward from a desired secret answer and then make every object point unambiguously to it. Start with evidence that is useful even while the deeper answer remains open.

## 1.3 Environmental sentences

Treat a space as capable of forming an environmental sentence from several parts:

- **Carrier:** a space, structure, object, interface, route, material boundary, ecological pattern, or absence.
- **Condition:** intact, repaired, removed, damaged, eroded, maintained, repurposed, interrupted, inactive, layered.
- **Relationship:** attached to, aligned with, missing from, repeated beside, crossing, bypassing, nested under, reclaimed by.
- **Comparison:** similar to or different from another approved observation.
- **Uncertainty:** what the arrangement does not yet prove.

Example authoring form:

> A repeated interface lacks the component it appears designed to receive; the removal boundary looks controlled; this supports deliberate removal as a possibility but does not establish motive, destination, or final historical cause.

That is stronger than:

> The builders removed the component before abandoning the planet.

The first preserves evidence and ambiguity. The second silently canonizes motive and fate.

## 1.4 Spaces

A space communicates story when its arrangement makes a relationship legible.

Useful narrative questions:

- What is the player expected to notice before any explanation?
- Which relationship between elements makes the observation meaningful?
- What expectation does the space create?
- What is missing, altered, bypassed, or preserved relative to that expectation?
- Does the observation remain valid if encountered before other clues?

Space must not become a hidden fixed-quest gate. Exact routes, distances, encounter placement, interaction ranges, and traversal mechanics remain outside this guide.

## 1.5 Objects

An object is useful narrative evidence when its presence, absence, condition, placement, or relation to another object supports an observation.

Avoid “lore prop” authoring where an isolated object exists only so a tooltip can explain history.

Prefer:

- repeated interfaces;
- mismatched replacement pieces;
- removed components with legible boundaries;
- parts reused in a later context;
- objects whose relationship becomes more meaningful after comparison.

Do not infer culture, species, ideology, or final purpose from one object unless an approved source already establishes it.

## 1.6 Material condition

Condition should communicate process, not just “oldness.”

Potentially distinguishable authoring ideas include:

- damage;
- erosion;
- clean removal;
- repair;
- patching;
- reuse;
- partial maintenance;
- deliberate shutdown;
- interruption.

The exact visual/audio expression is not defined here. The narrative author defines the semantic distinction that must remain possible without specifying palette, sprite treatment, VFX, sound design, or asset acceptance.

## 1.7 Absence

Absence becomes evidence only when there is a reason to expect something.

Useful negative-space authoring includes:

- an interface without its counterpart;
- repeated anchor points with the same class of component missing;
- infrastructure whose scale implies a missing relationship;
- a maintained path that reaches a removed or inactive element.

An empty room is not automatically a clue.

Absence must not be upgraded to extinction, evacuation, destruction, transformation, or deliberate disappearance without sufficient approved evidence.

## 1.8 Maintenance, repair, reuse, and damage

These conditions should remain semantically distinct where the narrative relies on them.

- **Maintenance** can imply continuity of care without identifying who performed it or why.
- **Repair** can imply response to wear or failure without proving emergency.
- **Reuse** can imply later adaptation without proving ideology or faction.
- **Damage** can show that something changed physically without proving cause.
- **Removal** can differ from breakage without proving motive.

Authors should write the observation first, then list plausible readings.

## 1.9 Topology

Topology is narrative when relationships across space carry meaning.

Potential observations may concern:

- repeated alignment;
- recurring connection logic;
- directional relationships;
- hierarchy;
- redundancy;
- missing links;
- local structures that become legible when compared with other approved evidence.

Topology may suggest that a site belonged to a larger system, but this guide never defines a map mechanic, network purpose, travel system, or world-generation rule.

## 1.10 Environmental contradiction

A contradiction should challenge an interpretation, not erase truthful evidence.

Good contradiction:

> The first site looked like a local emergency abandonment, but distant sites show a similar orderly shutdown pattern.

Bad contradiction:

> The shutdown evidence at the first site was fake.

The player should be able to revisit the same fact with better context.

---

# 2. APPROVED MYSTERY METHOD

The approved Layer 2 method is:

**EVIDENCE → INTERPRETATION → CONTRADICTION → RECONTEXTUALIZATION**

This is an authoring sequence, not a mandatory quest sequence.

## 2.1 EVIDENCE

### Directly observable

Evidence describes what the environment materially or relationally supports.

Examples of valid evidence forms:

- a component is absent from an interface;
- a removal boundary differs from surrounding breakage;
- two structures share a connection pattern;
- a later modification bypasses an earlier one;
- an ecological pattern correlates with old infrastructure;
- a layer does not match the current comparison set.

### What the player may infer

The player may form one or more explanations, but the evidence record itself does not include final motive, cause, identity, or historical truth unless an approved source already establishes it.

### What remains uncertain

Typically:

- why the condition exists;
- who caused it;
- whether the pattern is local or widespread;
- whether similar observations share one cause;
- whether an absence means departure, destruction, transformation, or something else.

### What later evidence may recontextualize

Later evidence may:

- show the same pattern elsewhere;
- show a different treatment of the same system;
- reveal compatible receiver interfaces;
- demonstrate that an assumed local anomaly has a wider relationship;
- reveal that the current comparison set is incomplete.

### What cannot be stated as confirmed

Evidence alone must not establish protected Layer 3 truths, builder identity, humanity relationship, final fate, final Great Dispersal truth, final Something Older truth, or the true purpose of the Phase 1 ruin.

## 2.2 INTERPRETATION

### Directly observable

The interpretation itself is not an observation. It is a reading derived from one or more observations.

### What the player may infer

A reasonable player may prefer an explanation because it currently accounts for the evidence efficiently.

Examples:

- scavenging may explain missing parts;
- a repeated pattern may suggest organized decommissioning;
- matching interfaces may suggest a distributed system;
- ecological correlation may suggest influence or response.

### What remains uncertain

Interpretation must retain assumptions and competing explanations.

An interpretation does not inherit CONFIRMED status from confirmed evidence.

### What later evidence may recontextualize

Additional observations can make one interpretation weaker, stronger, broader, narrower, or incomplete.

### What cannot be stated as confirmed

Do not present a preferred interpretation as narrator-certified historical truth unless the Source of Truth explicitly approves it.

## 2.3 CONTRADICTION

### Directly observable

New evidence creates pressure against an earlier assumption or interpretation.

### What the player may infer

The earlier explanation may be insufficient, local, incomplete, or based on an incorrect assumption.

### What remains uncertain

A contradiction does not automatically prove the opposite theory.

If “local crisis” becomes less convincing, “planet-wide planned departure” does not automatically become true.

### What later evidence may recontextualize

Further comparison can reveal whether the contradiction is:

- an exception;
- a broader pattern;
- evidence of historical plurality;
- evidence that the original category was too broad.

### What cannot be stated as confirmed

Do not rewrite an earlier truthful observation as false simply because its first interpretation no longer fits.

## 2.4 RECONTEXTUALIZATION

### Directly observable

The original evidence remains observable.

### What the player may infer

With new context, the player can prefer a different interpretation or understand that multiple readings remain viable.

### What remains uncertain

Recontextualization should usually preserve some unanswered question. It adds meaning; it does not need to close the mystery.

### What later evidence may recontextualize again

A recontextualized interpretation may itself remain provisional.

The world can support increasing epistemic maturity without locking a single final answer too early.

### What cannot be stated as confirmed

Recontextualization does not authorize protected Layer 3 answers.

## 2.5 Authoring chain test

For every meaningful chain, authors should be able to answer:

- What is the evidence before any theory?
- What assumption makes the initial interpretation attractive?
- What different evidence challenges that assumption?
- Which original observation remains true?
- What becomes a better interpretation?
- What is still unknown?
- Would the chain remain coherent if the player found the “later” evidence first?

If the final question fails, the chain may be a fixed quest in disguise.

---

# 3. ENVIRONMENTAL EVIDENCE FAMILIES

The families below are reusable authoring lenses. They do not assert that every site or the Phase 1 first region contains each pattern.

## 3.1 Constructed-site condition

**Use for:** reading history from the condition of engineered spaces.

Authoring focus:

- distinguish intentional construction from natural formation where the source allows;
- treat condition as evidence of process;
- separate “old,” “damaged,” “maintained,” “removed,” “reused,” and “inactive” where meaning depends on the difference.

Avoid:

- assigning exact age without approval;
- deriving species, culture, or purpose from condition alone;
- treating generic decay as proof of catastrophe.

## 3.2 Missing components

**Use for:** meaningful negative space where a component is expected but absent.

Authoring focus:

- establish the expectation through interfaces, repeated anchors, or comparison;
- describe the absence before suggesting why it happened;
- compare repeated missing categories where approved content supports it.

Avoid:

- “missing” with no reason the player should expect anything;
- immediate claims of salvage, evacuation, or deliberate departure.

## 3.3 Repair and dismantling traces

**Use for:** distinguishing broken, repaired, removed, or decommissioned states.

Authoring focus:

- identify boundaries or relationships that make process legible;
- retain more than one possible motive;
- use repeated process patterns to support later recontextualization.

Avoid:

- turning clean removal into proof of the Great Dispersal;
- treating repair as proof of crisis or social stability.

## 3.4 Abandoned maintenance

**Use for:** spaces where signs of upkeep coexist with inactivity or absence.

Authoring focus:

- make “maintenance happened” separable from “who maintained it”;
- make the temporal relationship uncertain unless approved;
- use maintenance as a question about continuity, not proof of surviving builders.

Avoid:

- implying active unseen occupants;
- implying automated maintenance unless approved;
- equating preserved order with successful habitation.

## 3.5 Infrastructure topology

**Use for:** cross-site or cross-element relationships whose meaning emerges through comparison.

Authoring focus:

- repeated connection geometry;
- alignments;
- missing links;
- local elements that gain context when related to others.

Avoid:

- declaring exact network purpose;
- inventing travel, power, communication, or other mechanics;
- requiring a fixed discovery order.

## 3.6 Material mismatch

**Use for:** a material, finish, join, wear pattern, or structural relation that differs from an approved comparison set.

Authoring focus:

- establish the comparison set;
- describe the mismatch;
- preserve age, origin, and cause as separate questions.

Avoid:

- “different material” = “different species/civilization”;
- exact composition or extraordinary function without approval.

## 3.7 Ecology interacting with old structures

**Use for:** correlation between living systems and prior engineered remains.

Authoring focus:

- describe where correlation exists;
- retain both “structure influenced ecology” and “structure responded to ecology” where plausible;
- allow natural adaptation as an alternative.

Avoid:

- silently canonizing terraforming or ecological engineering;
- treating correlation as intent.

## 3.8 Deliberate shutdown patterns

**Use for:** conditions that can be authored as orderly rather than uncontrolled.

Authoring focus:

- make shutdown evidence distinct from destruction;
- allow local decommissioning as an explanation;
- compare patterns before proposing wider history.

Avoid:

- “orderly” = “planet-wide planned departure”;
- final Great Dispersal claims.

## 3.9 Reuse and repurposing

**Use for:** later work adapting earlier structures or components.

Authoring focus:

- preserve visible relationship between earlier and later layer;
- distinguish reuse from original purpose;
- treat change as evidence of history.

Avoid:

- inferring ideology, faction, or conflict from reuse alone;
- declaring the original purpose from the repurposed state.

## 3.10 Incompatible construction layers

**Use for:** layered evidence that resists one simple chronology or authorship model.

Authoring focus:

- identify physical incompatibility or mismatch;
- allow multiple explanations such as period change, atypical work, inherited system, mistaken dating, or natural process;
- keep Something Older as an unresolved interpretive category.

Avoid:

- declaring a second civilization;
- declaring exact age or precursor relationship.

## 3.11 Repeated unresolved motifs

**Use for:** recurring shapes, arrangements, interfaces, or sonic/visual relations that indicate relationship before meaning.

Authoring focus:

- use repetition to say “related” rather than “translated”;
- allow motif recurrence to support comparison across content;
- keep semantics unresolved until approved.

Avoid:

- turning a motif into a word, religious symbol, faction emblem, warning, or language unit without approval.

## 3.12 Disagreement

**Use for:** incompatible choices across historical layers or sites.

Authoring focus:

- one layer reverses, bypasses, preserves, or treats a system differently from another;
- compare repeated divergence before preferring “disagreement” over simple technical evolution.

Avoid:

- named factions;
- ideology;
- war, rebellion, schism, or violence without approval.

## 3.13 Interruption

**Use for:** work, maintenance, construction, repair, or process that appears incomplete.

Authoring focus:

- describe what is incomplete;
- distinguish interruption from abandonment, failure, or deliberate stopping;
- retain multiple possible time scales and causes.

Avoid:

- inventing a disaster;
- assuming the builders were forced to flee.

## 3.14 Absence

**Use for:** expected presence, counterpart, occupant, object class, or trace that is meaningfully missing.

Authoring focus:

- establish the expectation;
- state the absence;
- preserve local versus global uncertainty.

Avoid:

- “absent here” = extinct;
- “no remains here” = transformed;
- “no occupants now” = left the planet.

## 3.15 Transformation-compatible evidence

**Use for:** patterns that make simple collapse less sufficient without proving a final transformation theory.

Authoring focus:

- staged removal;
- redistribution-compatible relationships;
- orderly shutdown;
- changed modes of infrastructure use;
- reduced need for familiar site types as a hypothesis.

Avoid:

- declaring that transformation occurred;
- declaring a destination, new form, survival status, success, or cause;
- turning Great Dispersal into confirmed history.

---

# 4. PLAYER-READABLE EVIDENCE GRAMMAR

The table below is a reusable grammar template, not a declaration that these facts exist in every ProZ0 location.

For each instantiated content item, the actual CANON CLASSIFICATION must come from its approved source. A template in this guide never upgrades a new observation to CONFIRMED.

| Evidence family | OBSERVED FACT | LIKELY INTERPRETATION | ALTERNATIVE INTERPRETATION | POSSIBLE LATER RECONTEXTUALIZATION | CANON CLASSIFICATION | AUTHORING RISK |
|---|---|---|---|---|---|---|
| Constructed-site condition | A deliberately organized structure has a distinguishable condition. | Age, abandonment, damage, or maintenance may explain the state. | The same condition may result from controlled decommissioning, reuse, or natural reclamation. | Comparison reveals that similar condition marks a repeated process rather than simple age. | Method is Layer 2 approved; instantiated fact inherits source classification. | Generic “old” styling can accidentally imply catastrophe or exact chronology. |
| Missing components | An expected component/counterpart is absent from a legible interface or repeated anchor. | It may have been lost or scavenged. | It may have been deliberately removed, redistributed, or never installed in this instance. | Matching receiver/removal patterns elsewhere weaken random-loss assumptions. | Usually PROPOSAL until a specific approved content source establishes the observation. | Absence without expectation is meaningless; motive can be silently canonized. |
| Repair/dismantling traces | Physical boundaries distinguish repair, breakage, or controlled removal. | Someone responded to damage or removed a part. | The mark may belong to routine lifecycle work, later reuse, or another period. | Repeated treatment across sites reframes an isolated repair/removal as a pattern. | Instantiated observation only as authorized by content source. | Clean removal can be overread as Great Dispersal proof. |
| Abandoned maintenance | Signs of upkeep coexist with inactivity or absence. | The site may have remained cared for after ordinary use declined. | Maintenance may belong to a different period, later user, or process. | Other evidence shows maintenance and occupation were not contemporaneous. | PROPOSAL pattern unless site source approves. | “Maintained” can accidentally imply active hidden builders or automation. |
| Infrastructure topology | Multiple structures/elements share alignment, interface, or connection logic. | They may be repeated examples of one type. | They may be distinct nodes in a larger system. | A locally puzzling element becomes legible as support/junction/relationship rather than standalone facility. | Layer 2 structure approved; exact topology/purpose not canon by default. | Authors may invent network function or fixed discovery order. |
| Material mismatch | One layer/material relation differs from the current comparison set. | It may represent age, damage, atypical construction, or later modification. | It may be inherited, reused, misclassified, or unrelated. | Repeated mismatches make the current single-model history incomplete. | PROPOSAL unless approved content establishes the exact observation. | “Different” can become “different species/civilization” too quickly. |
| Ecology + old structures | An ecological pattern correlates with old infrastructure. | Infrastructure may have influenced the environment. | Builders may have responded to an existing condition; natural adaptation may explain the correlation. | Similar ecology without infrastructure weakens a simple causation model. | Layer 2 Ecology method approved; cause remains open. | Terraforming/ecological engineering can leak into canon. |
| Deliberate shutdown | A site shows orderly inactive-state evidence rather than uncontrolled destruction. | It may have been deliberately decommissioned. | It may represent routine shutdown, temporary closure, or local policy. | Repeated distant patterns make local emergency explanations less sufficient. | PROPOSAL pattern; final historical cause remains open. | Orderly shutdown can be miswritten as planet-wide evacuation. |
| Reuse/repurposing | A later layer uses an earlier structure/component differently. | Later users adapted inherited infrastructure. | The apparent later use may instead be a repair, local variation, or misread original function. | Cross-site comparison reveals repeated adaptation or divergent historical choices. | PROPOSAL unless approved source establishes layers. | Repurposing can falsely “prove” original purpose or ideology. |
| Incompatible layers | Two layers do not fit one simple construction model. | One may be an older/atypical phase of the same tradition. | It may be inherited, unrelated, natural, or misdated. | More mismatches force reclassification of the historical model. | Something Older remains OPEN QUESTION / non-canon where referenced. | Accidental second-civilization canonization. |
| Repeated motifs | A motif/interface/arrangement recurs across approved evidence. | The instances may be related. | Repetition may arise from functional, chronological, regional, or other causes. | New context narrows relation without necessarily decoding meaning. | Relationship may be PROPOSAL; motif semantics remain unresolved unless separately approved. | Motif becomes language, religion, faction, or warning symbol. |
| Disagreement | Later/parallel choices conflict, reverse, or bypass one another. | Historical actors may have preferred different solutions. | Differences may reflect era, environment, technical evolution, or emergency improvisation. | Regional patterns make plurality more plausible without naming factions. | Layer 2 Internal Disagreement thread approved; specific politics remain non-canon. | War/factions/ideology inferred from technical variation. |
| Interruption | A process appears incomplete. | Work may have been interrupted. | It may be intentionally partial, abandoned later, or only appear incomplete to humans. | Other evidence changes whether interruption looks local, routine, or exceptional. | PROPOSAL unless exact site source approves. | Disaster/fleeing narrative introduced without evidence. |
| Absence | Something reasonably expected is not present. | It may have been removed, lost, or never used here. | The expectation itself may be wrong or belong to another period. | Comparison reveals meaningful controlled absence or shows the category was mistaken. | Phase 1 confirms builders absent from the encounter; broader absences need their own sources. | Local absence becomes extinction/global disappearance. |
| Transformation-compatible evidence | Multiple observations make simple collapse less sufficient. | Deliberate departure/decentralization/change in presence may be possible. | Evacuation, local decommissioning, uneven transition, or unrelated processes may fit. | A wider pattern may strengthen one hypothesis while final fate remains unresolved. | Final Great Dispersal/Transformation truth is NON_CANON_LAYER_3. | The guide accidentally announces the final answer. |

## 4.1 Grammar rules

Every authored evidence item should be expressible in six lines:

**OBSERVED FACT:** what the environment supports.  
**LIKELY INTERPRETATION:** a reasonable current reading.  
**ALTERNATIVE INTERPRETATION:** another reading compatible with the same fact.  
**POSSIBLE LATER RECONTEXTUALIZATION:** what new evidence could change the preferred reading.  
**CANON CLASSIFICATION:** exact classification/source.  
**AUTHORING RISK:** what the author is most likely to overstate.

If the OBSERVED FACT contains “because,” “therefore,” a named motive, a species claim, a final-history claim, or a protected Layer 3 answer, inspect it for interpretation leakage.

---

# 5. FIRST-REGION APPLICATION EXAMPLES

These are bounded authoring examples for the existing first-region/Phase 1 context. They do not add a resource, biome, mechanic, interaction, quest, ruin, item property, route rule, or production requirement.

They demonstrate how Company B may frame narrative meaning if a separately authorized world/art/audio/content artifact needs it.

## 5.1 Landing / Base surroundings

**Approved source basis**

- current human landing/colony is the present expedition;
- landing module / first habitat progression belongs to the approved product/gameplay foundation;
- the Phase 1 ruin is explicitly not a current human colony artifact.

**Authoring use**

The landing/base can function as a known-provenance reference layer.

**SAFE OBSERVATION**

> This infrastructure belongs to the current human settlement.

**SAFE INTERPRETATION**

> Later engineered evidence that clearly does not belong to this construction layer can feel historically separate without requiring a date.

**WHAT REMAINS OPEN**

- exact chronology beyond “predates current landing” for the ruin;
- any relationship between human construction and prior-civilization construction;
- whether future human settlement repeats, adapts, or rejects older historical patterns.

**DO NOT TURN INTO**

- a new old-ruin clue at the base;
- proof that the prior civilization built in a particular style;
- a required visual contrast specification;
- a gameplay/tutorial rule.

The base is a narrative comparison frame, not evidence that new Deep Lore exists around the landing site.

## 5.2 Resource areas

**Approved source basis**

Phase 1 includes existing approved resource-gathering areas and an environmental world. This guide does not add any resource or resource behavior.

**Authoring use**

Use resource areas to enforce evidence discipline: natural usefulness is not automatically archaeology.

**SAFE OBSERVATION**

> The player encounters an approved resource-bearing area.

**SAFE INTERPRETATION**

> No prior-civilization explanation is required merely because a resource distribution looks unusual to the player.

**POSSIBLE RECONTEXTUALIZATION**

If a later separately approved narrative source explicitly establishes a relationship between ecology/material distribution and old infrastructure, the earlier natural observation can remain true while gaining context.

**DO NOT TURN INTO**

- “the builders planted this resource”;
- “the ore proves terraforming”;
- a new harvestable item;
- a special ruin-adjacent resource rule;
- a crafting or research requirement.

The safe default is that absence of approved evidence means no archaeological claim.

## 5.3 Outward exploration transition

**Approved source basis**

- humanity has incomplete pre-catastrophe survey knowledge;
- the player explores a persistent world;
- narrative discovery is sandbox-first.

**Authoring use**

Frame the transition from known settlement context into lived uncertainty without making the survey “wrong.”

**SAFE OBSERVATION**

> The colony possesses expectations from incomplete survey knowledge, while direct exploration supplies local context.

**SAFE INTERPRETATION**

> The farther expedition can feel epistemically less certain because lived detail exceeds what the inherited survey context resolves.

**WHAT REMAINS OPEN**

- exact survey technology;
- why any particular datum is absent;
- whether a specific prior-civilization trace was missed, inaccessible, misclassified, or not represented in surviving data.

**DO NOT TURN INTO**

- a fog mechanic requirement;
- a mission objective;
- a fixed “leave base, then discover clue X” order;
- a specific survey failure story.

## 5.4 Ruin approach

**Approved source basis**

Accepted #65 requires the first ruin to communicate:

- constructed;
- older than the current colony;
- builders absent;
- original purpose unknown;
- continuing mystery.

**Authoring use**

The approach should preserve semantic recognition before explanation.

**SAFE OBSERVATION**

> The encountered structure is intentionally engineered and does not belong to the current landing party.

**SAFE INTERPRETATION**

> The player can reasonably conclude that an earlier technological presence existed here.

**ALTERNATIVE / UNCERTAINTY**

The evidence does not identify the builders, their relationship to humanity, or the site’s original function.

**POSSIBLE LATER RECONTEXTUALIZATION**

Future approved evidence may change how the player understands the site’s role in a wider history without making the initial “constructed / predates us” observation false.

**DO NOT TURN INTO**

- exact approach route;
- landmark silhouette requirements;
- hostile placement;
- required interaction timing;
- “alien temple,” “archive,” “weapon,” “beacon,” or other true-purpose label.

## 5.5 Ruin condition

**Approved source basis**

The ruin is inactive/unattended in the Phase 1 encounter and does not explain itself. Layer 2 permits environmental storytelling through condition, removal, repair, shutdown, reuse, and contradiction as authoring structures.

**Authoring use**

Condition may create questions without solving cause.

**SAFE OBSERVATION TEMPLATE**

> A specific condition may be authored so that damage, removal, repair, inactivity, or layering is legible as a physical difference.

This sentence is a template, not a claim that the Phase 1 ruin currently contains every listed condition.

**SAFE INTERPRETATION**

> A player may form a provisional theory about abandonment, maintenance, damage, or controlled change.

**WHAT REMAINS OPEN**

- exact cause;
- whether the pattern is local or civilization-wide;
- whether any process relates to the final fate of the builders.

**DO NOT TURN INTO**

- a confirmed collapse event;
- a confirmed evacuation;
- a confirmed deliberate shutdown unless a site-specific source approves it;
- Great Dispersal proof;
- exact final art treatment.

## 5.6 Ancient Alloy Shard context

**Approved source basis**

Accepted #65 confirms:

- Ancient Alloy Shard is a human-facing field designation;
- it is an unfamiliar engineered material/sample associated with the ruin;
- it is bounded physical evidence;
- it does not decode the civilization.

**SAFE OBSERVATION**

> The Ancient Alloy Shard is physically associated with the ruin and is treated by the current colony as an unfamiliar engineered sample.

**SAFE INTERPRETATION**

> It reinforces that the discovery is material evidence of earlier technological presence.

**WHAT REMAINS OPEN**

- exact composition;
- exact age;
- function;
- energy or data properties;
- cultural meaning;
- military meaning;
- builder identity;
- faction ownership;
- relationship to disappearance;
- any future crafting/research use not already approved elsewhere.

**DO NOT TURN INTO**

- a translated builder name;
- a key to the ruin’s true purpose;
- proof of species/origin;
- a new mechanic, recipe, research unlock, or extraordinary property.

---

# 6. NONLINEAR DISCOVERY SAFETY

## 6.1 Clue-order independence

Every evidence item should remain truthful and intelligible in more than one discovery order.

At minimum, review:

1. baseline order;
2. reverse order;
3. cross-thread-first order;
4. revisit order;
5. partial order where one supporting clue is never found.

A clue fails order independence if its observation only becomes true after another clue is discovered.

Interpretation may depend on context. Reality must not.

## 6.2 Multiple interpretations can coexist

A strong evidence record can support more than one plausible explanation.

Coexistence rules:

- interpretations must share the same observed facts;
- they may differ because they prioritize different assumptions;
- one interpretation can become less sufficient without becoming absurd;
- a later preferred theory does not erase why the earlier theory was reasonable.

Do not write “correct” and “incorrect” theories when the Source of Truth intentionally preserves ambiguity.

## 6.3 Revisiting a location

Revisit value is primarily semantic in this guide.

A player can mentally revisit a location because later evidence changes its meaning. A physical revisit may be useful in a future implementation, but this document does not require it.

When authoring revisit potential, state:

- the original observation;
- the new context;
- the interpretation that changes;
- the fact that remains true.

Do not encode a quest step, revisit trigger, unlock, interaction, or progression dependency.

## 6.4 Avoid false evidence

Environmental evidence may be incomplete, ambiguous, damaged, miscategorized by characters, or difficult to interpret.

It must not be intentionally false merely to protect a twist.

Allowed:

- a character interpretation is wrong;
- a human field label is provisional;
- a site is initially misclassified because the comparison set is small;
- later evidence shows an assumption was too narrow.

Not allowed without explicit source authority:

- the game fabricates physical evidence that later “never happened”;
- a truthful observation is retroactively denied;
- a confirmed fact is secretly false because a twist needs it.

## 6.5 Recontextualization versus retcon

**Recontextualization:**

> “The same removal marks now look less like desperate scavenging because similar organized patterns appear elsewhere.”

The fact remains.

**Retcon by invalidation:**

> “Those removal marks were never actually there.”

The fact disappears.

Use this test:

> Can a player return to the old evidence and truthfully say, “I understand this differently now”?

If yes, recontextualization is probably working.

If the player must say, “The world lied to me,” the authoring likely failed.

## 6.6 Avoid fixed quest chains

Environmental evidence should not require:

- Ruin A before Ruin B;
- one mandatory log before a site becomes meaningful;
- a specific boss or quest state;
- a single final truth object;
- a fixed Act order as gameplay progression.

The approved “acts” and threads describe epistemic structure, not mission order.

An author may design comparison value across records, but each observation should stand on its own and later comparison should add context.

## 6.7 The reverse-order test

For each chain, ask:

> If the player discovers the contradiction/context evidence first, then finds the original clue later, does the original clue still read as a truthful observation?

If no, rewrite the clue.

## 6.8 The missing-clue test

Ask:

> If the player never discovers one optional supporting clue, does the remaining evidence still make sense without a continuity error?

If no, the chain may be over-dependent on a fixed sequence.

## 6.9 The protected-truth test

Ask:

> Does any discovery order make a protected Layer 3 truth sound confirmed?

If yes, the wording is unsafe even if the intended canonical answer remains “unknown.”

---

# 7. LANGUAGE / COPY GUARDRAILS

This section controls narrative certainty, not final UI typography, notification hierarchy, localization implementation, or visual presentation.

## 7.1 Epistemic levels

### SAFE OBSERVATION

Use wording that states what is materially supported.

Examples:

- “The structure predates the current landing.”
- “The structure is engineered.”
- “The builders are not present at this encounter.”
- “The site’s original purpose is unknown.”
- “The sample is associated with the ruin.”
- “These interfaces share a repeated relationship.”
- “This layer differs from the current comparison set.”

### SAFE INTERPRETATION

Use explicit uncertainty.

Examples:

- “This may indicate controlled removal.”
- “One reading is that the site was deliberately decommissioned.”
- “The pattern could represent a larger system.”
- “The correlation suggests a relationship, but not its cause.”
- “The current model may be incomplete.”
- “The evidence is consistent with more than one history.”

### TOO STRONG / CANONIZING

Wording that converts interpretation into unsupported fact.

Examples:

- “The builders evacuated.”
- “The structures were part of a planetary transport network.”
- “This is a religious symbol.”
- “The ecology was engineered.”
- “Two factions fought over this system.”
- “The builders transformed themselves.”
- “This is definitely a second civilization.”

Such wording may become legal only if a later approved source explicitly authorizes the exact statement.

### FORBIDDEN UNTIL SOURCE OF TRUTH CHANGES

Do not present as established truth:

- builders were definitely non-human;
- builders were definitely human;
- builders are descendants/ancestors/relatives of humanity;
- the exact relationship with humanity is known;
- the builders are extinct;
- the builders survived in a specific form;
- the builders left the planet;
- the final Great Dispersal truth is known;
- the final Something Older truth is known;
- the final fate of the prior civilization is known;
- the Phase 1 ruin’s true purpose is known;
- Ancient Alloy Shard has a decoded final function or cultural meaning;
- a canonical ending/endgame answer is known.

## 7.2 Topic guardrail table

| Topic | SAFE OBSERVATION | SAFE INTERPRETATION | TOO STRONG / CANONIZING | FORBIDDEN UNTIL SOURCE OF TRUTH CHANGES |
|---|---|---|---|---|
| Builder identity | “Unknown builders created engineered evidence.” | “A player may compare possible origins.” | “The builders were probably species X” in narrator voice. | “The builders were definitely non-human/human.” |
| Humanity relationship | “The relationship is unresolved.” | “Similarities/differences may motivate hypotheses if approved evidence exists.” | “They may be our ancestors” without a source and clear hypothesis framing. | Any confirmed ancestry, descent, origin, shared identity, or causal relationship. |
| Final fate | “Builders are absent from the Phase 1 encounter.” | “Evacuation, destruction, migration, transformation, or other explanations may be considered.” | “They clearly evacuated.” | “They are extinct / alive elsewhere / transformed / ascended” as fact. |
| Ruin purpose | “The site is intentionally engineered; purpose unknown.” | “Its arrangement may suggest functions without resolving one.” | “This was probably a temple” in authoritative copy. | “This ruin is a temple/weapon/archive/beacon/etc.” as confirmed truth without new source. |
| Great Dispersal | “Some evidence may be compatible with deliberate change.” | “Great Dispersal is a working hypothesis.” | “The Great Dispersal happened because…” | Final nature, cause, chronology, outcome, destination, or success as fact. |
| Something Older | “Some evidence may not fit the current comparison set.” | “The model may be incomplete.” | “This proves an older race.” | Separate civilization/intelligence/creator layer as confirmed without later PO decision. |
| Motifs | “A motif repeats.” | “The repeated motif may indicate relationship.” | “This symbol means warning.” | Translation, religion, faction ownership, or language value without approval. |
| Ancient Alloy Shard | “Associated engineered sample; human field designation.” | “It supports the existence of earlier technological material.” | “It may be a power core” without source. | Decoded function, supernatural property, faction identity, final historical meaning as fact. |

## 7.3 Copy lint questions

Before accepting narrative-facing wording:

- Does it describe observation or interpretation?
- If interpretation, is uncertainty visible?
- Is the certainty stronger than the source?
- Does the sentence imply motive, identity, cause, or final fate?
- Could “was,” “is,” “caused,” “built for,” “meant,” or “proved” be overstating?
- Would replacing “is” with “may be” fix the problem, or is the whole proposition unsupported?
- Does the line still work if Layer 3 remains unresolved forever?

A sentence that only becomes satisfying if a Deep Lore hypothesis is true is not canon-safe guidance.

---

# 8. COMPANY B AUTHORING CHECKLIST

Use this checklist before Company B accepts narrative-adjacent authoring work derived from this guide.

## 8.1 Source and authority

- [ ] What approved source authorizes this?
- [ ] Is the exact source/version recorded?
- [ ] Is this derived only from approved Layer 1 + Layer 2 or accepted #65 facts?
- [ ] If Layer 3 is referenced, is it explicitly PROPOSAL / OPEN QUESTION / DEFERRED rather than requirement?
- [ ] Is the wording’s certainty no stronger than the source?
- [ ] Does any new statement require a new canon decision?

If new canon is required, mark that specific item OPEN QUESTION and continue unaffected authorized work.

## 8.2 Evidence discipline

- [ ] What is directly observed?
- [ ] What is interpretation?
- [ ] What remains open?
- [ ] Is there at least one plausible alternative where ambiguity is intentional?
- [ ] Does a contradiction challenge an interpretation rather than a truthful fact?
- [ ] Does recontextualization preserve the earlier observation?
- [ ] Is meaningful absence backed by an expectation?
- [ ] Is correlation kept separate from cause?
- [ ] Is condition kept separate from motive?

## 8.3 Layer 3 leak check

- [ ] Does this accidentally canonize Layer 3?
- [ ] Does it imply a definite builder species/origin?
- [ ] Does it imply a known humanity relationship?
- [ ] Does it imply final Great Dispersal truth?
- [ ] Does it imply final Something Older truth?
- [ ] Does it imply final prior-civilization fate?
- [ ] Does it assign final ruin purpose?
- [ ] Does it decode Ancient Alloy Shard beyond #65?
- [ ] Does it establish a canonical ending?

Any “yes” requires correction or an explicitly separate higher-authority canon decision.

## 8.4 Nonlinear safety

- [ ] Does the observation remain true in reverse discovery order?
- [ ] Can the clue stand without one mandatory prior clue?
- [ ] Can a player skip one supporting clue without creating contradiction?
- [ ] Can multiple provisional interpretations coexist?
- [ ] Can a later clue change meaning without invalidating the original fact?
- [ ] Does revisit value remain semantic rather than becoming a hidden quest requirement?
- [ ] Does any wording imply a fixed Act/ruin order?

## 8.5 Cross-authority boundary

- [ ] Does this require authority outside Company B?
- [ ] Is a gameplay rule being introduced?
- [ ] Is an objective, reward, unlock, balance value, encounter rule, or progression rule being introduced?
- [ ] Is a UX hierarchy, UI state, or interaction rule being introduced?
- [ ] Is final production visual acceptance being claimed?
- [ ] Is runtime/worldgen/persistence/network behavior being defined?
- [ ] Is playable-build QA acceptance being claimed?
- [ ] Is architecture/schema being defined?

If any answer is “yes,” the narrative/content framing may still be completed, but the external implementation decision must be routed later under a separate authorized task. It is not required for Company B acceptance of this guide.

## 8.6 Implementation independence

- [ ] Will this remain valid if implementation changes?
- [ ] Is the rule expressed semantically rather than as a code/UI/layout dependency?
- [ ] Are exact asset, timing, route, state-machine, schema, or API choices avoided?
- [ ] Is the downstream consumer free to choose a compatible implementation?

## 8.7 Role-focused prompts

### B-NWD-01 — Narrative World Director

- Is the canon classification correct?
- Is the evidence meaningful without exposition?
- Does the interpretation preserve uncertainty?
- Is recontextualization additive rather than corrective fiction?
- Has any proposal become a fact accidentally?

### B-WLD-01 — World / Level Designer

- Can the spatial arrangement communicate the approved observation without inventing narrative facts?
- Does the site remain interpretable locally?
- Does comparison add meaning without requiring a fixed route?
- Is any exact gameplay gate being invented rather than routed?

### B-TD-01 — Technical Designer / Content Systems

- Does the authoring record preserve Evidence versus Interpretation?
- Is source/version traceability present?
- Does any documentation convention pretend to be a runtime schema?
- Are Layer 3 references guarded as non-canon?

### B-PIX-01 — Pixel Artist / Animator

- Does the asset express the requested semantic distinction without inventing symbol meaning, builder identity, or final purpose?
- Is a decorative motif being mistaken for canon?
- Does an asset imply a specific historical event not present in the source?
- Is final visual acceptance being left to the appropriate acceptance authority when production review is required?

### B-AUD-01 — Audio Designer

- Does a recurring cue suggest relationship rather than decode identity or language?
- Does the sound imply human origin, distress, speech, religion, faction, or builder biology without approval?
- Is ambiguity preserved where canon is unresolved?
- Are event timing and gameplay semantics being left to their approved owners?

---

# 9. INDEPENDENT COMPANY B BOUNDARY

## 9.1 Company B can complete independently

Within an activated Company B task and approved sources, Company B may finish and internally review:

- narrative/worldbuilding documentation;
- environmental storytelling grammar;
- canon-safe content framing;
- evidence structures;
- observation/interpretation/recontextualization authoring;
- bounded narrative examples;
- internal cross-role content guidance;
- canon classification and traceability guidance;
- narrative consistency review;
- identification of open questions;
- authoring risk notes;
- semantic briefs that do not dictate another domain’s implementation.

P-NARR-003 itself requires only B-NWD-01 → PM-B review because the artifact stays entirely within this boundary.

## 9.2 External authority is required only if later work turns guidance into another domain’s decision

A later separately activated task must route to the appropriate authority if someone wants to turn this guide into:

- gameplay mechanics, objectives, rewards, progression, balance, encounter rules, or required pacing;
- UX hierarchy, interaction rules, UI state behavior, or presentation-state semantics;
- final production visual acceptance or art-direction standards;
- runtime/world-generation/persistence/network implementation;
- architecture, schema, API, or runtime ID contracts;
- playable-build QA acceptance or a release verdict.

This boundary does not mean Company B cannot produce narrative-adjacent world, technical-content, pixel, or audio work under its own valid tasks. It means this guide does not silently grant authority to decide gameplay, architecture, final visual acceptance, implementation, or QA on behalf of their owners.

## 9.3 No mandatory external review for this artifact

Company A review is not a completion gate for P-NARR-003.

Do not wait for:

- A-GD-01;
- A-ART-01;
- A-GE-01;
- A-QA-01;
- PM-A.

PM-B is the task acceptance authority unless a specific section requires new canon.

## 9.4 New canon exception

If a useful authoring example cannot work without establishing a new fictional fact:

1. stop only that specific proposition;
2. classify it OPEN QUESTION or PROPOSAL;
3. do not write it as a requirement;
4. continue unaffected guidance;
5. route a canon decision separately if the product later needs it.

No such new-canon requirement is needed for the current field guide.

---

# 10. STRICT NON-GOALS

This artifact does not define or change:

- gameplay mechanics;
- balance;
- quest system;
- fixed story progression;
- src/** code;
- world-generation code or rules;
- art assets;
- audio assets;
- UI rules;
- architecture;
- runtime schema or API;
- persistence/network behavior;
- Phase 2 implementation;
- Company A ownership, locks, priorities, or milestones;
- Layer 3 canon;
- new canon beyond approved Layer 1 + Layer 2;
- new resource;
- new biome;
- new interaction;
- new ruin;
- new progression/research unlock;
- exact spatial route;
- exact art style treatment;
- exact audio motif;
- playable-build QA verdict.

---

# 11. SELF-REVIEW FOR P-NARR-003

## Required sections

- PURPOSE AND AUTHORING MODEL: PASS
- APPROVED MYSTERY METHOD: PASS
- ENVIRONMENTAL EVIDENCE FAMILIES: PASS
- PLAYER-READABLE EVIDENCE GRAMMAR: PASS
- FIRST-REGION APPLICATION EXAMPLES: PASS
- NONLINEAR DISCOVERY SAFETY: PASS
- LANGUAGE / COPY GUARDRAILS: PASS
- COMPANY B AUTHORING CHECKLIST: PASS
- INDEPENDENT COMPANY B BOUNDARY: PASS

## Source conformance

- Every first-region example traces to approved Layer 1/Layer 2/#65 context: PASS
- No example requires a new biome/resource/mechanic/interaction/quest: PASS
- Ancient Alloy Shard remains bounded evidence: PASS
- Builder identity remains unresolved: PASS
- Humanity relationship remains unresolved: PASS
- Ruin true purpose remains unresolved: PASS
- Final fate remains unresolved: PASS
- Great Dispersal final truth remains non-canon: PASS
- Something Older final truth remains non-canon: PASS

## Evidence discipline

- Observed fact and interpretation remain separate: PASS
- Alternative interpretation is retained where ambiguity matters: PASS
- Contradiction targets assumptions rather than factual observations: PASS
- Recontextualization preserves earlier evidence: PASS
- False-evidence authoring is explicitly rejected: PASS
- Discovery-order safety is actionable: PASS
- Fixed quest-chain dependency is explicitly rejected: PASS

## Authority boundary

- No gameplay requirement introduced: PASS
- No balance/quest/progression requirement introduced: PASS
- No UI/UX rule introduced: PASS
- No art-production or visual-acceptance rule introduced: PASS
- No runtime/worldgen implementation requirement introduced: PASS
- No architecture/schema introduced: PASS
- No playable-build QA gate introduced: PASS
- No Company A ownership mutation: PASS
- No Company A decision is required to accept this artifact: PASS

## Canon decision

Blocking new-canon requirement: NONE.  
Project Owner action: NONE.

---

# 12. ARTIFACT RECORD

**Exact path:**  
docs/narrative/proz0-environmental-storytelling-field-guide.md

**Purpose:**  
Provide Company B with a practical, reusable environmental-storytelling authoring guide based only on approved ProZ0 Layer 1 Foundation, Layer 2 Mystery Architecture, accepted narrative evidence taxonomy, and Phase 1 canon constraints.

**Responsibilities/content boundary:**  
Narrative/worldbuilding authoring guidance only. It operationalizes evidence, interpretation, contradiction, recontextualization, nonlinear safety, copy guardrails, and Company B content checks without defining implementation.

**Source task:**  
#116 / P-NARR-003.

**Lock:**  
PMB-P-NARR-003-R1.

**Downstream consumers:**  
B-NWD-01, B-WLD-01, B-TD-01, B-PIX-01, and B-AUD-01 under their own separately activated work.

**Review route:**  
B-NWD-01 → PM-B.

**Project Owner action:**  
NONE.
