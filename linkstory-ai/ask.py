"""Ask the local LinkStory AI engineering assistant."""
import argparse
from core import answer_question


def main():
    parser = argparse.ArgumentParser(description="Ask LinkStory AI local memory.")
    parser.add_argument("question", help="Question about the indexed project")
    args = parser.parse_args()
    result = answer_question(args.question)
    print("\nLinkStory AI:\n")
    print(result["answer"])
    if result["sources"]:
        print("\nFontes consultadas:")
        for source in result["sources"]:
            print(f"- {source['file']} (linha aproximada {source['line']})")


if __name__ == "__main__":
    main()
