#\!/usr/bin/env python3
"""
Prompt Contracts History DB
Manages contract storage with UUID identification and timestamped change tracking.

Storage: ~/.claude/prompt-contracts/history/
  - <uuid>.json        — individual contract records
  - index.json         — fast lookup index
  - sequences/<uuid>.json — sequence (multi-step feature) records

Usage:
  contracts_db.py save <title> <contract_text> [--project <path>] [--parent <uuid>]
                       [--tags <t1,t2>] [--sequence <seq_id>] [--step <N>]
  contracts_db.py list [--project <path>] [--limit N] [--tag <tag>]
  contracts_db.py show <uuid_prefix>
  contracts_db.py diff <uuid1> <uuid2>
  contracts_db.py search <query>
  contracts_db.py revisions <uuid>

  contracts_db.py seq-create <title> [--project <path>] [--tags <t1,t2>]
  contracts_db.py seq-list [--project <path>]
  contracts_db.py seq-show <seq_id_prefix>
  contracts_db.py seq-add <seq_id> <contract_id> [--step <N>]
  contracts_db.py seq-next <seq_id>
"""

import argparse
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

HISTORY_DIR = Path.home() / ".claude" / "prompt-contracts" / "history"
SEQUENCES_DIR = HISTORY_DIR / "sequences"
INDEX_FILE = HISTORY_DIR / "index.json"
SEQ_INDEX_FILE = SEQUENCES_DIR / "index.json"


def ensure_dirs():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    SEQUENCES_DIR.mkdir(parents=True, exist_ok=True)


# ── Index helpers ─────────────────────────────────────────────────────────────

def load_index() -> dict:
    if not INDEX_FILE.exists():
        return {"contracts": []}
    with open(INDEX_FILE) as f:
        return json.load(f)


def save_index(index: dict):
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


def load_seq_index() -> dict:
    if not SEQ_INDEX_FILE.exists():
        return {"sequences": []}
    with open(SEQ_INDEX_FILE) as f:
        return json.load(f)


def save_seq_index(index: dict):
    with open(SEQ_INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


# ── Contract CRUD ─────────────────────────────────────────────────────────────

def save_contract(title: str, contract: str, project: str = None,
                  parent_uuid: str = None, tags: list = None,
                  sequence_id: str = None, step: int = None) -> str:
    """Save a new contract. Returns the UUID."""
    ensure_dirs()
    contract_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "id": contract_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "project": project or os.getcwd(),
        "parent_id": parent_uuid,
        "sequence_id": sequence_id,
        "step": step,
        "tags": tags or [],
        "contract": contract,
    }

    with open(HISTORY_DIR / f"{contract_id}.json", "w") as f:
        json.dump(record, f, indent=2)

    index = load_index()
    index["contracts"].append({
        "id": contract_id,
        "title": title,
        "created_at": now,
        "project": record["project"],
        "parent_id": parent_uuid,
        "sequence_id": sequence_id,
        "step": step,
        "tags": tags or [],
    })
    save_index(index)

    if sequence_id:
        _seq_add_contract(sequence_id, contract_id, step)

    return contract_id


def resolve_id(prefix: str) -> Optional[str]:
    index = load_index()
    matches = [c["id"] for c in index["contracts"] if c["id"].startswith(prefix)]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print(f"Ambiguous prefix '{prefix}' matches {len(matches)} contracts.")
        for m in matches:
            print(f"  {m}")
        return None
    return None


def load_contract(contract_id: str) -> Optional[dict]:
    f = HISTORY_DIR / f"{contract_id}.json"
    if not f.exists():
        return None
    with open(f) as fh:
        return json.load(fh)


def list_contracts(project: str = None, limit: int = 20, tag: str = None):
    contracts = load_index()["contracts"]
    if project:
        contracts = [c for c in contracts if c.get("project", "").startswith(project)]
    if tag:
        contracts = [c for c in contracts if tag in c.get("tags", [])]
    contracts = sorted(contracts, key=lambda c: c["created_at"], reverse=True)[:limit]

    if not contracts:
        print("No contracts found.")
        return

    print(f"{'UUID':<10}  {'Created':<19}  {'Seq':<6}  {'Step':<4}  Title")
    print("-" * 80)
    for c in contracts:
        short_id = c["id"][:8]
        ts = c["created_at"][:19].replace("T", " ")
        seq = c["sequence_id"][:6] if c.get("sequence_id") else "-"
        step = str(c["step"]) if c.get("step") is not None else "-"
        parent = f" ↩ {c['parent_id'][:8]}" if c.get("parent_id") else ""
        tags = f" [{', '.join(c['tags'])}]" if c.get("tags") else ""
        print(f"{short_id}  {ts}  {seq:<6}  {step:<4}  {c['title']}{parent}{tags}")


def show_contract(uuid_prefix: str):
    contract_id = resolve_id(uuid_prefix) or uuid_prefix
    record = load_contract(contract_id)
    if not record:
        print(f"Contract '{uuid_prefix}' not found.")
        sys.exit(1)

    print(f"ID:        {record['id']}")
    print(f"Title:     {record['title']}")
    print(f"Created:   {record['created_at']}")
    print(f"Project:   {record['project']}")
    if record.get("parent_id"):
        print(f"Revision of: {record['parent_id']}")
    if record.get("sequence_id"):
        seq = load_sequence(record["sequence_id"])
        seq_title = seq["title"] if seq else record["sequence_id"][:8]
        print(f"Sequence:  [{record.get('step', '?')}] {seq_title} ({record['sequence_id'][:8]})")
    if record.get("tags"):
        print(f"Tags:      {', '.join(record['tags'])}")
    print()
    print(record["contract"])


def diff_contracts(uuid1: str, uuid2: str):
    import difflib
    id1 = resolve_id(uuid1) or uuid1
    id2 = resolve_id(uuid2) or uuid2
    r1 = load_contract(id1)
    r2 = load_contract(id2)
    if not r1:
        print(f"Contract '{uuid1}' not found.")
        sys.exit(1)
    if not r2:
        print(f"Contract '{uuid2}' not found.")
        sys.exit(1)

    lines1 = r1["contract"].splitlines(keepends=True)
    lines2 = r2["contract"].splitlines(keepends=True)
    label1 = f"{r1['id'][:8]} ({r1['created_at'][:10]}) {r1['title']}"
    label2 = f"{r2['id'][:8]} ({r2['created_at'][:10]}) {r2['title']}"
    diff = list(difflib.unified_diff(lines1, lines2, fromfile=label1, tofile=label2))
    if diff:
        print("".join(diff))
    else:
        print("No differences between the two contracts.")


def search_contracts(query: str):
    ensure_dirs()
    query_lower = query.lower()
    results = []
    for f in HISTORY_DIR.glob("*.json"):
        if f.name == "index.json":
            continue
        try:
            with open(f) as fh:
                record = json.load(fh)
            if query_lower in record.get("title", "").lower() or query_lower in record.get("contract", "").lower():
                results.append(record)
        except Exception:
            continue

    results = sorted(results, key=lambda r: r["created_at"], reverse=True)
    if not results:
        print(f"No contracts matching '{query}'.")
        return

    print(f"Found {len(results)} contract(s) matching '{query}':\n")
    print(f"{'UUID':<10}  {'Created':<19}  Title")
    print("-" * 70)
    for r in results:
        ts = r["created_at"][:19].replace("T", " ")
        print(f"{r['id'][:8]}  {ts}  {r['title']}")


def list_revisions(uuid_prefix: str):
    contract_id = resolve_id(uuid_prefix) or uuid_prefix
    record = load_contract(contract_id)
    if not record:
        print(f"Contract '{uuid_prefix}' not found.")
        sys.exit(1)

    index = load_index()
    chain = [record]
    current = record
    while current.get("parent_id"):
        parent = load_contract(current["parent_id"])
        if not parent:
            break
        chain.insert(0, parent)
        current = parent

    all_entries = {c["id"]: c for c in [load_contract(e["id"]) for e in index["contracts"]] if c}

    def get_children(pid):
        return [v for v in all_entries.values() if v.get("parent_id") == pid]

    print(f"Revision chain for: {chain[0]['title']}")
    print("-" * 60)

    def print_chain(node, depth=0):
        indent = "  " * depth
        marker = "* " if node["id"] == contract_id else "  "
        ts = node["created_at"][:19].replace("T", " ")
        print(f"{indent}{marker}{node['id'][:8]}  {ts}  {node['title']}")
        for child in sorted(get_children(node["id"]), key=lambda c: c["created_at"]):
            print_chain(child, depth + 1)

    print_chain(chain[0])


# ── Sequence CRUD ─────────────────────────────────────────────────────────────

def resolve_seq_id(prefix: str) -> Optional[str]:
    idx = load_seq_index()
    matches = [s["id"] for s in idx["sequences"] if s["id"].startswith(prefix)]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print(f"Ambiguous prefix '{prefix}' matches {len(matches)} sequences.")
        for m in matches:
            print(f"  {m}")
        return None
    return None


def load_sequence(seq_id: str) -> Optional[dict]:
    f = SEQUENCES_DIR / f"{seq_id}.json"
    if not f.exists():
        return None
    with open(f) as fh:
        return json.load(fh)


def save_sequence_record(seq: dict):
    with open(SEQUENCES_DIR / f"{seq['id']}.json", "w") as f:
        json.dump(seq, f, indent=2)


def seq_create(title: str, project: str = None, tags: list = None) -> str:
    ensure_dirs()
    seq_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    seq = {
        "id": seq_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "project": project or os.getcwd(),
        "tags": tags or [],
        "steps": [],
    }
    save_sequence_record(seq)

    idx = load_seq_index()
    idx["sequences"].append({
        "id": seq_id,
        "title": title,
        "created_at": now,
        "project": seq["project"],
        "tags": tags or [],
        "step_count": 0,
    })
    save_seq_index(idx)
    return seq_id


def _seq_add_contract(seq_id: str, contract_id: str, step: int = None):
    seq = load_sequence(seq_id)
    if not seq:
        return
    record = load_contract(contract_id)
    title = record["title"] if record else contract_id[:8]

    if step is None:
        step = (max((s["step"] for s in seq["steps"]), default=0) + 1)

    seq["steps"] = [s for s in seq["steps"] if s["step"] != step]
    seq["steps"].append({
        "step": step,
        "contract_id": contract_id,
        "title": title,
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    seq["steps"].sort(key=lambda s: s["step"])
    seq["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_sequence_record(seq)

    idx = load_seq_index()
    for entry in idx["sequences"]:
        if entry["id"] == seq_id:
            entry["step_count"] = len(seq["steps"])
            break
    save_seq_index(idx)


def seq_add(seq_id_prefix: str, contract_id_prefix: str, step: int = None):
    seq_id = resolve_seq_id(seq_id_prefix) or seq_id_prefix
    contract_id = resolve_id(contract_id_prefix) or contract_id_prefix
    if not load_sequence(seq_id):
        print(f"Sequence '{seq_id_prefix}' not found.")
        sys.exit(1)
    if not load_contract(contract_id):
        print(f"Contract '{contract_id_prefix}' not found.")
        sys.exit(1)
    _seq_add_contract(seq_id, contract_id, step)
    seq = load_sequence(seq_id)
    entry = next(s for s in seq["steps"] if s["contract_id"] == contract_id)
    print(f"Linked contract {contract_id[:8]} as step {entry['step']} in sequence {seq_id[:8]} ({seq['title']})")


def seq_list(project: str = None):
    sequences = load_seq_index()["sequences"]
    if project:
        sequences = [s for s in sequences if s.get("project", "").startswith(project)]
    sequences = sorted(sequences, key=lambda s: s["created_at"], reverse=True)

    if not sequences:
        print("No sequences found.")
        return

    print(f"{'UUID':<10}  {'Created':<19}  {'Steps':<5}  Title")
    print("-" * 70)
    for s in sequences:
        ts = s["created_at"][:19].replace("T", " ")
        tags = f" [{', '.join(s['tags'])}]" if s.get("tags") else ""
        print(f"{s['id'][:8]}  {ts}  {s.get('step_count', 0):<5}  {s['title']}{tags}")


def seq_show(seq_id_prefix: str):
    seq_id = resolve_seq_id(seq_id_prefix) or seq_id_prefix
    seq = load_sequence(seq_id)
    if not seq:
        print(f"Sequence '{seq_id_prefix}' not found.")
        sys.exit(1)

    print(f"Sequence: {seq['title']}")
    print(f"ID:       {seq['id']}")
    print(f"Created:  {seq['created_at'][:19].replace('T', ' ')}")
    print(f"Project:  {seq['project']}")
    if seq.get("tags"):
        print(f"Tags:     {', '.join(seq['tags'])}")
    print()
    print(f"  {'Step':<4}  {'Contract':<10}  Title")
    print("  " + "-" * 50)
    for s in seq["steps"]:
        print(f"  {s['step']:<4}  {s['contract_id'][:8]:<10}  {s['title']}")
    print()
    print(f"Run '/prompt-contracts show <uuid>' on any contract above to read its full text.")


def seq_next(seq_id_prefix: str):
    seq_id = resolve_seq_id(seq_id_prefix) or seq_id_prefix
    seq = load_sequence(seq_id)
    if not seq:
        print(f"Sequence '{seq_id_prefix}' not found.")
        sys.exit(1)

    if not seq["steps"]:
        print(f"Sequence '{seq['title']}' has no steps yet.")
        print(f"Start with: /prompt-contracts new --sequence {seq_id[:8]}")
        return

    last_step = max(s["step"] for s in seq["steps"])
    last = next(s for s in seq["steps"] if s["step"] == last_step)
    last_contract = load_contract(last["contract_id"])

    print(f"Sequence: {seq['title']} ({len(seq['steps'])} step(s) so far)")
    print(f"Last step ({last_step}): {last['title']}")
    print()
    if last_contract:
        print("Last contract:")
        print(last_contract["contract"])
    print()
    print(f"Next step would be step {last_step + 1}.")
    print(f"Use: /prompt-contracts new (then link with --sequence {seq_id[:8]} --step {last_step + 1})")


# ── DAGStore ──────────────────────────────────────────────────────────────────

class DAGStore:
    def _dag_path(self, seq_id: str) -> Path:
        return HISTORY_DIR / f"{seq_id}_dag.json"

    def _load(self, seq_id: str) -> dict:
        p = self._dag_path(seq_id)
        if not p.exists():
            return {"seq_id": seq_id, "edges": []}
        with open(p) as f:
            return json.load(f)

    def _save(self, data: dict):
        ensure_dirs()
        p = self._dag_path(data["seq_id"])
        with open(p, "w") as f:
            json.dump(data, f, indent=2)

    def add_edge(self, seq_id: str, from_uuid: str, to_uuid: str, label: str = None) -> None:
        if from_uuid == to_uuid:
            raise ValueError(f"Self-loop not allowed: {from_uuid}")
        data = self._load(seq_id)
        for e in data["edges"]:
            if e["from"] == from_uuid and e["to"] == to_uuid:
                return
        data["edges"].append({"from": from_uuid, "to": to_uuid, "label": label})
        self._save(data)

    def get_edges(self, seq_id: str) -> list:
        return self._load(seq_id)["edges"]

    def remove_edge(self, seq_id: str, from_uuid: str, to_uuid: str) -> bool:
        data = self._load(seq_id)
        before = len(data["edges"])
        data["edges"] = [e for e in data["edges"]
                         if not (e["from"] == from_uuid and e["to"] == to_uuid)]
        if len(data["edges"]) < before:
            self._save(data)
            return True
        return False

    def adjacency_list(self, seq_id: str) -> dict:
        edges = self.get_edges(seq_id)
        adj: dict = {}
        for e in edges:
            frm, to = e["from"], e["to"]
            if frm not in adj:
                adj[frm] = []
            if to not in adj:
                adj[to] = []
            if to not in adj[frm]:
                adj[frm].append(to)
        return adj


_dag_store = DAGStore()


# ── TopologyEngine ─────────────────────────────────────────────────────────────

class CyclicDependencyError(Exception):
    pass


class TopologyEngine:
    def compute_levels(self, adjacency_list: dict) -> list:
        adj = {k: list(v) for k, v in adjacency_list.items()}
        all_nodes: set = set(adj.keys())
        for deps in adjacency_list.values():
            all_nodes.update(deps)
        for n in all_nodes:
            if n not in adj:
                adj[n] = []

        in_degree = {n: len(adj[n]) for n in all_nodes}

        from collections import deque
        queue: deque = deque(n for n in all_nodes if in_degree[n] == 0)

        levels: list = []
        processed = 0

        while queue:
            level_nodes = list(queue)
            queue.clear()
            levels.append(sorted(level_nodes))
            processed += len(level_nodes)

            for done in level_nodes:
                for node, deps in adj.items():
                    if done in deps:
                        in_degree[node] -= 1
                        if in_degree[node] == 0 and node not in [n for lvl in levels for n in lvl]:
                            queue.append(node)

        if processed < len(all_nodes):
            cycle = self.detect_cycle(adjacency_list)
            cycle_str = " → ".join(cycle) if cycle else "unknown"
            raise CyclicDependencyError(f"Cycle detected: {cycle_str}")

        return levels

    def detect_cycle(self, adjacency_list: dict) -> Optional[list]:
        adj = {k: list(v) for k, v in adjacency_list.items()}
        all_nodes: set = set(adj.keys())
        for deps in adjacency_list.values():
            all_nodes.update(deps)
        for n in all_nodes:
            if n not in adj:
                adj[n] = []

        visited: set = set()
        rec_stack: set = set()
        path: list = []

        def dfs(node: str) -> Optional[list]:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            for dep in adj.get(node, []):
                if dep not in visited:
                    result = dfs(dep)
                    if result is not None:
                        return result
                elif dep in rec_stack:
                    cycle_start = path.index(dep)
                    return path[cycle_start:] + [dep]
            path.pop()
            rec_stack.discard(node)
            return None

        for node in all_nodes:
            if node not in visited:
                result = dfs(node)
                if result is not None:
                    return result
        return None


# ── SequenceExecutor ──────────────────────────────────────────────────────────

class DispatchResult:
    def __init__(self, node_uuid: str, title: str, success: bool, error: str = None):
        self.node_uuid = node_uuid
        self.title = title
        self.success = success
        self.error = error


class ExecutionResult:
    def __init__(self, success: bool, levels_completed: int, failed_step: str = None):
        self.success = success
        self.levels_completed = levels_completed
        self.failed_step = failed_step


class BaseDispatcher:
    def dispatch_level(self, nodes: list, level_n: int) -> list:
        raise NotImplementedError


class AgentDispatcher(BaseDispatcher):
    def dispatch_level(self, nodes: list, level_n: int) -> list:
        manifest = {
            "level": level_n,
            "parallel_count": len(nodes),
            "nodes": [{"uuid": n["uuid"], "title": n["title"], "prompt": n.get("prompt", "")} for n in nodes],
        }
        print(json.dumps(manifest, indent=2))
        return [DispatchResult(n["uuid"], n["title"], success=True) for n in nodes]


def is_cmux_env() -> bool:
    return os.environ.get("CMUX_BUNDLE_ID") == "com.cmuxterm.app"


import re as _re


class SequenceExecutor:
    def __init__(self, dispatcher: BaseDispatcher = None):
        self.dispatcher = dispatcher if dispatcher is not None else AgentDispatcher()

    def _infer_edges(self, seq_id: str, steps: list) -> None:
        step_by_number: dict = {}
        for s in steps:
            step_by_number[s["step"]] = s["contract_id"]

        pattern = _re.compile(r"Assumes Step (\d+)", _re.IGNORECASE)
        for s in steps:
            contract = load_contract(s["contract_id"])
            if not contract:
                continue
            text = contract.get("contract", "")
            for match in pattern.finditer(text):
                dep_step = int(match.group(1))
                if dep_step in step_by_number:
                    dep_uuid = step_by_number[dep_step]
                    try:
                        _dag_store.add_edge(seq_id, s["contract_id"], dep_uuid)
                    except ValueError:
                        pass

    def _build_full_adj(self, seq_id: str, steps: list) -> dict:
        adj = _dag_store.adjacency_list(seq_id)
        for s in steps:
            if s["contract_id"] not in adj:
                adj[s["contract_id"]] = []
        return adj

    def execute_sequence(self, seq_id: str) -> ExecutionResult:
        seq = load_sequence(seq_id)
        if not seq:
            print(f"Sequence '{seq_id}' not found.")
            return ExecutionResult(success=False, levels_completed=0)

        steps = sorted(seq.get("steps", []), key=lambda s: s["step"])
        if not steps:
            print(f"Sequence '{seq['title']}' has no steps.")
            return ExecutionResult(success=False, levels_completed=0)

        self._infer_edges(seq_id, steps)
        adj = self._build_full_adj(seq_id, steps)

        engine = TopologyEngine()
        cycle = engine.detect_cycle(adj)
        if cycle:
            raise CyclicDependencyError(f"Cycle detected: {' → '.join(cycle)}")

        levels = engine.compute_levels(adj)
        uuid_set = {s["contract_id"] for s in steps}
        levels = [[n for n in level if n in uuid_set] for level in levels]
        levels = [lvl for lvl in levels if lvl]

        meta: dict = {s["contract_id"]: s for s in steps}
        print(f"Running sequence: {seq['title']}")

        levels_completed = 0
        for level_n, level_uuids in enumerate(levels):
            print(f"  → [Level {level_n}] Dispatching {len(level_uuids)} step(s)...")
            nodes = []
            for uid in level_uuids:
                s = meta.get(uid, {})
                contract = load_contract(uid)
                base_prompt = contract.get("contract", "") if contract else ""
                sentinel = f"\nAfter completing your task, print exactly: DAG_NODE_COMPLETE: {uid}"
                nodes.append({"uuid": uid, "title": s.get("title", uid[:8]), "prompt": base_prompt + sentinel})

            results = self.dispatcher.dispatch_level(nodes, level_n)
            failed = [r for r in results if not r.success]
            if failed:
                print(f"  ✗ [Level {level_n}] Failed: {failed[0].title} — halting sequence")
                return ExecutionResult(success=False, levels_completed=levels_completed, failed_step=failed[0].title)

            print(f"  ✓ [Level {level_n}] Complete")
            levels_completed += 1

        return ExecutionResult(success=True, levels_completed=levels_completed)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Prompt Contracts History DB")
    subparsers = parser.add_subparsers(dest="command")

    p_save = subparsers.add_parser("save")
    p_save.add_argument("title")
    p_save.add_argument("contract")
    p_save.add_argument("--project")
    p_save.add_argument("--parent")
    p_save.add_argument("--tags")
    p_save.add_argument("--sequence")
    p_save.add_argument("--step", type=int)

    p_list = subparsers.add_parser("list")
    p_list.add_argument("--project")
    p_list.add_argument("--limit", type=int, default=20)
    p_list.add_argument("--tag")

    p_show = subparsers.add_parser("show")
    p_show.add_argument("uuid")

    p_diff = subparsers.add_parser("diff")
    p_diff.add_argument("uuid1")
    p_diff.add_argument("uuid2")

    p_search = subparsers.add_parser("search")
    p_search.add_argument("query")

    p_rev = subparsers.add_parser("revisions")
    p_rev.add_argument("uuid")

    p_sc = subparsers.add_parser("seq-create")
    p_sc.add_argument("title")
    p_sc.add_argument("--project")
    p_sc.add_argument("--tags")

    p_sl = subparsers.add_parser("seq-list")
    p_sl.add_argument("--project")

    p_ss = subparsers.add_parser("seq-show")
    p_ss.add_argument("seq_id")

    p_sa = subparsers.add_parser("seq-add")
    p_sa.add_argument("seq_id")
    p_sa.add_argument("contract_id")
    p_sa.add_argument("--step", type=int)

    p_sn = subparsers.add_parser("seq-next")
    p_sn.add_argument("seq_id")

    p_se = subparsers.add_parser("seq-execute")
    p_se.add_argument("seq_id")

    args = parser.parse_args()

    if args.command == "save":
        text = sys.stdin.read() if args.contract == "-" else args.contract
        tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
        cid = save_contract(args.title, text, args.project, args.parent, tags, args.sequence, args.step)
        print(f"Saved: {cid}")
    elif args.command == "list":
        list_contracts(args.project, args.limit, args.tag)
    elif args.command == "show":
        show_contract(args.uuid)
    elif args.command == "diff":
        diff_contracts(args.uuid1, args.uuid2)
    elif args.command == "search":
        search_contracts(args.query)
    elif args.command == "revisions":
        list_revisions(args.uuid)
    elif args.command == "seq-create":
        tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
        sid = seq_create(args.title, args.project, tags)
        print(f"Sequence created: {sid}")
    elif args.command == "seq-list":
        seq_list(args.project)
    elif args.command == "seq-show":
        seq_show(args.seq_id)
    elif args.command == "seq-add":
        seq_add(args.seq_id, args.contract_id, args.step)
    elif args.command == "seq-next":
        seq_next(args.seq_id)
    elif args.command == "seq-execute":
        seq_id = resolve_seq_id(args.seq_id) or args.seq_id
        result = SequenceExecutor().execute_sequence(seq_id)
        sys.exit(0 if result.success else 1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
