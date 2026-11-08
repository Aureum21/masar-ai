"""Local/staging persistence probe: only writes its own random checkpoint thread.

No model or provider calls. Use after explicit checkpoint schema initialization.
"""
import asyncio
import argparse
from uuid import uuid4
from langgraph.graph import StateGraph,START,END
from langgraph.graph.message import MessagesState
from langchain_core.messages import AIMessage,HumanMessage
from services.agent_checkpoints import checkpoint_lifespan,checkpoint_thread

async def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase', choices=['roundtrip','write','read'], default='roundtrip')
    parser.add_argument('--thread', default=str(uuid4()))
    args=parser.parse_args()
    config={'configurable':{'thread_id':checkpoint_thread('deployment-probe',args.thread)}}
    graph=StateGraph(MessagesState)
    graph.add_node('fixture',lambda state:{'messages':[AIMessage(content='Local persistence fixture')]})
    graph.add_edge(START,'fixture');graph.add_edge('fixture',END)
    if args.phase in ('roundtrip','write'):
        async with checkpoint_lifespan() as saver:
            await graph.compile(checkpointer=saver).ainvoke({'messages':[HumanMessage(content='Fixture only')]},config)
    if args.phase=='write':
        print('Isolated checkpoint fixture written; no provider invoked.')
        return
    # New pool, new saver: verify persistence without the original process-local object.
    async with checkpoint_lifespan() as saver:
        state=await graph.compile(checkpointer=saver).aget_state(config)
        assert state.values['messages'][-1].content=='Local persistence fixture'
        await saver.adelete_thread(config['configurable']['thread_id'])
    print('Checkpoint round-trip and deletion passed across separate connections; no provider invoked.')

if __name__=='__main__':asyncio.run(main())
