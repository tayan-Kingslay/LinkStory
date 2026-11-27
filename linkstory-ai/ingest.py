"""Index only explicitly approved public documents into the shared Nox knowledge base.

Never recursively index the repository: it may contain private Kairox material,
unpublished stories, user data, credentials, or confidential Tuketon content.
"""
import argparse
import hashlib
from pathlib import Path

from core import split_source, vector_store

# This is an allowlist, not a directory scan. Add a document only after review
# and explicit approval that its complete contents are safe for every user.
APPROVED_PUBLIC_DOCUMENTS = (
    Path("knowledge/PUBLIC_KNOWLEDGE.md"),
)


def main():
    parser = argparse.ArgumentParser(
        description="Index approved public documents into the shared Nox knowledge base."
    )
    parser.add_argument(
        "directory",
        help="LinkStory AI directory; only the explicit public-document allowlist is indexed",
    )
    args = parser.parse_args()

    source_root = Path(args.directory).expanduser().resolve()
    if not source_root.exists() or not source_root.is_dir():
        raise ValueError(f"Pasta de códigos não encontrada: {source_root}")

    store = vector_store()
    total_files = 0
    total_chunks = 0

    for relative_path in APPROVED_PUBLIC_DOCUMENTS:
        path = (source_root / relative_path).resolve()
        if not path.is_relative_to(source_root):
            raise ValueError(f"Caminho fora da pasta permitida: {relative_path}")
        if not path.is_file():
            raise FileNotFoundError(
                f"Documento público aprovado não encontrado: {relative_path}"
            )

        relative = relative_path.as_posix()
        documents = split_source(path, source_root)
        if not documents:
            store.delete(where={"source": relative})
            continue

        # Replace old chunks from this approved document to avoid duplicates.
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
        print(f"Indexado documento público: {relative} ({len(documents)} blocos)")

    print(f"\nConcluído: {total_files} documentos e {total_chunks} blocos públicos indexados.")
    print("Nenhum outro arquivo do repositório é incluído nesta base compartilhada.")


if __name__ == "__main__":
    main()
