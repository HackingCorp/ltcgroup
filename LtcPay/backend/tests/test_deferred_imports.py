"""
Every deferred import must resolve.

An import written inside a function does not run when the module loads, so
neither the test suite nor a successful boot proves it works — only the code
path that reaches it does, in production, on a payment.

On 2026-09-21 `_CUSTOMER_ERROR_MARKERS` was removed from
touchpay_direct_service while accountpe_service still imported it from inside
`_looks_customer_caused`. Nothing failed until AccountPE returned a business
error: the ImportError then surfaced as HTTP 500 on payment creation, and the
payment was left PENDING with nothing recorded. It broke exactly when the
failover it guards was needed — four Guinea payments that evening.
"""
import ast
import importlib
import pathlib

import pytest

APP = pathlib.Path(__file__).resolve().parent.parent / "app"


def _deferred_imports():
    """(file, line, module, name) for every `from app...` inside a function."""
    for path in sorted(APP.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), str(path))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for sub in ast.walk(node):
                if isinstance(sub, ast.ImportFrom) and (sub.module or "").startswith("app."):
                    for alias in sub.names:
                        if alias.name != "*":
                            yield path.name, sub.lineno, sub.module, alias.name


CASES = list(_deferred_imports())


def test_the_codebase_actually_has_deferred_imports():
    """Guards the guard: an empty list would make every case below vacuous."""
    assert len(CASES) > 50


@pytest.mark.parametrize(
    "filename,lineno,module,name",
    CASES,
    ids=[f"{f}:{ln}:{m.split('.')[-1]}.{n}" for f, ln, m, n in CASES],
)
def test_a_deferred_import_resolves(filename, lineno, module, name):
    imported = importlib.import_module(module)
    assert hasattr(imported, name), (
        f"{filename}:{lineno} imports {name} from {module}, which no longer has it"
    )
