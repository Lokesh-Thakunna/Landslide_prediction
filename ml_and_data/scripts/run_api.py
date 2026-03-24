from __future__ import annotations

import sys
from pathlib import Path

import uvicorn

sys.path.append(str(Path(__file__).resolve().parents[1]))


def main() -> None:
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=False)


if __name__ == "__main__":
    main()
