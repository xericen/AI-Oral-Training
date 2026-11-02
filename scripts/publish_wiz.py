"""Publish the built React client into the current WIZ project's static assets."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
source = root/"frontend"/"dist"
target = root.parent/"src"/"assets"/"oral-training"
if not (source/"index.html").exists():
    raise SystemExit("Run npm run build in frontend first.")
target.mkdir(parents=True, exist_ok=True)
for path in source.rglob("*"):
    if path.is_file():
        destination = target/path.relative_to(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path,destination)
print(f"Published React client: {target}")
