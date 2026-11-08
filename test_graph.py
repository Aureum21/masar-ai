import asyncio
import json
from MasarAi import MasarAi

async def main():
    ai = MasarAi()
    await ai.setup()
    async for event in ai.graph.astream({
        "messages": [("user", "find me flights to dxb from lhr next week")]
    }, config={"configurable": {"user_id": 1, "thread_id": "test_5"}}):
        print(event)
    
if __name__ == "__main__":
    asyncio.run(main())
