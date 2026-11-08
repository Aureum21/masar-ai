"""
Masar AI — Interactive CLI Trial Interface
A simple terminal-based chat to test the multi-agent Orchestrator system.
Run: python trial.py
"""
import asyncio
from MasarAi import MasarAi


CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"


async def main():
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  مسار  Masar AI — Multi-Agent Travel Concierge{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{DIM}  Initializing Orchestrator + 3 specialized agents...{RESET}")

    agent = MasarAi()
    await agent.setup()

    print(f"{GREEN}  ✅ System ready! 10 nodes compiled.{RESET}")
    print(f"{DIM}  Type your travel request. Type 'quit' or 'exit' to stop.{RESET}")
    print(f"{CYAN}{'─'*60}{RESET}\n")

    history = []

    while True:
        try:
            user_input = input(f"{BOLD}You: {RESET}")
        except (EOFError, KeyboardInterrupt):
            print(f"\n{DIM}Goodbye!{RESET}")
            break

        if user_input.strip().lower() in ("quit", "exit", "q"):
            print(f"\n{DIM}مع السلامة! (Goodbye!){RESET}")
            break

        if not user_input.strip():
            continue

        print(f"\n{DIM}  ⏳ Processing through multi-agent graph...{RESET}\n")

        try:
            print(f"{YELLOW}  ── Agent Trace ──{RESET}")
            
            async for output in agent.run_stream(
                message=user_input,
                history=history,
                user_id="trial-user-001"
            ):
                if "status_update" in output:
                    print(f"  {DIM}{output['status_update']}{RESET}")
                
                elif "worker_result" in output:
                    agent_name, result = output["worker_result"]
                    name = agent_name.split('_')[0].title()
                    preview = result[:300] + "..." if len(result) > 300 else result
                    print(f"\n{MAGENTA}  ── {name} Agent Result ──{RESET}")
                    print(f"  {DIM}{preview}{RESET}\n")
                    print(f"{YELLOW}  ── Agent Trace ──{RESET}") # resume trace headers
                
                elif "final" in output:
                    # Print the final response and metadata
                    print(f"\n{GREEN}{BOLD}Masar AI:{RESET} {output['response']}\n")
                    
                    if output.get("itinerary_complete"):
                        print(f"  {GREEN}✅ Itinerary marked as complete{RESET}")
                    if output.get("user_input_needed"):
                        print(f"  {YELLOW}❓ Agent needs more information from you{RESET}")
                    if output.get("plan"):
                        print(f"  {DIM}📋 Plan: {output['plan'][:120]}...{RESET}")
                    print(f"{CYAN}{'─'*60}{RESET}\n")
                    
                    history = output.get("history", history)

        except Exception as e:
            print(f"\n  {BOLD}\033[91m❌ Error: {e}{RESET}\n")
            import traceback
            traceback.print_exc()
            print(f"{CYAN}{'─'*60}{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())
