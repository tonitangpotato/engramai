# Advanced Testing Suite

This directory contains advanced tests that validate NeuromemoryAI's cognitive behaviors and production readiness.

## Test Files

### test_psychology.py
Replicates classic psychology experiments to verify the mathematical models produce cognitively-plausible behavior:

- **Serial Position Effect** - Primacy and recency effects in list recall
- **Spacing Effect** - Spaced repetition > massed repetition
- **Testing Effect** - Retrieval strengthens memories
- **Forgetting Curve** - Exponential decay over time
- **Emotional Enhancement** - Important memories consolidate stronger
- **Interference** - Similar memories don't erase each other

**Run:** `pytest benchmarks/test_psychology.py -v`

### test_long_term.py
Simulates extended agent operation (months to years) to verify:

- **365-Day Simulation** - Full year of daily usage
- **Memory Plateau** - System reaches steady-state, doesn't grow infinitely
- **Long-Term Persistence** - Important early memories survive long-term
- **Performance Stability** - Recall latency stays consistent as DB grows

**Run:** `pytest benchmarks/test_long_term.py -v`

**Note:** Some tests are time-intensive. The full 365-day simulation can take several minutes.

### test_stress.py
Stress tests for production deployment:

- **100k Memories** - Large-scale insertion and recall performance
- **Continuous Writes** - Sustained operation (10/sec for 60s)
- **Burst Writes** - Spike handling (1000 writes as fast as possible)
- **Concurrent Operations** - Multi-threaded read/write safety

**Run:** `pytest benchmarks/test_stress.py -v`

**Note:** The 100k memory test with consolidation is marked as `slow`. Skip with `-m "not slow"`.

## Quick Start

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all fast tests
pytest benchmarks/ -v -m "not slow"

# Run specific test file
pytest benchmarks/test_psychology.py -v

# Run specific test
pytest benchmarks/test_psychology.py::TestSerialPositionEffect::test_primacy_effect -v

# Run with output
pytest benchmarks/test_long_term.py -v -s
```

## Performance Expectations

Based on design goals from `docs/ADVANCED_TESTING_PLAN.md`:

| Metric | Target | Test |
|--------|--------|------|
| 100k memories recall | < 1 second | test_stress.py::test_bulk_insert_and_recall |
| Continuous writes | 0 failures over 1 hour | test_stress.py::test_continuous_writes |
| Burst writes | Handle 1000/second | test_stress.py::test_burst_1000_writes |
| Recall latency stability | < 10ms over time | test_long_term.py::test_recall_latency_stability |
| Important memory retention | 50%+ after 365 days | test_long_term.py::test_old_important_memories_persist |

## Test Philosophy

These tests validate **cognitive correctness**, not just functional correctness:

- Traditional tests check: "Does it work?"
- These tests check: "Does it work like a brain?"

The system should exhibit human-like memory behaviors because the mathematical models are grounded in cognitive science research (ACT-R, Memory Chain Model, Ebbinghaus forgetting curve).

## Continuous Integration

Recommended CI workflow:
```bash
# Fast tests (< 30 seconds)
pytest benchmarks/ -v -m "not slow"

# Nightly: Full suite including slow tests
pytest benchmarks/ -v
```

## References

- Design document: `docs/ADVANCED_TESTING_PLAN.md`
- Psychology experiments: Classic studies from Ebbinghaus, Murdock, Roediger, Cepeda
- Mathematical models: ACT-R, Memory Chain Model, Hebbian learning
