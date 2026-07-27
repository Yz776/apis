#!/usr/bin/env python3
"""
Convert each snippet from r2-kana.vercel.app into a feature file under
fitur/kana/ that conforms to the kaminoa-api contract.
"""
import json
import os
import re

SRC_DIR = "/tmp/kana-all"
DST_DIR = "/home/z/my-project/kaminoa-elysia/fitur/kana"
os.makedirs(DST_DIR, exist_ok=True)

SKIP_PACKAGES = {
    "socket.io-client",
    "playwright",
    "@nath1234/sse-client",
    "nathcf",
}

SKIP_LANGS = {"python"}

SKIP_IDS = {
    "j1D224W",  # jkt.js — interactive CLI
}

def derive_route(title, description):
    name = title.lower().replace(".js", "").replace(" ", "-")
    name = re.sub(r"[^a-z0-9-]+", "", name).strip("-")
    desc = (description or "").lower()

    if any(k in name for k in ["gpt", "claude", "deepsek", "deepseek", "chatilm", "quillbot", "manusai", "ainvest", "sakana"]):
        tag = "AI"
        param = "prompt"
        param_desc = "Pertanyaan / prompt untuk AI"
    elif any(k in name for k in ["ytmp3", "ytdown", "spotifydl", "igdl", "snaptik", "threadsdl", "aiodl", "apple-music", "yttranscript", "youtube-summary"]):
        tag = "Downloader"
        param = "url"
        param_desc = "URL media yang akan diunduh"
    elif any(k in name for k in ["search", "apkmody", "modcombo", "lk21", "ik21", "movie", "anime", "otakudesu", "manhwa", "komiku", "fotmob", "top-up", "top_up", "tiktoksearch", "spotifysearch", "groupsor", "subdomain", "gacha"]):
        tag = "Search"
        param = "query"
        param_desc = "Kata kunci pencarian"
    elif any(k in name for k in ["bmkg", "cuaca"]):
        tag = "Tools"
        param = "kota"
        param_desc = "Nama kota"
    elif any(k in name for k in ["colorizer", "restoredphoto", "photoihancer", "hdvid", "remove-bg", "remove_bg", "img2prompt", "img2toprompt", "nanobanana"]):
        tag = "Tools"
        param = "url"
        param_desc = "URL gambar/video yang akan diproses"
    elif any(k in name for k in ["shortlink", "shortlink"]):
        tag = "Tools"
        param = "url"
        param_desc = "URL yang akan dipersingkat"
    elif any(k in name for k in ["tts", "ttsbrando"]):
        tag = "Tools"
        param = "text"
        param_desc = "Teks yang akan dijadikan suara"
    elif any(k in name for k in ["uploader", "ufile"]):
        tag = "Tools"
        param = "url"
        param_desc = "URL file yang akan diunggah ulang"
    else:
        tag = "Tools"
        param = "input"
        param_desc = "Parameter input"

    if "gacha" in name:
        return f"/kana/{name}", "country", "Kode negara (mis. US, GB, ID)", tag, "get"
    if "bmkg" in name:
        return f"/kana/{name}", None, None, tag, "get"
    if "fotmob" in name:
        return f"/kana/{name}", "league", "ID liga Fotmob (mis. 47 Premier League)", tag, "get"
    if "manusai" in name or "ainvest" in name:
        return f"/kana/{name}", "prompt", "Pertanyaan / prompt untuk AI", tag, "get"
    if "tempmail" in name:
        return f"/kana/{name}", None, None, tag, "get"

    return f"/kana/{name}", param, param_desc, tag, "get"


DEMO_PATTERNS = [
    re.compile(r'^\s*await\s+(\w+)\s*\([^)]*\)\s*\.then\([^)]*\)(?:\.catch\([^)]*\))?\s*;?\s*$', re.M),
    re.compile(r'^\s*(\w+)\s*\([^)]*\)\s*\.then\([^)]*\)(?:\.catch\([^)]*\))?\s*;?\s*$', re.M),
    re.compile(r'^\s*await\s+(\w+)\s*\([^)]*\)\s*;?\s*$', re.M),
    re.compile(r'^\s*(?:const|let|var)\s+\w+\s*=\s*await\s+(\w+)\s*\([^)]*\)\s*;?\s*$', re.M),
    re.compile(r'^\s*(\w+)\s*\([^)]*\)\s*;?\s*$', re.M),
    re.compile(r'^\s*main\s*\([^)]*\)\s*;?\s*$', re.M),
    re.compile(r'^\s*run_execute\s*\([^)]*\)\s*;?\s*$', re.M),
    re.compile(r'^\s*process\.exit\(\d+\)\s*;?\s*$', re.M),
]


def _strip_comments_for_brace_counting(line):
    """
    Strip /* ... */ and // ... from a line so brace counting doesn't get
    confused by braces inside comments. We do NOT remove the comments from
    the actual output — this is only used for depth tracking.
    """
    # Remove /* ... */ (single-line; multi-line is handled per-line by tracking state)
    out = []
    i = 0
    in_string = None
    while i < len(line):
        c = line[i]
        if in_string:
            if c == "\\" and i + 1 < len(line):
                out.append(line[i:i+2])
                i += 2
                continue
            if c == in_string:
                in_string = None
            out.append(c)
            i += 1
            continue
        if c in ('"', "'", "`"):
            in_string = c
            out.append(c)
            i += 1
            continue
        if c == "/" and i + 1 < len(line):
            if line[i+1] == "/":
                # // comment to end of line
                break
            if line[i+1] == "*":
                # /* ... */ — find the closing */
                end = line.find("*/", i + 2)
                if end == -1:
                    # Comment continues to end of line (multi-line comment)
                    break
                else:
                    i = end + 2
                    continue
        out.append(c)
        i += 1
    return "".join(out)


def strip_demo_invocation(code):
    """
    Char-by-char tokenizer that tracks string and comment state across the
    whole code. We find the position where the first top-level INVOCATION
    statement starts (i.e., a top-level statement that's NOT a function /
    const / let / var / class / import / export definition), and cut there.
    """
    n = len(code)
    i = 0
    depth = 0
    in_string = None  # None, '"', "'", or '`'
    in_line_comment = False
    in_block_comment = False
    paren_depth = 0  # for tracking (...) so we don't confuse function calls

    # Track "statement start" positions: positions in the code where a new
    # top-level statement begins (depth == 0, paren_depth == 0, not in
    # string/comment, and preceded by `;`, `}`, or start-of-file or newline).
    statement_starts = []  # list of (pos, line_text_after_pos)

    # Track the start of the CURRENT top-level statement.
    cur_stmt_start = None
    after_semicolon_or_brace = True  # at start of file, treat as stmt start

    while i < n:
        c = code[i]
        nxt = code[i+1] if i+1 < n else ""

        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue

        # Not in string or comment.
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", "`"):
            in_string = c
            i += 1
            continue

        # If we're at the start of a new top-level statement, record its start.
        # Do this BEFORE processing brace/paren depth changes so that an opening
        # `(` (IIFE) or `{` (block) at top level is correctly attributed to a
        # new statement.
        if after_semicolon_or_brace and depth == 0 and paren_depth == 0 and not c.isspace():
            line_start = code.rfind("\n", 0, i) + 1
            line_end = code.find("\n", i)
            if line_end == -1:
                line_end = n
            line = code[line_start:line_end]
            statement_starts.append((i, line, line_start))
            after_semicolon_or_brace = False

        # Track brace and paren depth.
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and paren_depth == 0:
                # End of a top-level block — next non-whitespace starts a new stmt.
                after_semicolon_or_brace = True
                cur_stmt_start = None
                # The `}` itself is NOT a statement start — skip the check below.
                i += 1
                continue
        elif c == "(":
            paren_depth += 1
        elif c == ")":
            paren_depth -= 1

        if c == ";" and depth == 0 and paren_depth == 0:
            after_semicolon_or_brace = True
            cur_stmt_start = None
            i += 1
            continue

        i += 1

    # Now classify each top-level statement.
    def_kw = re.compile(
        r'^\s*(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|const|let|var|import)\b'
    )
    # Matches `export default {...}` (object literal) or `export {...}` or `export [...]`.
    export_kw = re.compile(r'^\s*export\s+(?:default\s+)?[\{\[]')
    # Also match a bare `export default <expression>;` (e.g., `export default foo;`).
    export_default_kw = re.compile(r'^\s*export\s+default\b')

    cut_pos = None
    for idx, (pos, line, line_start) in enumerate(statement_starts):
        stripped_line = line.strip()
        if not stripped_line or stripped_line.startswith("//") or stripped_line.startswith("/*") or stripped_line.startswith("*"):
            continue
        # Skip "terminator-only" lines like `}`, `};`, `});`, `)`, `;` — these
        # are not real statements, just the tail of the previous one.
        if re.match(r'^[});]+\s*$', stripped_line):
            continue
        is_def = bool(def_kw.match(line) or export_kw.match(line) or export_default_kw.match(line))
        if not is_def:
            cut_pos = line_start
            break
        # Even if it's a definition, if it contains `await` at the top level
        # (outside any nested function body), it's a demo invocation — cut here.
        # We need to look at the FULL statement (which may span multiple lines).
        # Get the statement text by finding the next statement start or end of code.
        next_start = statement_starts[idx + 1][0] if idx + 1 < len(statement_starts) else len(code)
        stmt_text = code[pos:next_start]
        if _has_top_level_await(stmt_text):
            cut_pos = line_start
            break

    if cut_pos is None:
        # No demo invocation found. But the snippet might still have its own
        # `export default` or `export { ... }` that would conflict with the
        # converter's own `export default`. Strip those.
        return _strip_existing_exports(code.rstrip() + "\n")

    out = code[:cut_pos].rstrip()
    return _strip_existing_exports(out + "\n")


def _strip_existing_exports(code):
    """
    Remove any top-level `export ` prefix or `export { ... }` / `export default ...`
    statements from the code, so the converter can add its own `export default`
    without conflicts.

    Strategy: walk char-by-char, tracking depth/string/comment state. Any
    `export` keyword at top level (depth==0, paren_depth==0, not in string/
    comment) is the start of an export statement. We remove:
      - `export default <expr>;` → remove the whole statement
      - `export { ... };` → remove the whole statement
      - `export const/let/var/function/class ...` → keep but strip the `export ` prefix
      - `export { ... } from "..."` → remove
    """
    n = len(code)
    out = []
    i = 0
    depth = 0
    paren_depth = 0
    in_string = None
    in_line_comment = False
    in_block_comment = False
    after_stmt_end = True  # at start, treat as if after a statement end

    while i < n:
        c = code[i]
        nxt = code[i+1] if i+1 < n else ""

        if in_line_comment:
            out.append(c)
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            out.append(c)
            if c == "*" and nxt == "/":
                out.append(nxt)
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_string:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(nxt)
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue

        if c == "/" and nxt == "/":
            in_line_comment = True
            out.append(c)
            out.append(nxt)
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            out.append(c)
            out.append(nxt)
            i += 2
            continue
        if c in ('"', "'", "`"):
            in_string = c
            out.append(c)
            i += 1
            continue

        # Check if this is the start of an `export ...` statement at top level.
        if (after_stmt_end and depth == 0 and paren_depth == 0
                and code[i:i+7] == "export "
                and (i == 0 or code[i-1] in " \t\n;}{")):
            # Look ahead to see what kind of export this is.
            rest = code[i+7:]
            # Skip whitespace
            j = 0
            while j < len(rest) and rest[j] in " \t":
                j += 1
            rest = rest[j:]

            # Case 1: `export default ...` → strip the whole statement
            if rest.startswith("default ") or rest.startswith("default\t") or rest == "default":
                # Find the end of this statement (next `;` at depth 0 or end of file).
                k = i + 7 + j + 7  # past "default "
                stmt_depth = 0
                stmt_paren = 0
                stmt_str = None
                stmt_line_cmt = False
                stmt_block_cmt = False
                while k < n:
                    ch = code[k]
                    nk = code[k+1] if k+1 < n else ""
                    if stmt_line_cmt:
                        if ch == "\n":
                            stmt_line_cmt = False
                        k += 1
                        continue
                    if stmt_block_cmt:
                        if ch == "*" and nk == "/":
                            stmt_block_cmt = False
                            k += 2
                            continue
                        k += 1
                        continue
                    if stmt_str:
                        if ch == "\\" and k+1 < n:
                            k += 2
                            continue
                        if ch == stmt_str:
                            stmt_str = None
                        k += 1
                        continue
                    if ch == "/" and nk == "/":
                        stmt_line_cmt = True
                        k += 2
                        continue
                    if ch == "/" and nk == "*":
                        stmt_block_cmt = True
                        k += 2
                        continue
                    if ch in ('"', "'", "`"):
                        stmt_str = ch
                        k += 1
                        continue
                    if ch == "{":
                        stmt_depth += 1
                    elif ch == "}":
                        stmt_depth -= 1
                    elif ch == "(":
                        stmt_paren += 1
                    elif ch == ")":
                        stmt_paren -= 1
                    if ch == ";" and stmt_depth == 0 and stmt_paren == 0:
                        k += 1
                        break
                    if ch == "\n" and stmt_depth == 0 and stmt_paren == 0:
                        # ASI: end of statement
                        break
                    k += 1
                # Skip from i to k
                i = k
                after_stmt_end = True
                continue

            # Case 2: `export { ... }` (or `export { ... } from "..."`) → strip
            if rest.startswith("{"):
                # Find the matching `}` then optional ` from "..."` then `;` or newline.
                k = i + 7 + j
                stmt_depth = 0
                stmt_str = None
                stmt_line_cmt = False
                stmt_block_cmt = False
                while k < n:
                    ch = code[k]
                    nk = code[k+1] if k+1 < n else ""
                    if stmt_line_cmt:
                        if ch == "\n":
                            stmt_line_cmt = False
                        k += 1
                        continue
                    if stmt_block_cmt:
                        if ch == "*" and nk == "/":
                            stmt_block_cmt = False
                            k += 2
                            continue
                        k += 1
                        continue
                    if stmt_str:
                        if ch == "\\" and k+1 < n:
                            k += 2
                            continue
                        if ch == stmt_str:
                            stmt_str = None
                        k += 1
                        continue
                    if ch == "/" and nk == "/":
                        stmt_line_cmt = True
                        k += 2
                        continue
                    if ch == "/" and nk == "*":
                        stmt_block_cmt = True
                        k += 2
                        continue
                    if ch in ('"', "'", "`"):
                        stmt_str = ch
                        k += 1
                        continue
                    if ch == "{":
                        stmt_depth += 1
                    elif ch == "}":
                        stmt_depth -= 1
                        if stmt_depth == 0:
                            k += 1
                            # Skip optional ` from "..."` and trailing `;` or newline
                            while k < n and code[k] in " \t":
                                k += 1
                            if code[k:k+5] == " from":
                                k += 5
                                while k < n and code[k] in " \t":
                                    k += 1
                                # skip the string literal
                                if k < n and code[k] in ('"', "'", "`"):
                                    stmt_str = code[k]
                                    k += 1
                                    while k < n:
                                        if code[k] == "\\" and k+1 < n:
                                            k += 2
                                            continue
                                        if code[k] == stmt_str:
                                            stmt_str = None
                                            k += 1
                                            break
                                        k += 1
                            # Skip trailing `;` or up to newline
                            while k < n and code[k] in " \t":
                                k += 1
                            if k < n and code[k] == ";":
                                k += 1
                            break
                    elif ch == "(":
                        stmt_depth += 1  # treat like brace for safety
                    elif ch == ")":
                        stmt_depth -= 1
                    k += 1
                i = k
                after_stmt_end = True
                continue

            # Case 3: `export const/let/var/function/class/async function` → strip just `export ` prefix
            if re.match(r'(?:const|let|var|function|class|async\s+function)\b', rest):
                # Skip just the `export ` (7 chars).
                i += 7
                continue

            # Otherwise — leave it alone (treat as definition we don't recognize).
            out.append(c)
            i += 1
            continue

        # Track brace/paren depth for the rest.
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and paren_depth == 0:
                after_stmt_end = True
                out.append(c)
                i += 1
                continue
        elif c == "(":
            paren_depth += 1
        elif c == ")":
            paren_depth -= 1

        if c == ";" and depth == 0 and paren_depth == 0:
            after_stmt_end = True
            out.append(c)
            i += 1
            continue

        if not c.isspace():
            after_stmt_end = False

        out.append(c)
        i += 1

    return "".join(out)


def find_main_function_name(code, original_code):
    """
    Find the name of the main function being invoked in the demo section.
    We iterate LINE BY LINE so regexes never match across newlines.
    """
    candidates = []

    # Single-line patterns — applied to each line individually.
    LINE_PATTERNS = [
        # await foo(...).then(...).catch(...)
        re.compile(r'^\s*await\s+(\w+)\s*\([^)\n]*\)\s*\.then\([^)\n]*\)(?:\.catch\([^)\n]*\))?\s*;?\s*$'),
        # foo(...).then(...).catch(...)  (no await)
        re.compile(r'^\s*(\w+)\s*\([^)\n]*\)\s*\.then\([^)\n]*\)(?:\.catch\([^)\n]*\))?\s*;?\s*$'),
        # await foo(...);
        re.compile(r'^\s*await\s+(\w+)\s*\([^)\n]*\)\s*;?\s*$'),
        # const x = await foo(...);
        re.compile(r'^\s*(?:const|let|var)\s+\w+\s*=\s*await\s+(\w+)\s*\([^)\n]*\)\s*;?\s*$'),
        # foo(...) bare call
        re.compile(r'^\s*(\w+)\s*\([^)\n]*\)\s*;?\s*$'),
        # main(...) call
        re.compile(r'^\s*main\s*\([^)\n]*\)\s*;?\s*$'),
        # run_execute(...) call
        re.compile(r'^\s*run_execute\s*\([^)\n]*\)\s*;?\s*$'),
    ]

    for line in original_code.split("\n"):
        for pat in LINE_PATTERNS:
            m = pat.match(line)
            if m:
                try:
                    name = m.group(1)
                    if name and name not in {"console", "process", "fetch", "require", "JSON", "Array", "Object", "Math", "Date", "Promise"}:
                        candidates.append(name)
                except IndexError:
                    pass

    if candidates:
        # Last candidate is the demo invocation (since it appears at end of file)
        return candidates[-1]

    # Look inside multi-line IIFEs for `await <word>(` patterns
    iife_pat = re.compile(r'\(async\s*\(\)\s*=>\s*\{([\s\S]*?)\}\)\s*\(\)\s*;?', re.M)
    for m in iife_pat.finditer(original_code):
        body = m.group(1)
        for inner in re.finditer(r'await\s+(\w+)\s*\(', body):
            name = inner.group(1)
            if name not in {"console", "process", "fetch", "require", "JSON", "Array", "Object", "Math", "Date", "Promise"}:
                candidates.append(name)
        for inner in re.finditer(r'console\.log\s*\(\s*await\s+(\w+)\s*\(', body):
            candidates.append(inner.group(1))

    if candidates:
        return candidates[-1]

    m = re.search(r'export\s+default\s*\{([^}]+)\}', code)
    if m:
        keys = [k.strip() for k in m.group(1).split(",") if k.strip()]
        if keys:
            return keys[0]
    return None


def has_unsupported_deps(code):
    found = set()
    for dep in SKIP_PACKAGES:
        if re.search(r'from\s+["\']' + re.escape(dep) + r'["\']', code):
            found.add(dep)
        if re.search(r'require\(\s*["\']' + re.escape(dep) + r'["\']\s*\)', code):
            found.add(dep)
    return found


def _has_top_level_await(stmt_text):
    """
    Check if a statement has `await` at the top level of the statement (i.e.,
    NOT inside any nested function body). For `const x = await foo()`, this is
    True. For `const f = async () => { await foo() }` or
    `async function f() { await foo() }`, this is False.

    Strategy: track a STACK of brace-context markers. Each `{` opens a new
    context — either a function body (push True) or a non-function block
    (push False). When we see `await`, we check if ANY entry in the stack is
    True. If yes, we're inside a function body — return False. If no, we're
    at top level — return True.
    """
    n = len(stmt_text)
    i = 0
    in_string = None
    in_line_comment = False
    in_block_comment = False
    # Stack of booleans: True if the corresponding `{` opened a function body.
    brace_stack = []
    # "Next `{` opens a function body" — set when we see `=>` (arrow function)
    # or `function ... (...)` (function declaration/expression).
    next_brace_is_function = False

    def is_ident_char(c):
        return c.isalnum() or c == "_"

    while i < n:
        c = stmt_text[i]
        nxt = stmt_text[i+1] if i+1 < n else ""

        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", "`"):
            in_string = c
            i += 1
            continue

        # Check for `await` keyword at this position
        if (c == "a" and stmt_text[i:i+5] == "await"
                and (i == 0 or not is_ident_char(stmt_text[i-1]))):
            after = stmt_text[i+5:i+6]
            if after == "" or not is_ident_char(after):
                # `await` keyword found. Check if we're inside any function body.
                if not any(brace_stack):
                    # No function body on the stack — top-level await!
                    return True
                # Else: await is inside a function body. Don't return.

        # Detect arrow function `=>` — the next `{` opens a function body.
        if c == "=" and nxt == ">":
            # Look ahead past whitespace to see if `{` follows.
            k = i + 2
            while k < n and stmt_text[k] in " \t\n\r":
                k += 1
            if k < n and stmt_text[k] == "{":
                next_brace_is_function = True
            i += 2
            continue

        # Detect `function` keyword — the next `{` after `()` opens a function body.
        if (c == "f" and stmt_text[i:i+8] == "function"
                and (i == 0 or not is_ident_char(stmt_text[i-1]))):
            after = stmt_text[i+8:i+9]
            if after == "" or not is_ident_char(after):
                next_brace_is_function = True
            i += 8
            continue

        if c == "{":
            brace_stack.append(next_brace_is_function)
            next_brace_is_function = False
        elif c == "}":
            if brace_stack:
                brace_stack.pop()
        # Parens don't affect function-body tracking.

        i += 1

    return False


def has_runtime_side_effects(code):
    """
    Detect snippets that perform I/O at module-load time (top-level await
    fetch, fs.readFileSync, etc.). These would block or fail at import time,
    so we skip them.
    """
    # We re-use the strip_demo_invocation tokenizer to find top-level statements.
    stripped = strip_demo_invocation(code)
    # If after stripping, the code still has any top-level `await`, `fetch(`,
    # `fs.readFileSync(`, or `axios.` call that's NOT inside a function body,
    # we treat it as having side effects.
    #
    # The simplest check: walk char-by-char, track depth/string/comment state,
    # and look for `await`, `fetch(`, `fs.readFileSync(`, `axios.`, `client.`
    # at depth==0 (outside any function/block).
    n = len(stripped)
    i = 0
    depth = 0
    paren_depth = 0
    in_string = None
    in_line_comment = False
    in_block_comment = False

    # We also need to skip function bodies (depth>0 because of `{`).
    # But const x = { ... } also has depth>0. So we need to be smarter.
    # Actually for our purposes: a "top-level side effect" is any top-level
    # expression statement that calls a function. We approximate by checking
    # for the presence of these patterns at top-level (depth==0, paren_depth==0).
    while i < n:
        c = stripped[i]
        nxt = stripped[i+1] if i+1 < n else ""

        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", "`"):
            in_string = c
            i += 1
            continue

        if depth == 0 and paren_depth == 0:
            # Check for side-effect patterns at this position
            tail = stripped[i:i+30]
            # Top-level `await` (other than `export const x = await ...` which is a definition)
            if re.match(r'await\s+\w', tail) and not _is_definition_start(stripped, i):
                return True, "top-level await"
            # Top-level `fetch(` or `axios.` or `fs.readFileSync(`
            if re.match(r'fetch\s*\(', tail):
                return True, "top-level fetch"
            if re.match(r'fs\.\w+\s*\(', tail):
                return True, "top-level fs call"
            if re.match(r'readFileSync\s*\(', tail) or re.match(r'readFile\s*\(', tail):
                return True, "top-level readFileSync"
            if re.match(r'axios\.\w+\s*\(', tail):
                return True, "top-level axios call"

        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == "(":
            paren_depth += 1
        elif c == ")":
            paren_depth -= 1

        i += 1

    return False, None


def _is_definition_start(code, pos):
    """Check if the position `pos` is at the start of a definition statement
    (const/let/var/function/class/export/import). Look back to find the start
    of the current statement."""
    # Find the start of the current top-level statement.
    # Walk back to find the previous `;`, `}`, or start of file (ignoring
    # whitespace and comments).
    i = pos - 1
    while i > 0:
        c = code[i]
        if c in " \t\n\r":
            i -= 1
            continue
        # Skip back over comments
        if i >= 1 and code[i-1:i+1] == "*/":
            # Find the matching `/*`
            j = code.rfind("/*", 0, i-1)
            if j != -1:
                i = j - 1
                continue
        if i >= 1 and code[i] == "\n":
            # Maybe a `//` comment on the previous line
            # Check if the previous non-empty content ends with `//`...
            # (skip for simplicity)
            pass
        break
    # Now `i+1` is the position of the previous terminator (`;` or `}` or start).
    # The statement starts somewhere after that. Walk forward to find the first
    # non-whitespace token.
    j = i + 1
    while j < len(code) and code[j] in " \t\n\r":
        j += 1
    # Now check what keyword this statement starts with.
    stmt = code[j:j+30]
    if re.match(r'(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|import)\b', stmt):
        return True
    if re.match(r'export\s+default\b', stmt):
        return True
    if re.match(r'export\s+[\{\[]', stmt):
        return True
    return False


def slugify(s):
    s = s.lower()
    s = re.sub(r'\.js$', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def main():
    snippets = []
    for fn in sorted(os.listdir(SRC_DIR)):
        with open(os.path.join(SRC_DIR, fn)) as f:
            snippets.append(json.load(f))

    stats = {"total": 0, "skipped_lang": 0, "skipped_deps": 0, "skipped_id": 0,
             "no_main_func": 0, "side_effects": 0, "converted": 0, "errors": []}

    for s in snippets:
        stats["total"] += 1
        sid = s["id"]
        title = s["title"]
        desc = s.get("description", "") or ""
        code = s["code"]
        lang = s.get("lang", "javascript")

        if lang in SKIP_LANGS:
            stats["skipped_lang"] += 1
            continue
        if sid in SKIP_IDS:
            stats["skipped_id"] += 1
            continue

        bad = has_unsupported_deps(code)
        if bad:
            stats["skipped_deps"] += 1
            stats["errors"].append(f"{title}: unsupported deps {bad}")
            continue

        # Check for top-level side effects (HTTP calls, fs reads, etc. at module
        # load time). These would block or fail at import, so skip them.
        has_side_effect, reason = has_runtime_side_effects(code)
        if has_side_effect:
            stats["side_effects"] += 1
            stats["errors"].append(f"{title}: {reason} at module load")
            continue

        stripped = strip_demo_invocation(code)
        main_fn = find_main_function_name(stripped, code)
        if not main_fn:
            stats["no_main_func"] += 1
            stats["errors"].append(f"{title}: cannot determine main function")
            continue

        route_path, param_name, param_desc, tag, verb = derive_route(title, desc)
        slug = slugify(title)

        if param_name is None:
            handler_body = (
                "        try {\n"
                f"            const result = await {main_fn}()\n"
                "            return res.json({ ok: true, result })\n"
                "        } catch (e) {\n"
                "            return res.status(500).json({ ok: false, error: e.message })\n"
                "        }"
            )
            parameters_block = "[]"
        else:
            handler_body = (
                f"        const {{ {param_name} }} = req.query\n"
                f"        if (!{param_name} || !String({param_name}).trim()) {{\n"
                f"            return res.status(400).json({{ ok: false, error: `{param_name} wajib diisi` }})\n"
                f"        }}\n"
                "        try {\n"
                f"            const result = await {main_fn}(String({param_name}).trim())\n"
                "            return res.json({ ok: true, result })\n"
                "        } catch (e) {\n"
                "            return res.status(500).json({ ok: false, error: e.message })\n"
                "        }"
            )
            parameters_block = (
                "[\n"
                "            {\n"
                f'                name: "{param_name}",\n'
                '                in: "query",\n'
                "                required: true,\n"
                f"                description: {json.dumps(param_desc)},\n"
                "                schema: { type: \"string\" },\n"
                "            },\n"
                "        ]"
            )

        feature = (
            f"// Auto-generated from r2-kana.vercel.app snippet \"{title}\" ({sid})\n"
            f"// Source: https://r2-kana.vercel.app/#/snippet/{sid}\n"
            f"// Description: {desc}\n\n"
            f"{stripped}\n"
            "export default {\n"
            "    route: {\n"
            f'        method: "{verb}",\n'
            f'        path: "{route_path}",\n'
            "        auth: false,\n"
            f'        tags: ["Kana · {tag}"],\n'
            f"        summary: {json.dumps(title.replace('.js', ''))},\n"
            f"        description: {json.dumps(desc or f'Ported from r2-kana snippet {title}')},\n"
            f"        parameters: {parameters_block},\n"
            "        responses: {\n"
            '            "200": {\n'
            '                description: "Berhasil",\n'
            '                content: {\n'
            '                    "application/json": {\n'
            '                        schema: {\n'
            '                            type: "object",\n'
            '                            properties: {\n'
            '                                ok: { type: "boolean", example: true },\n'
            '                                result: { type: "object" },\n'
            '                            },\n'
            '                        },\n'
            '                    },\n'
            '                },\n'
            '            },\n'
            '            "400": { description: "Parameter tidak valid" },\n'
            '            "500": { description: "Kesalahan server" },\n'
            '        },\n'
            '    },\n\n'
            '    handler: async (req, res) => {\n'
            f"{handler_body}\n"
            '    },\n'
            '}\n'
        )

        out_path = os.path.join(DST_DIR, f"{slug}.js")
        with open(out_path, "w") as f:
            f.write(feature)
        stats["converted"] += 1

    print(json.dumps(stats, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
