# Farm Copilot requirement addition

The owner's 25 September capability specification extends the later Copilot milestone; its example messages are examples, not a command dictionary.

Support model-driven conversation and authorized business retrieval across farm profile, catalogue, dated stock/templates, prices/comparables, reservations, preparation, pickups, reports, marketing drafts, reviews, market participation and forecasting. Natural English, supported Urdu and Roman Urdu requests must not require matching fixed phrases. Multi-step requests and topic changes must work without resurrecting old proposals.

Frontend responsibilities: conversation/thread continuity; separate pending-draft state; clarification; multi-record before/after previews; exact reviewed-action confirmation; discard/revise; expiration/conflict/partial-failure states; source links; dashboard refresh only after confirmed backend success. Read-only questions must not create or edit records. Do not label generated checklists as completed packing or booked order value as revenue.

Antigravity owns model execution, authorized data retrieval/tools, session/role enforcement, ownership, lifecycle/cutoff/stock validation, durable conversation/draft storage, idempotent execution and database persistence. An approved contract must define these before integration. Frontend chat must never expose keys or execute arbitrary model-produced endpoints.

Acceptance requires actual frontend conversations with varied products/farmers/countries/currencies/wording, multi-edits, follow-ups, topic switches, cancellation, ambiguity and failures. Verify exact reviewed-action execution, refresh persistence, no cross-farmer disclosure and no false success. Existing fixture or unavailable responses are not evidence of these capabilities. No Farm Copilot backend work was performed in Milestone A.
