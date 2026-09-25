# P-WLD-002 — ProZ0 Nonlinear Mystery Spatial and Environmental Evidence Grammar

**Task:** P-WLD-002  
**Source Issue:** #83  
**Role:** World / Level Gameplay Designer  
**Member:** B-WLD-01  
**Home Company:** COMPANY_B  
**Coordinating PM:** PM-B / B-PM-01  
**Workstream:** Cross-Phase World Bible Derivation  
**Status:** IMPLEMENTATION_COMPLETE — SPECIALIST HANDOFF READY  
**Artifact:** docs/world-design/proz0-nonlinear-mystery-spatial-grammar.md

---

# 0. DOCUMENT STATUS, AUTHORITY, AND SOURCE SNAPSHOT

This artifact translates the Project Owner-approved Layer 1 Foundation and Layer 2 Mystery Architecture from #82 into reusable World / Level Design grammar for spatial evidence, POI families, route relationships, revisits, cross-site comparison, and environmental inference.

It does not create narrative canon, gameplay rules, art direction, world-generation algorithms, runtime requirements, reward rules, or fixed biome layouts.

## Effective role-pack context

- Role Pack: 2.0.0
- Pack commit: a8aec0b8d377aa9c7e568573e8ba6a3a87e02cb6
- ROLE_ID: WORLD_LEVEL_DESIGNER
- MEMBER_ID: B-WLD-01
- HOME_COMPANY: COMPANY_B

## Live task sources inspected

- #83 / P-WLD-002 — CLAIMED by B-WLD-01 under PM-B
- #83 activation comment: 5791948051
- #82 / P-NARR-002 — DONE
- #82 Project Owner bounded approval comment: 5791922687
- docs/narrative/proz0-world-bible-foundation.md — source blob c4fc48bbca9a99483821facd061ec55817188bce
- docs/narrative/phase-1-ruin-mystery-hook.md — source blob ffc9a6d2524f0457d914483170d831de70a8ff48
- docs/world-design/phase-1-ruin-expedition-spatial-brief.md — source blob b8a43402c14cfa4c40ca032089b309c9f392b56b

## Classification used in this artifact

**APPROVED FOUNDATION**  
Directly bounded by the Project Owner approval of #82 Layer 1 + Layer 2 or by already accepted Phase 1 canon invariants.

**WLD DESIGN PROPOSAL**  
Spatial authoring grammar created inside the WORLD_LEVEL_DESIGNER authority. It may guide later separately activated world/content work, but it does not redefine canon, gameplay, art, schema, or generator architecture.

**CONSTRAINT**  
A boundary that downstream use of this artifact must preserve.

**HYPOTHESIS ONLY / NON-CANON**  
Deep-lore interpretation that may be useful as an authoring question but must never be encoded as a confirmed world fact without a later Project Owner decision.

## Authority boundary

This artifact owns:
- spatial expression of approved mystery threads;
- POI-family intent;
- route and site relationships used to support environmental inference;
- evidence placement grammar;
- revisit and recontextualization patterns;
- landmark/readability needs;
- world-design acceptance scenarios.

This artifact does not own:
- gameplay mechanics, progression, rewards, combat, interaction rules, or balance;
- narrative facts beyond the approved #82 Layer 1 + Layer 2 foundation;
- final visual language, materials, palette, symbols, animation, or UI;
- procedural-generation algorithm, data schema, save/network architecture, or runtime code;
- final biome layout or a fixed ruin sequence;
- Company A task scope or ownership.

---

# 1. APPROVED FOUNDATION TO PRESERVE

## 1.1 Sandbox-first world logic

**APPROVED FOUNDATION**

- Humanity is rebuilding civilization after catastrophe.
- Seed Colony / Civilization Recovery is a core framing.
- The planet was surveyed before catastrophe, but surviving survey knowledge is incomplete and context-poor.
- The relationship between humanity and the prior civilization is unresolved.
- The persistent sandbox remains primary; mystery deepens the world but does not terminate or gate core sandbox play.
- No fixed ruin order is required.
- No mandatory boss or mandatory narrative chain is required.
- Evidence should be truthful even when interpretation is incomplete.
- Later context should recontextualize earlier facts rather than erase them.

## 1.2 Approved mystery architecture

**APPROVED FOUNDATION**

The seven mystery threads are approved as a structural framework:

1. Absence
2. Dismantling
3. Infrastructure Network
4. Ecology
5. Internal Disagreement
6. Departure / Transformation
7. Something Older

The discovery model is:

**EVIDENCE → INTERPRETATION → CONTRADICTION → RECONTEXTUALIZATION**

The player may discover evidence in different orders and build different provisional theories without the game presenting false evidence.

## 1.3 Protected unresolved truths

**CONSTRAINT**

The following remain non-canon unless separately approved later:

- exact prior-civilization identity;
- exact relationship between prior civilization and humanity;
- final cause or meaning of the Great Dispersal;
- final nature of Something Older;
- final prior-civilization fate;
- unresolved catastrophe and Seed Colony historical specifics;
- canonical ending or endgame choice.

World space may support questions around these topics. It must not silently answer them.

---

# 2. SPATIAL AUTHORING PRINCIPLES

## 2.1 A site should prove a fact before it suggests a theory

**WLD DESIGN PROPOSAL**

Every mystery POI should have at least one spatially legible observed fact that remains true regardless of discovery order.

Examples:
- a component interface is present but its component is absent;
- a route terminates at a deliberately disconnected junction;
- later construction physically crosses or bypasses an older alignment;
- vegetation distribution follows an engineered boundary;
- a structure is shut down in an orderly way rather than shattered.

The site may support several interpretations, but the physical fact should not require a lore explanation to become valid.

## 2.2 Local readability first, cross-site meaning second

**WLD DESIGN PROPOSAL**

A player arriving at any single site should be able to recognize:
- what is present;
- what is absent;
- what appears changed;
- what relationship is spatially unusual;
- what can be compared later.

Cross-site comparison should add meaning, not retroactively make the first site nonsensical.

## 2.3 Relationship is more important than spectacle

**WLD DESIGN PROPOSAL**

Mystery sites should be authored as relationships among:
- occupied and empty space;
- original and modified layers;
- connected and disconnected nodes;
- maintained and abandoned routes;
- infrastructure and ecology;
- human settlement and older remains.

A large landmark with no relational evidence may be visually impressive but weak as nonlinear mystery structure.

## 2.4 Preserve ambiguity without making space arbitrary

**WLD DESIGN PROPOSAL**

Ambiguity should come from incomplete context, not from unreadable composition.

A player should be able to say:
- “this was removed,”
- “this route used to connect,”
- “these two places share an alignment,”
- “this later layer contradicts the earlier one,”

before the game asks them to decide why.

## 2.5 Author for multiple approach directions

**WLD DESIGN PROPOSAL**

Because the sandbox does not guarantee a fixed discovery order or approach direction, a site should preserve its key observed fact when approached:
- from the expected main route;
- from a lateral route;
- from a later return route where practical.

A mystery that only reads from one cinematic camera angle is fragile in a top-down/3/4 sandbox.

## 2.6 Do not use spatial gating to simulate narrative certainty

**CONSTRAINT**

Do not require:
- a fixed ruin order;
- a secret key item;
- a mandatory boss;
- an invisible level gate;
- a forced quest state;
- a mandatory exposition trigger

solely to make a theory understandable.

If a specific gameplay gate is ever needed, it must come from separately approved Game Design.

---

# 3. ENVIRONMENTAL EVIDENCE CATEGORY GRAMMAR

These categories are reusable authoring tools. A POI may combine several categories, and no category implies one canon explanation.

## 3.1 Negative space

**APPROVED FOUNDATION**

Absence becomes meaningful only when the world gives the player a reason to expect something.

**WLD DESIGN PROPOSAL — Spatial signature**
- a receiver, socket, plinth, bay, channel, frame, or route exists without its expected counterpart;
- repetition establishes that the empty position is intentional rather than random;
- surrounding circulation still acknowledges the missing element.

**Placement grammar**
- frame the absence against intact reference structure where possible;
- preserve enough surrounding geometry that the player can infer “something belonged here”;
- avoid filling every empty space with decoration that erases the readable gap.

**Cross-site use**
- later sites may show the same interface occupied, repurposed, or differently removed.

**CONSTRAINT**
Negative space must not itself confirm evacuation, theft, ritual, collapse, or transformation.

---

## 3.2 Removed components / dismantling

**APPROVED FOUNDATION**

Controlled removal should remain distinguishable from simple destruction when the mystery asks the player to consider dismantling.

**WLD DESIGN PROPOSAL — Spatial signature**
- repeated cut, separation, anchor, or support logic;
- clear access path compatible with intentional removal;
- remaining structure is stable enough to suggest removal was survivable for the site;
- missing parts follow a pattern rather than random damage.

**Placement grammar**
- include at least one surviving structural relationship that makes the removed part legible;
- avoid presenting every dismantled site as a rubble field;
- allow comparison between broken, removed, and repurposed conditions across different POIs.

**Cross-site use**
- a later site may contain a compatible receiver or repurposed component position without proving where the missing component went.

**CONSTRAINT**
Do not spatially encode “they dismantled this to leave the planet” as fact.

---

## 3.3 Repair and reuse

**APPROVED FOUNDATION**

Layered history and incompatible modifications can communicate continued use, adaptation, or disagreement without named factions.

**WLD DESIGN PROPOSAL — Spatial signature**
- later support geometry bypasses an earlier failed route;
- repaired circulation takes a different line than original circulation;
- a structure keeps its shell but changes its spatial purpose;
- old access remains visible while newer access supersedes it.

**Placement grammar**
- preserve readable overlap between original and later layers;
- do not erase the first layer so completely that the player can no longer compare;
- where possible, let circulation physically reveal the contrast.

**Cross-site use**
- another site may preserve the original solution, creating a meaningful comparison.

**CONSTRAINT**
Reuse does not prove ideology, faction identity, or conflict.

---

## 3.4 Infrastructure topology

**APPROVED FOUNDATION**

Topology may carry meaning across distance: alignment, connection, hierarchy, redundancy, missing links, or distributed function.

**WLD DESIGN PROPOSAL — Spatial signature**
- repeated orientation toward another site or landscape relationship;
- nodes that are locally overbuilt but relationally coherent;
- branching, relay, hub, boundary, or terminal patterns;
- gaps where a connection would be expected.

**Placement grammar**
- each node remains locally readable as a place;
- cross-site alignment should be inferable through map/world relationships without requiring a fixed discovery order;
- topology should support multiple plausible functions until Narrative authority resolves more.

**Cross-site use**
- Site A establishes a repeated interface;
- Site B makes a relationship plausible;
- Site C may challenge the first interpretation.

This three-site pattern is an authoring example, not a mandatory site count.

**CONSTRAINT**
Do not prescribe generator algorithms, exact spacing formulas, or a specific network purpose here.

---

## 3.5 Ecological anomaly

**APPROVED FOUNDATION**

Ecology may preserve history, but correlation does not prove engineering or intent.

**WLD DESIGN PROPOSAL — Spatial signature**
- habitat boundary repeatedly coincides with old infrastructure;
- growth pattern avoids, follows, or occupies old routes;
- reclaimed areas differ from nearby terrain in a way that is spatially comparable;
- a natural pattern continues beyond an assumed engineered boundary, creating contradiction.

**Placement grammar**
- show enough local baseline ecology to make the anomaly legible;
- prefer repeated relationships over one spectacular anomaly;
- allow at least one comparison case that weakens a simple “builders caused it” theory.

**CONSTRAINT**
Do not canonize terraforming, contamination, stewardship, or a biological mechanism.

---

## 3.6 Layered construction

**APPROVED FOUNDATION**

Different historical layers may overlap without immediately revealing whether they represent eras, regions, technical change, disagreement, or a separate origin.

**WLD DESIGN PROPOSAL — Spatial signature**
- later structure keys off an older foundation while violating its original alignment;
- one circulation layer cuts across another;
- incompatible footprints share the same site;
- old foundations persist under later use.

**Placement grammar**
- at least two layers should remain spatially comparable;
- the relationship should be visible without requiring a decoded symbol;
- preserve ambiguity between chronology, reuse, and difference.

**CONSTRAINT**
A mismatched layer is not automatically a second civilization.

---

## 3.7 Deliberate shutdown

**APPROVED FOUNDATION**

Orderly shutdown can complicate pure-collapse interpretations.

**WLD DESIGN PROPOSAL — Spatial signature**
- routes terminate cleanly instead of failing chaotically;
- redundant paths are closed in a consistent sequence;
- spaces are emptied while access remains serviceable;
- safety or maintenance circulation remains clearer than habitation circulation.

**Placement grammar**
- pair order with absence;
- preserve enough intact organization that the player can distinguish shutdown from random destruction;
- vary shutdown completeness across sites so the player cannot infer one universal event too early.

**CONSTRAINT**
Deliberate shutdown does not prove departure, transformation, success, or survival.

---

## 3.8 Incompatible choices

**APPROVED FOUNDATION**

Internal disagreement is expressed more safely through incompatible choices than through premature faction labels.

**WLD DESIGN PROPOSAL — Spatial signature**
- one site preserves a connection another site bypasses;
- one region maintains a system another strips;
- later circulation reverses an earlier priority;
- similar inherited constraints produce materially different spatial solutions.

**Placement grammar**
- ensure the difference cannot be explained solely by one missing object or random damage;
- still preserve alternative explanations such as era, environment, or technical evolution.

**CONSTRAINT**
Do not label spatial difference as war, rebellion, schism, or ideology without Narrative approval.

---

# 4. SEVEN MYSTERY THREADS — SPATIAL / EVIDENCE GRAMMAR

## 4.1 Thread: Absence

**APPROVED FOUNDATION — Core question**  
Why is engineered infrastructure present without its builders?

**WLD DESIGN PROPOSAL — Spatial expression**
- operationally legible space without a present population;
- circulation sized for activity that is no longer occurring;
- repeated empty anchor points or service positions;
- intact routes whose destination no longer contains the expected activity;
- absence that is specific enough to compare, not just generic emptiness.

**Useful evidence categories**
- negative space;
- deliberate shutdown;
- repair/reuse;
- topology with missing nodes.

**Cross-site comparison**
A later site can change “abandoned” into “systematically emptied” by repeating the same absence pattern under different local conditions.

**Revisit pattern**
Return after seeing an occupied-equivalent interface or intact counterpart elsewhere. The first site has not changed, but its emptiness becomes more specific.

**Order-independent rule**
The first site proves only that expected presence is absent. Extinction, evacuation, transformation, and regional abandonment remain interpretations.

**Protected unknown**
Final fate of builders.

---

## 4.2 Thread: Dismantling

**APPROVED FOUNDATION — Core question**  
Why are important parts missing in repeated, patterned ways?

**WLD DESIGN PROPOSAL — Spatial expression**
- repeated component-removal footprints;
- safe access geometry consistent with deconstruction;
- remaining supports arranged as though removal was planned;
- selective absence rather than total destruction.

**Useful evidence categories**
- removed components;
- negative space;
- repair/reuse;
- topology with missing links.

**Cross-site comparison**
Compare:
- destroyed example;
- controlled-removal example;
- repurposed example.

The point is to strengthen the fact of different processes, not declare why the process occurred.

**Revisit pattern**
After a player sees the same component class surviving elsewhere, earlier empty interfaces become more legible as deliberate removal.

**Order-independent rule**
A player may discover the “missing receiver” before the “surviving component” or vice versa. Either order preserves the same observed facts.

**Protected unknown**
Who removed components, where they went, and why.

---

## 4.3 Thread: Infrastructure Network

**APPROVED FOUNDATION — Core question**  
Were individual sites independent, or parts of a larger distributed system?

**WLD DESIGN PROPOSAL — Spatial expression**
- repeated axis or connection logic across distant POIs;
- hub/relay/terminal-like relationships without assigning a final function;
- structures that are locally puzzling but relationally coherent;
- deliberate redundancy or missing branches.

**Useful evidence categories**
- topology;
- layered construction;
- deliberate shutdown;
- ecological correlation.

**Cross-site comparison**
Let at least two materially different site families share one spatial relationship, so the player can infer system membership without assuming identical function.

**Revisit pattern**
A site first read as a self-contained facility becomes more legible as a node after another site reveals compatible connection logic.

**Order-independent rule**
Each node is locally meaningful enough to explore. The network interpretation emerges from comparison, not from a required first node.

**Protected unknown**
Exact network purpose, scale, activity state, and cultural meaning.

---

## 4.4 Thread: Ecology

**APPROVED FOUNDATION — Core question**  
Which ecological patterns are natural, historical, influenced, or merely correlated?

**WLD DESIGN PROPOSAL — Spatial expression**
- repeated ecological boundaries aligned with old infrastructure;
- reclaimed spaces whose ecological pattern follows obsolete circulation;
- anomalies that continue where infrastructure does not;
- infrastructure that appears to respond to an ecological condition rather than necessarily cause it.

**Useful evidence categories**
- ecological anomaly;
- topology;
- layered construction;
- repair/reuse.

**Cross-site comparison**
Pair a strong correlation site with a counterexample where similar ecology appears without known infrastructure, or infrastructure exists without the same ecology.

**Revisit pattern**
Later knowledge of the broader ecological baseline makes the earlier anomaly either more significant or less causal than first assumed.

**Order-independent rule**
Spatial evidence should distinguish “correlated here” from “caused by the builders.”

**Protected unknown**
Terraforming, ecological engineering, contamination, stewardship, or other mechanism.

---

## 4.5 Thread: Internal Disagreement

**APPROVED FOUNDATION — Core question**  
Did all sites preserve one intention, or do they show materially different choices?

**WLD DESIGN PROPOSAL — Spatial expression**
- one site maintains an inherited route while another bypasses it;
- similar structural problems produce incompatible later solutions;
- preserved and removed systems coexist across different POIs;
- regional patterns differ without a single obvious environmental cause.

**Useful evidence categories**
- incompatible choices;
- repair/reuse;
- dismantling;
- topology deviations;
- layered construction.

**Cross-site comparison**
The player should need at least a comparison relationship before “disagreement” becomes plausible. A single odd modification is insufficient.

**Revisit pattern**
An earlier “bad repair” may read as a deliberate alternative after the player sees the same modification logic repeated elsewhere.

**Order-independent rule**
Physical differences remain facts. “Disagreement” remains a theory until comparison supports it.

**Protected unknown**
Named factions, ideology, political structure, conflict, or war.

---

## 4.6 Thread: Departure / Transformation

**APPROVED FOUNDATION — Core question**  
Did the civilization disappear, leave, disperse, or change what presence meant?

**WLD DESIGN PROPOSAL — Spatial expression**
- staged shutdown relationships;
- dismantling that preserves route coherence;
- local sites emptied while wider infrastructure relationships remain intelligible;
- redistribution-like patterns without a visible final destination;
- absence of chaotic destruction where abrupt catastrophe would normally be expected.

**Useful evidence categories**
- deliberate shutdown;
- dismantling;
- topology;
- absence;
- incompatible choices.

**Cross-site comparison**
Combine orderly and disorderly examples so the player cannot collapse all absence into one event.

**Revisit pattern**
A site first interpreted as failed abandonment becomes evidence for planned transition only after distant shutdown patterns are compared.

**Order-independent rule**
Transformation-compatible evidence may appear early, but no site should state the final Great Dispersal explanation as fact.

**HYPOTHESIS ONLY / NON-CANON**
“Great Dispersal” is only a working interpretive label. Its final nature, cause, chronology, and success remain unresolved.

**Protected unknown**
Final fate, destination, survival state, and nature of any transformation.

---

## 4.7 Thread: Something Older

**APPROVED FOUNDATION — Core question**  
Does all deep-history evidence belong to the civilization humanity is currently studying?

**WLD DESIGN PROPOSAL — Spatial expression**
- one layer conflicts with the current comparison set;
- old infrastructure keys into foundations with incompatible geometry;
- ecological or geological relationships predate visible later construction;
- a reused route follows an alignment that does not match the later site's logic.

**Useful evidence categories**
- layered construction;
- ecological anomaly;
- topology mismatch;
- reuse;
- negative space.

**Cross-site comparison**
The first mismatch should be deniable. Repetition across unrelated contexts makes “our current model is incomplete” stronger without declaring what the missing category is.

**Revisit pattern**
After learning the normal variation range of known sites, a previously odd layer becomes harder to explain as ordinary variation.

**Order-independent rule**
An anomaly is allowed to exist before the player has language for it. It must not require a secret codex entry to become real.

**HYPOTHESIS ONLY / NON-CANON**
This thread does not confirm:
- a second civilization;
- a precursor species;
- supernatural agency;
- an inherited technology;
- a planetary intelligence;
- any final “older” truth.

**Protected unknown**
What the mismatch actually represents.

---

# 5. POI-FAMILY INTENT

POI families are reusable spatial roles, not fixed ruin templates. One POI may express more than one thread. No family establishes a required sequence.

## 5.1 Empty Operational Site

**WLD DESIGN PROPOSAL**

Primary use:
- Absence;
- Departure / Transformation.

Spatial intent:
- readable circulation and service logic remain;
- occupancy is conspicuously missing;
- site condition supports comparison between abandonment and deliberate shutdown.

Must avoid:
- living-builder encounter requirement;
- exposition that names final fate.

---

## 5.2 Dismantled Node

**WLD DESIGN PROPOSAL**

Primary use:
- Dismantling;
- Infrastructure Network.

Spatial intent:
- missing components are structurally legible;
- remaining geometry reveals where removed elements connected;
- route access suggests removal was possible without destroying the entire site.

Must avoid:
- making removal look identical to rubble;
- implying confirmed evacuation or resource crisis.

---

## 5.3 Distributed Junction

**WLD DESIGN PROPOSAL**

Primary use:
- Infrastructure Network;
- Ecology;
- Departure / Transformation.

Spatial intent:
- locally meaningful but incomplete function;
- strong relational orientation toward other sites or terrain features;
- repeated connections matter more than one central spectacle.

Must avoid:
- declaring exact system purpose;
- requiring a fixed discovery order.

---

## 5.4 Reused / Layered Site

**WLD DESIGN PROPOSAL**

Primary use:
- Internal Disagreement;
- Dismantling;
- Something Older.

Spatial intent:
- multiple historical layers remain spatially comparable;
- later use preserves enough earlier structure to show changed priorities;
- different approach routes may emphasize different layers.

Must avoid:
- turning every layer into a named faction or era without approved canon.

---

## 5.5 Ecology-Interface Site

**WLD DESIGN PROPOSAL**

Primary use:
- Ecology;
- Infrastructure Network;
- Something Older.

Spatial intent:
- engineered and ecological boundaries are close enough to compare;
- at least one relationship remains ambiguous in causality;
- the site can be understood as correlation before interpretation.

Must avoid:
- asserting terraforming or contamination through layout alone.

---

## 5.6 Controlled Shutdown Site

**WLD DESIGN PROPOSAL**

Primary use:
- Absence;
- Departure / Transformation;
- Dismantling.

Spatial intent:
- order persists despite vacancy;
- closures, disconnections, and emptying appear selective;
- intact circulation makes the absence more conspicuous.

Must avoid:
- proving success/failure of any departure theory.

---

## 5.7 Mismatched Deep-Layer Site

**WLD DESIGN PROPOSAL**

Primary use:
- Something Older;
- Internal Disagreement;
- Infrastructure Network.

Spatial intent:
- one layer resists the current comparison model;
- later construction visibly inherits, ignores, or crosses it;
- mismatch is legible but not self-explanatory.

Must avoid:
- “second civilization” as an automatic conclusion;
- supernatural presentation requirements.

---

# 6. CROSS-SITE COMPARISON GRAMMAR

## 6.1 Fact → Relation → Theory

**WLD DESIGN PROPOSAL**

Use a three-level authoring discipline:

1. **Fact at one site** — something observable is present or absent.
2. **Relation across sites** — repetition, inversion, mismatch, or continuity becomes visible.
3. **Theory** — the player may prefer an interpretation, but the world has not lied if later evidence changes that preference.

No runtime journal mechanic is required by this model.

## 6.2 Comparison operators

Useful spatial comparison operators:

### Repetition
Same relationship appears in different contexts.

Purpose:
Increase confidence that a pattern is intentional.

### Inversion
One site preserves what another removes.

Purpose:
Support Internal Disagreement or chronology uncertainty.

### Missing counterpart
A repeated relationship has one absent node or component.

Purpose:
Support Dismantling, Absence, or network incompleteness.

### Continuity
A route/alignment persists across multiple site families.

Purpose:
Support infrastructure-scale inference.

### Discontinuity
A later layer breaks or bypasses an older relationship.

Purpose:
Support repair, change, or disagreement.

### Counterexample
A similar site lacks the expected pattern.

Purpose:
Prevent premature universal conclusions.

### Layer mismatch
One site's deeper geometry does not fit the current comparison set.

Purpose:
Support Something Older as an open question.

## 6.3 Do not make every clue confirm the same theory

**WLD DESIGN PROPOSAL**

For each important interpretation, include at least one spatial relationship capable of weakening an overconfident reading.

Example:
- several sites support deliberate shutdown;
- another site preserves disorder inconsistent with one universal clean departure.

This preserves mystery without fabricating contradictory facts.

---

# 7. ORDER-INDEPENDENT DISCOVERY GRAMMAR

## 7.1 Every POI carries a self-contained observation packet

**WLD DESIGN PROPOSAL**

A POI should communicate, through space:
- one primary observed fact;
- one secondary relationship or anomaly;
- at least two plausible interpretations where the mystery requires ambiguity;
- one unresolved comparison hook.

This is an authoring model, not a required UI or data schema.

## 7.2 No prerequisite clue for basic truthfulness

**CONSTRAINT**

A site's physical evidence must not become false or nonsensical because the player missed another site.

If a site only works after mandatory prior exposition, it violates the approved order-independent architecture unless Game Design/Narrative later explicitly authorizes that dependency.

## 7.3 Discovery-order test

**WLD DESIGN PROPOSAL**

For each POI family, review at least these conceptual orders:

- discovered early with little context;
- discovered after a related site;
- discovered after a contradicting/counterexample site;
- revisited after the player has a stronger comparison model.

The observed fact should remain stable in every order.

## 7.4 Avoid “late site explains all”

**CONSTRAINT**

Do not author one master POI whose presence makes every earlier mystery irrelevant or whose exposition overrides the evidence network.

A late site may strongly recontextualize, but it should fit facts the player could already observe.

## 7.5 Preserve multiple provisional theories

**WLD DESIGN PROPOSAL**

The spatial corpus is healthier when two reasonable players can reach different provisional explanations from different discovery orders while agreeing on the underlying observed facts.

This is not a requirement to keep every truth permanently unknowable. It is a rule against premature certainty.

---

# 8. REVISIT AND RECONTEXTUALIZATION PATTERNS

Revisit value should come from changed context, not from pretending the earlier site changed history.

## 8.1 Counterpart recognition

**WLD DESIGN PROPOSAL**

First visit:
Player sees an empty interface.

Later context:
Player sees an occupied or differently reused counterpart elsewhere.

Revisit effect:
The original absence becomes more specific.

Fact preserved:
The interface was always empty.

---

## 8.2 Network recognition

**WLD DESIGN PROPOSAL**

First visit:
A structure seems isolated.

Later context:
A second site reveals matching alignment/connection logic.

Revisit effect:
The first site becomes a likely node in a larger topology.

Fact preserved:
Its local geometry has not changed.

---

## 8.3 Historical-layer recognition

**WLD DESIGN PROPOSAL**

First visit:
A mismatch reads as damage or awkward construction.

Later context:
The player learns the normal spatial grammar of later sites.

Revisit effect:
The mismatch becomes stronger evidence of reuse, chronology, or an unresolved older layer.

Fact preserved:
The physical mismatch was always present.

---

## 8.4 Causality reversal

**WLD DESIGN PROPOSAL**

First visit:
Ecology appears to be caused by infrastructure.

Later context:
Similar ecology appears where the infrastructure is absent or differently arranged.

Revisit effect:
Causality becomes uncertain.

Fact preserved:
The original correlation still exists.

---

## 8.5 Human mirror

**APPROVED FOUNDATION / WLD DESIGN PROPOSAL**

As human settlement grows, an old site may gain thematic resonance because the player now understands infrastructure, maintenance, abandonment, or reuse through their own civilization-building experience.

This is a thematic comparison only.

**CONSTRAINT**
This artifact does not require:
- a new settlement mechanic;
- a narrative score;
- dynamic ruin transformation;
- specific human-building layouts.

---

# 9. ROUTE AND SPATIAL RELATIONSHIP GRAMMAR

## 9.1 Routes can carry evidence

**WLD DESIGN PROPOSAL**

A route may communicate history through:
- continuity toward a missing node;
- repair detours around failed original paths;
- later routes crossing obsolete alignments;
- selective maintenance;
- ecological succession along disused corridors.

The route itself can therefore be evidence, not just travel space.

## 9.2 Avoid one optimal mystery corridor

**WLD DESIGN PROPOSAL**

Where a task later authors actual sites, preserve multiple legitimate approach or continuation directions when the approved gameplay allows it.

A mystery corpus becomes too linear if every meaningful site is chained into one corridor even when the narrative claims order independence.

## 9.3 Spatial continuation

**WLD DESIGN PROPOSAL**

Important sites should not always read as terminal chambers.

Where appropriate, preserve:
- a continuation route;
- a visible unresolved connection;
- an outward-facing edge;
- or a relationship to unexplored surrounding space.

This supports the approved principle that a discovery should enlarge the world rather than make it feel solved.

## 9.4 Recovery and return remain ordinary sandbox concerns

**CONSTRAINT**

This cross-phase grammar does not invent:
- survival rates;
- traversal timings;
- hazards;
- combat encounters;
- travel resources;
- reward placement.

When a future activated task places a mystery POI into actual gameplay space, it must use then-approved Game Design rules and world constraints.

---

# 10. LANDMARK AND READABILITY GRAMMAR

Exact art treatment remains A-ART-01 authority.

## 10.1 Landmark should communicate relation before explanation

**WLD DESIGN PROPOSAL**

A mystery landmark should help the player recognize:
- constructed versus natural;
- intact versus removed;
- original versus later layer;
- connected versus disconnected;
- occupied expectation versus meaningful absence.

It should not force:
- exact culture;
- exact function;
- decoded symbol meaning;
- named faction;
- final historical interpretation.

## 10.2 Readability at gameplay scale

**WLD DESIGN PROPOSAL**

Spatial evidence should survive:
- top-down/3/4 overlap;
- approach from more than one direction;
- ordinary background clutter;
- reasonable fog/weather/light constraints once applied by approved systems.

If the evidence only exists in a close-up concept image, it is not yet proven as gameplay-space evidence.

## 10.3 Use silhouette and negative space as requests, not art prescriptions

**WLD DESIGN PROPOSAL**

World Design may specify:
- “the missing module must leave a readable gap,”
- “the older layer must remain spatially separable,”
- “the route break must be legible before the player commits to the dead end.”

World Design must not prescribe the final palette, material, icon, texture, symbol, or VFX solution.

## 10.4 Avoid semantic overloading

**WLD DESIGN PROPOSAL**

Do not ask one landmark to simultaneously prove:
- who built it;
- why;
- when;
- how they disappeared;
- whether they disagreed;
- what Something Older is.

Strong nonlinear mystery comes from accumulation and comparison, not from one all-explaining object.

---

# 11. QA-FACING WORLD-DESIGN ACCEPTANCE SCENARIOS

These are world-design validation scenarios for future separately activated content/integration. They do not create a QA task by themselves.

## WLD-MYS-001 — Single-site observed fact survives low context

**Given:** a player reaches a mystery POI with no related discoveries.  
**When:** the player inspects the site through ordinary traversal/presentation.  
**Then:** at least one intended observed fact is spatially legible without requiring prior exposition.

**Failure:** the site only becomes meaningful after a mandatory earlier clue.

---

## WLD-MYS-002 — Discovery order does not invalidate facts

**Given:** two related POIs A and B.  
**When:** players encounter them in A→B and B→A orders.  
**Then:** both orders preserve the same physical facts while allowing different provisional interpretations.

**Failure:** one order causes a site to state or imply something factually incompatible with the other order.

---

## WLD-MYS-003 — Recontextualization changes interpretation, not history

**Given:** a player has already visited Site A.  
**When:** later evidence at Site B changes the strongest interpretation of A.  
**Then:** revisiting A reveals that the original observed evidence still supports the new context without requiring a retcon.

**Failure:** the design relies on pretending a previously visible fact never existed.

---

## WLD-MYS-004 — Negative space is specific

**Given:** a site uses absence as evidence.  
**Then:** surrounding geometry establishes what type of thing is missing strongly enough that the absence is distinguishable from generic empty space.

**Failure:** “empty room” is the only evidence.

---

## WLD-MYS-005 — Dismantling is distinguishable from destruction

**Given:** a site is intended to support the Dismantling thread.  
**Then:** spatial evidence supports controlled removal as a plausible interpretation distinct from random collapse.

**Failure:** only rubble exists, with no readable removal relationship.

---

## WLD-MYS-006 — Network inference comes from relationships

**Given:** multiple sites participate in an infrastructure-thread comparison.  
**Then:** at least one repeated alignment, interface, direction, hierarchy, redundancy, or missing-link relationship can be compared across sites.

**Failure:** “network” exists only in exposition with no spatial relationship.

---

## WLD-MYS-007 — Ecology preserves correlation/causation ambiguity

**Given:** ecology and old infrastructure correlate at one site.  
**Then:** the larger evidence set does not force “builders caused this” unless separately approved canon supports that conclusion.

**Failure:** layout makes a non-approved causal theory the only possible reading.

---

## WLD-MYS-008 — Internal difference does not become an invented faction

**Given:** two sites use materially different later modifications.  
**Then:** the player can recognize the difference without the space declaring a named faction, war, or ideology.

**Failure:** spatial treatment silently canonizes political lore not approved by Narrative/PO.

---

## WLD-MYS-009 — Departure / Transformation remains hypothesis

**Given:** sites show orderly shutdown, dismantling, or redistribution-compatible patterns.  
**Then:** the corpus can challenge simple-collapse theory without confirming the final Great Dispersal truth.

**Failure:** a site makes the final departure/transformation explanation a world fact.

---

## WLD-MYS-010 — Something Older remains unresolved

**Given:** a site includes a mismatched deep layer.  
**Then:** the mismatch is observable and comparable, but the site does not confirm a second civilization, precursor species, supernatural cause, or other Deep Lore truth.

**Failure:** visual/spatial composition requires one non-approved Deep Lore answer to make sense.

---

## WLD-MYS-011 — POI family remains usable from multiple approaches

**Given:** a site can be approached from materially different directions under the approved sandbox traversal.  
**Then:** its primary observed fact remains readable or discoverable without relying on one cinematic entrance.

**Failure:** the mystery breaks when approached from the back or side.

---

## WLD-MYS-012 — Landmark communicates relation without over-decoding

**Given:** a mystery landmark is visible at gameplay scale.  
**Then:** it helps the player recognize a useful spatial relationship while leaving unresolved identity/function/fate unresolved where required.

**Failure:** landmark presentation makes a speculative interpretation look canonically decoded.

---

## WLD-MYS-013 — Counterexample prevents premature universal theory

**Given:** several sites support one provisional interpretation.  
**When:** the player reaches a relevant counterexample.  
**Then:** the counterexample remains truthful and weakens overconfidence without invalidating earlier observations.

**Failure:** the “contradiction” is only a retcon or arbitrary exception.

---

## WLD-MYS-014 — Sandbox continuation remains visible

**Given:** the player completes a major mystery POI.  
**Then:** spatial composition still supports return, continuation, comparison, or broader world context rather than presenting the site as a campaign-ending terminal.

**Failure:** the world-design language implies the sandbox should stop because this site was found.

---

# 12. AUTHORING CHECKLIST FOR FUTURE SEPARATELY ACTIVATED WLD TASKS

Before calling a mystery-space design ready, record:

1. Source Issue and activated lock.
2. Approved canon/gameplay sources and exact versions.
3. Primary observed fact per POI.
4. Mystery thread(s) supported.
5. Evidence category used.
6. At least one plausible alternative interpretation where ambiguity is required.
7. Cross-site comparison relationship.
8. Revisit/recontextualization case.
9. Multiple discovery-order check.
10. At least one materially different approach-direction check where relevant.
11. Layer 3 / Deep Lore leakage check.
12. Art/readability request separated from final art direction.
13. Gameplay request separated from WLD spatial intent.
14. Generator/schema request routed to WNP/TL/TD rather than prescribed here.
15. Downstream consumer and QA-facing acceptance scenario.

---

# 13. NON-GOALS

**CONSTRAINT**

This artifact does not:
- create gameplay mechanics;
- set reward values;
- set progression;
- add quests;
- add mandatory objectives;
- set combat encounters;
- define AI behavior;
- define survival rates;
- define world-generation algorithms;
- define generator constraints as code/schema;
- define a final biome layout;
- define exact coordinates or site counts;
- require a fixed ruin order;
- create a mandatory boss;
- define final prior-civilization identity;
- define final humanity/prior-civilization relationship;
- define final Great Dispersal truth;
- define final Something Older truth;
- define final prior-civilization fate;
- define a canonical ending;
- define final art direction;
- define palette, material, symbols, language, UI, VFX, or audio;
- modify Company A ownership or implementation scope;
- activate downstream work.

---

# 14. ACCEPTANCE CRITERIA SELF-CHECK

- Artifact exists at expected path after persistence: **PASS**
- All seven approved mystery threads have spatial/evidence grammar: **PASS**
- Negative space, removed components, repair/reuse, topology, ecology, layered construction, shutdown, and incompatible-choice categories are distinguished: **PASS**
- Multiple discovery orders are supported without contradiction: **PASS**
- Truthful-observation / incomplete-context principle is preserved: **PASS**
- Revisit/recontextualization scenarios are defined: **PASS**
- POI-family intent is reusable without fixed ruin order: **PASS**
- Cross-site comparison rules are defined: **PASS**
- Landmark/readability needs are defined without taking Art authority: **PASS**
- No gameplay rule is introduced: **PASS**
- No reward/balance rule is introduced: **PASS**
- No world-generation algorithm is introduced: **PASS**
- No runtime/src change is introduced: **PASS**
- No final biome layout is introduced: **PASS**
- Layer 3 Deep Lore remains explicitly HYPOTHESIS ONLY / NON-CANON: **PASS**
- QA-facing world-design acceptance scenarios included: **PASS**
- Company A ownership/scope unchanged: **PASS**
- Blocking open question for specialist completion: **NONE**
- Project Owner decision required for this specialist artifact: **NONE**

---

# 15. ARTIFACT RECORD AND HANDOFF

**Exact path:**  
docs/world-design/proz0-nonlinear-mystery-spatial-grammar.md

**Purpose:**  
Translate the approved #82 Layer 1 + Layer 2 World Bible foundation into reusable spatial/world-design grammar for nonlinear environmental mystery.

**Responsibilities/content boundary:**  
World / Level Design documentation only: evidence-space grammar, POI family intent, route relationships, order-independent discovery, cross-site comparison, revisit/recontextualization, readability requirements, and QA-facing spatial scenarios.

**Dependencies:**  
- #82 PO-approved Layer 1 Foundation + Layer 2 Mystery Architecture
- #65 accepted Phase 1 canon invariants where applicable
- ProZ0 Role Pack 2.0.0 at a8aec0b8d377aa9c7e568573e8ba6a3a87e02cb6

**Downstream consumers:**  
Future separately activated world/content planning, Narrative consistency review, Art readability work, Technical Content authoring, and QA/integration planning.

**Integration boundary:**  
No runtime, generator, schema, gameplay, art, or Company A change is authorized by this artifact.

**Lifecycle handoff:**  
B-WLD-01 → PM-B / B-PM-01

**Project Owner Action:** NONE
