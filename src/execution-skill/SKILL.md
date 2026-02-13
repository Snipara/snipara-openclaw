# Snipara Execution Skill for OpenClaw

Safe Python execution via RLM-Runtime for coding agents.

## When to Use This Skill

Use the Snipara Execution skill when:

1. **Testing code you wrote** - Verify algorithms, functions work correctly
2. **Data processing** - Transform, analyze, or validate data
3. **Mathematical calculations** - Complex math, statistics, algorithms
4. **Prototyping** - Quickly test ideas before writing to files
5. **Autonomous tasks** - Let an agent iterate on a problem

## The Problem This Solves

```
WITHOUT Execution:
- Agent writes Python code
- Agent says "this should work"
- User runs it, gets error
- Back and forth debugging

WITH Execution:
- Agent writes Python code
- Agent tests it: execute_python(code)
- Agent sees actual output/errors
- Agent fixes before delivering
```

## Core Tools

### execute_python

Execute Python code in a secure sandbox.

```
execute_python("""
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

result = [fibonacci(i) for i in range(10)]
print(f"First 10 Fibonacci numbers: {result}")
""")
→ {
    output: "First 10 Fibonacci numbers: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]",
    result: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34],
    error: null
  }
```

**Allowed imports:**
- `json`, `re`, `math`, `datetime`
- `collections`, `itertools`, `functools`
- `operator`, `string`, `random`
- `hashlib`, `base64`, `urllib.parse`

**Blocked (for safety):**
- `os`, `subprocess`, `socket`
- File I/O, network access

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| code | string | required | Python code to execute |
| sessionId | string | "default" | Session for variable persistence |
| timeout | number | profile-based | Execution timeout |
| profile | string | "default" | quick(5s), default(30s), analysis(120s), extended(300s) |

### Session Persistence

Variables persist within a session:

```
# First call
execute_python("data = [1, 2, 3, 4, 5]", sessionId="my-session")

# Second call - data is still available
execute_python("result = sum(data) / len(data)", sessionId="my-session")
→ { result: 3.0 }
```

### agent_run

Start an autonomous agent for complex tasks.

```
agent_run(
  task="Implement and test a binary search function that handles edge cases"
)
→ { runId: "run_abc123", status: "running" }
```

The agent will:
1. Write initial implementation
2. Test it with execute_python
3. Handle errors and edge cases
4. Iterate until task is complete

### agent_status

Check if the agent is done.

```
agent_status(runId="run_abc123")
→ {
    runId: "run_abc123",
    status: "completed",
    result: {
      code: "def binary_search(arr, target):\n    ...",
      tests_passed: 5,
      iterations: 3
    }
  }
```

**Status values:**
- `running` - Agent is still working
- `completed` - Task finished successfully
- `error` - Agent encountered an error

### agent_cancel

Stop a running agent.

```
agent_cancel(runId="run_abc123")
→ { cancelled: true }
```

## Execution Profiles

| Profile | Timeout | Use Case |
|---------|---------|----------|
| `quick` | 5s | Simple calculations, quick tests |
| `default` | 30s | Most code, moderate complexity |
| `analysis` | 120s | Data processing, complex algorithms |
| `extended` | 300s | Long-running analysis |

```
# Quick check
execute_python("result = 2 + 2", profile="quick")

# Data analysis
execute_python("""
import json
data = json.loads(large_json)
result = analyze(data)
""", profile="analysis")
```

## Best Practices

### 1. Test Before Delivering

```
# Write code
code = """
def process_user(data):
    return {
        "name": data["name"].title(),
        "email": data["email"].lower(),
        "age": int(data["age"])
    }
"""

# Test it
test = execute_python(f"""
{code}

# Test cases
test_data = {{"name": "john DOE", "email": "JOHN@EXAMPLE.COM", "age": "30"}}
result = process_user(test_data)
assert result["name"] == "John Doe"
assert result["email"] == "john@example.com"
assert result["age"] == 30
print("All tests passed!")
""")

# Only deliver if tests pass
if "All tests passed" in test.output:
    # Write to file
```

### 2. Use Sessions for Multi-Step Work

```
# Step 1: Load data
execute_python("""
data = {
    "users": [...],
    "orders": [...]
}
""", sessionId="analysis")

# Step 2: Process (data still available)
execute_python("""
active_users = [u for u in data["users"] if u["active"]]
result = len(active_users)
""", sessionId="analysis")

# Step 3: More analysis
execute_python("""
user_orders = {u["id"]: [] for u in active_users}
for order in data["orders"]:
    if order["user_id"] in user_orders:
        user_orders[order["user_id"]].append(order)
result = user_orders
""", sessionId="analysis")
```

### 3. Handle Errors Gracefully

```
result = execute_python(code)
if result.error:
    # Fix the code
    fixed_code = fix_code(code, result.error)
    result = execute_python(fixed_code)
```

### 4. Use agent_run for Complex Tasks

```
# Instead of manual iteration
run = agent_run(
  task="Create a function that validates email addresses with comprehensive test cases",
  maxIterations=10
)

# Wait for completion
import time
while True:
    status = agent_status(run.runId)
    if status.status != "running":
        break
    time.sleep(5)

# Get result
if status.status == "completed":
    final_code = status.result.code
```

### 5. Validate Algorithm Output

```
# Write sorting algorithm
execute_python("""
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Validate
import random
for _ in range(100):
    test = [random.randint(0, 1000) for _ in range(100)]
    sorted_test = quicksort(test.copy())
    assert sorted_test == sorted(test), "Sort failed!"

result = "Algorithm validated with 100 random tests"
""")
```

## Common Patterns

### Algorithm Development

```
# 1. Write initial implementation
# 2. Test with simple cases
# 3. Test with edge cases
# 4. Test with stress cases
# 5. Optimize if needed

execute_python("""
# Implementation
def solution(input):
    ...

# Simple tests
assert solution([1, 2, 3]) == expected

# Edge cases
assert solution([]) == []
assert solution([1]) == [1]

# Stress test
import random
large = [random.randint(0, 10000) for _ in range(10000)]
result = solution(large)  # Should complete quickly
""")
```

### Data Transformation

```
execute_python("""
import json

# Transform data
def transform(data):
    return [
        {
            "id": item["id"],
            "full_name": f"{item['first']} {item['last']}",
            "email": item["contact"]["email"].lower()
        }
        for item in data
        if item.get("active", False)
    ]

# Test
test_input = [
    {"id": 1, "first": "John", "last": "Doe", "contact": {"email": "JOHN@TEST.COM"}, "active": True},
    {"id": 2, "first": "Jane", "last": "Doe", "contact": {"email": "Jane@Test.com"}, "active": False}
]
result = transform(test_input)
assert len(result) == 1
assert result[0]["full_name"] == "John Doe"
""")
```

### Mathematical Analysis

```
execute_python("""
import math
from collections import Counter

def analyze_distribution(data):
    n = len(data)
    mean = sum(data) / n
    variance = sum((x - mean) ** 2 for x in data) / n
    std_dev = math.sqrt(variance)

    sorted_data = sorted(data)
    median = sorted_data[n // 2] if n % 2 else (sorted_data[n//2 - 1] + sorted_data[n//2]) / 2

    mode = Counter(data).most_common(1)[0][0]

    return {
        "mean": round(mean, 2),
        "median": median,
        "mode": mode,
        "std_dev": round(std_dev, 2),
        "min": min(data),
        "max": max(data)
    }

data = [23, 45, 67, 23, 89, 23, 56, 78, 90, 23]
result = analyze_distribution(data)
""", profile="analysis")
```

## Configuration

Set these environment variables:

```bash
export SNIPARA_API_KEY="rlm_your_key_here"
export SNIPARA_PROJECT_SLUG="your-project"
```

Or configure in OpenClaw:

```json
{
  "skills": {
    "snipara-execution": {
      "apiKey": "rlm_...",
      "projectSlug": "your-project"
    }
  }
}
```

## Safety & Limitations

The sandbox is designed for **computational tasks**:

**Allowed:**
- Math and algorithms
- String processing
- Data transformation
- JSON parsing
- Hashing and encoding

**Blocked:**
- File system access
- Network requests
- System commands
- Process spawning

This keeps your system safe while allowing productive coding work.

## Get Your API Key

1. Visit https://snipara.com/dashboard
2. Create or select a project
3. Go to Settings → API Keys
4. Generate a new key

Free tier includes 100 queries/month. Upgrade for more at https://snipara.com/pricing
