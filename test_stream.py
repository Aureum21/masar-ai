import httpx
import asyncio

async def test_chat():
    url = "http://localhost:8000/api/v1/chat"
    payload = {
        "message": "Find me a cheap hotel in Dubai for this weekend.",
        "user_id": "test_user_1",
        "thread_id": "test_thread"
    }
    
    # We use httpx to read the stream as it arrives
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            async for chunk in response.aiter_lines():
                if chunk.startswith("data: "):
                    # Print the raw SSE chunks as they stream in!
                    print(chunk)

if __name__ == "__main__":
    asyncio.run(test_chat())