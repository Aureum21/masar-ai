# -*- coding: utf-8 -*-
"""
Script to generate the LangGraph multi-agent architecture diagram for Masar AI.
Uses LangGraph's built-in Mermaid visualization engine.
"""

import asyncio
from MasarAi import MasarAi

async def main():
    print("Initializing Masar AI and compiling graph...")
    agent = MasarAi()
    await agent.setup()

    # 1. Generate PNG image via LangGraph built-in draw_mermaid_png()
    output_filename = "masar_architecture.png"
    print(f"Generating architecture diagram to '{output_filename}'...")
    png_bytes = agent.graph.get_graph().draw_mermaid_png()
    
    with open(output_filename, "wb") as f:
        f.write(png_bytes)
    
    print(f"Successfully generated {output_filename}!")

    # 2. Also save the raw Mermaid markup for markdown / slides / web docs
    mermaid_code = agent.graph.get_graph().draw_mermaid()
    with open("masar_architecture.mmd", "w", encoding="utf-8") as f:
        f.write(mermaid_code)
    print("Saved Mermaid markup to 'masar_architecture.mmd'")

if __name__ == "__main__":
    asyncio.run(main())
