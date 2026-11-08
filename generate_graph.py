import asyncio
from MasarAi import MasarAi

async def main():
    print("Initializing MasarAi...")
    agent = MasarAi()
    
    print("Building the graph...")
    await agent.setup()
    
    print("Generating image...")
    image_bytes = agent.graph.get_graph().draw_mermaid_png()
    
    output_path = "masar_ai_architecture.png"
    with open(output_path, "wb") as f:
        f.write(image_bytes)
        
    print(f"Success! Graph saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
