"""Index project source files into the local Chroma knowledge base."""
import argparse
import hashlib
from pathlib import Path

from core import iter_source_files, split_source, vector_store


def main():
    parser = argparse.ArgumentParser(description="Index code into LinkStory AI local memory.")
    parser.add_argument("directory", help="Directory containing project source code")
    args = parser.parse_args()

    source_root = Path(args.directory).expanduser().resolve()
    store = vector_store()
    total_files = 0
    total_chunks = 0

    for path in iter_source_files(source_root):
        relative = str(path.relative_to(source_root))
        documents = split_source(path, source_root)
        if not documents:
            continue

        # Replace old chunks from this file to avoid duplicates on re-index.
        store.delete(where={"source": relative})
        ids = [
            hashlib.sha256(
                (relative + "\0" + str(index) + "\0" + doc.page_content).encode("utf-8")
            ).hexdigest()
            for index, doc in enumerate(documents)
        ]
        store.add_documents(documents, ids=ids)
        total_files += 1
        total_chunks += len(documents)
        print(f"Indexado: {relative} ({len(documents)} blocos)")

    print(f"\nConcluído: {total_files} arquivos e {total_chunks} blocos indexados.")
    print("A memória é local; nenhum código é enviado a uma API de IA externa.")


if __name__ == "__main__":
    main()
