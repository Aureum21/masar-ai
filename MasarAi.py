# -*- coding: utf-8 -*-
import os
import operator
import json
import asyncio
import prompts_orchestrator
import prompts_workers
from typing import Annotated
from typing_extensions import TypedDict
# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, START, END
# pyrefly: ignore [missing-import]
from langgraph.graph.message import add_messages
from config.runtime import load_environment
# pyrefly: ignore [missing-import]
from langgraph.prebuilt import ToolNode
# pyrefly: ignore [missing-import]
from langchain_openai import ChatOpenAI
# pyrefly: ignore [missing-import]
from services.agent_checkpoints import get_checkpointer, checkpoint_thread
# pyrefly: ignore [missing-import]
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from typing import List, Any, Optional, Dict, Literal
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from masarAiTools import (
    get_accommodation_tools,
    get_logistics_tools,
    get_event_tools,
    get_orchestrator_tools,
)

load_environment()


# =============================================================================
# STATE SCHEMA
# =============================================================================

class TripState(TypedDict):
    """Rich state schema for multi-agent collaboration and SSE streaming."""
    messages: Annotated[List[Any], add_messages]             # Full conversation history
    trip_brief: Optional[Dict[str, Any]]
    planning_context: Optional[Dict[str, Any]]
    planning_run_id: Optional[str]
    user_preferences: Optional[Dict[str, Any]]               # Stored DB preferences
    # Orchestrator planning
    plan: Optional[str]                                       # The Orchestrator's multi-step plan
    current_step: Optional[str]                               # Which step of the plan is being executed
    next_worker: Optional[str]                                # Which worker to delegate to next
    parallel_workers: Optional[List[str]]                     # Workers to run in parallel (fan-out)
    # Worker results (each worker writes to its own slot)
    accommodation_result: Optional[Dict[str, Any]]            # Accommodation Agent's structured findings
    logistics_result: Optional[Dict[str, Any]]                # Logistics Agent's structured findings
    event_result: Optional[Dict[str, Any]]                    # Event Agent's structured findings
    flight_result: Optional[Dict[str, Any]]                   # Flight Agent's structured findings
    trip_planner_result: Optional[str]                        # Trip Planner's saved confirmation
    saved_trip_id: Optional[int]                              # ID of the newly saved trip
    prebook_id: Optional[str]                                 # Extracted prebook ID
    prebook_details: Optional[Any]                            # Extracted prebook details (dict or BaseModel)
    # Orchestrator evaluation
    itinerary_complete: bool                                  # Is the final itinerary ready?
    user_input_needed: bool                                   # Does the Orchestrator need user clarification?
    feedback_on_work: Optional[str]                           # Instructions for the next worker
    # SSE streaming
    status_updates: Annotated[List[str], operator.add]        # Append-only status log for SSE


# =============================================================================
# STRUCTURED OUTPUT MODELS
# =============================================================================

class HotelUIProps(BaseModel):
    name: str = Field(description="Name of the hotel")
    roomType: str = Field("Not specified", description="Type of room")
    location: str = Field(description="City and Emirate")
    price: float = Field(0.0, description="Price per night")
    currency: str = Field("AED", description="Currency, e.g. AED")
    imageUrl: Optional[str] = Field(None, description="Image URL of the hotel")
    offerId: Optional[str] = Field(None, description="The offer ID for booking")
    lat: float = Field(25.1972, description="Latitude")
    lng: float = Field(55.2744, description="Longitude")
    rating: float = Field(0.0, description="Rating out of 5")

class PrebookDetails(BaseModel):
    hotelName: str = Field(description="The name of the hotel booked")
    price: str = Field(description="The total price of the booking, including currency")
    location: str = Field(description="The location of the hotel")

class AccommodationResultUI(BaseModel):
    hotels: List[HotelUIProps]
    conversational_message: str = Field(description="A short conversational message summarizing the options")
    prebook_id: Optional[str] = Field(None, description="If a prebook was made, the extracted Prebook ID")
    prebook_details: Optional[PrebookDetails] = Field(None, description="If a prebook was made, the details of the booking")

class LightAccommodationResultUI(BaseModel):
    conversational_message: str = Field(description="A warm, natural response. MUST format the names of the hotels found as a clean bulleted list in **bold** (e.g. '- **Hotel Name**'). DO NOT include prices, dates, or links.")
    prebook_id: Optional[str] = Field(None, description="If a prebook was made, the extracted Prebook ID")
    prebook_details: Optional[PrebookDetails] = Field(None, description="If a prebook was made, the details of the booking")

class RouteUIProps(BaseModel):
    origin: str = Field("Origin")
    destination: str = Field("Destination")
    duration: str = Field("Unknown")
    distance: str = Field("Unknown")
    fare: str = Field("Unknown")
    steps: List[str] = Field(default_factory=list)

class LogisticsResultUI(BaseModel):
    routes: List[RouteUIProps]
    conversational_message: str = Field(description="A short natural response mentioning the route options. DO NOT include step-by-step directions.")

class EventUIProps(BaseModel):
    name: str = Field("Event")
    date: str = Field("Date not specified")
    venue: str = Field("Venue not specified")
    description: Optional[str] = Field(None)
    link: Optional[str] = Field(None)
    imageUrl: Optional[str] = Field(None)

class EventResultUI(BaseModel):
    events: List[EventUIProps]
    conversational_message: str = Field(description="A warm, natural response. MUST format the event names as a clean bulleted list in **bold** (e.g. '- **Event Name**'). DO NOT include dates, venues, descriptions, or links.")

class LightLogisticsResultUI(BaseModel):
    conversational_message: str = Field(description="A short natural response mentioning the route options. DO NOT include step-by-step directions.")

class LightEventResultUI(BaseModel):
    conversational_message: str = Field(description="A warm, natural response. MUST format the event names as a clean bulleted list in **bold** (e.g. '- **Event Name**'). DO NOT include dates, venues, descriptions, or links.")

class FlightResultUI(BaseModel):
    flights: List[Dict[str, Any]] = Field(description="The flight offers returned by the tool")
    conversational_message: str = Field(description="A short natural response mentioning the flights found. Format flight options as a clean bulleted list.")

class LightFlightResultUI(BaseModel):
    conversational_message: str = Field(description="A short natural response. Format flight options as a clean bulleted list.")

class OrchestratorDecision(BaseModel):
    """Structured output for the Orchestrator's routing decision."""
    reasoning: str = Field(description="Brief reasoning about the current state and what needs to happen next")
    ui_status_update: str = Field(description="A very short, premium, user-facing status update (max 4-6 words). e.g. 'Curating exclusive experiences...', 'Analyzing transit options...', 'Finalizing your itinerary...'")
    is_greeting_or_conversational: bool = Field(
        False,
        description="Set to true if the user's input is a greeting, a thank you, a question about you, OR any direct question that you can answer immediately using only your system instructions and user preferences (e.g. 'what are my preferences'), without needing travel API research."
    )
    
    next_worker: Literal["accommodation_agent", "logistics_agent", "event_agent", "flight_agent", "trip_planner_agent", "parallel_dispatch", "DONE", "NEED_USER_INPUT"] = Field(
        description=(
            "Which specialized agent to delegate to next. "
            "RULES: "
            "- Use 'parallel_dispatch' to invoke multiple agents at once (must also populate parallel_workers). "
            "- Use 'accommodation_agent' for ANY query about hotels, stays, room rates, or booking. "
            "- Use 'event_agent' ONLY for live events, concerts, sports, or restaurants. "
            "- Use 'logistics_agent' for ANY query about routes, transit, metro, taxi, or weather. "
            "- Use 'flight_agent' for ANY query about flights, airlines, plane tickets, or booking flights. CRITICAL: If the user asks for flights but DOES NOT provide an exact departure date, do NOT use flight_agent. Instead, use 'DONE' and output exactly '[FLIGHT_SEARCH_FORM:origin=X:destination=Y]' replacing X and Y with the user's requested origin and destination if known. "
            "- Use 'trip_planner_agent' ONLY when the user explicitly requested a full trip itinerary (e.g. 'plan a 3-day trip') AND all research from other agents is complete. NEVER use trip_planner_agent for simple standalone hotel searches, event lookups, or route queries! "
            "- Use 'DONE' when you have finished answering the user's latest query (e.g., after accommodation_agent found hotels, after a room is prebooked, after event_agent found events). Do NOT loop back to a worker if the user's request is fulfilled!"
            "- Use 'NEED_USER_INPUT' ONLY when you genuinely cannot proceed without clarification."
        )
    )
    parallel_workers: Optional[List[str]] = Field(
        None,
        description=(
            "For FULL TRIP PLANNING only: list multiple agents to run in parallel. "
            "Example: ['accommodation_agent', 'event_agent', 'flight_agent']. "
            "When this is set, next_worker MUST be 'parallel_dispatch'. "
            "NEVER use this for standalone single-domain queries!"
        )
    )
    instructions_for_worker: Optional[str] = Field(
        None,
        description="Specific, detailed instructions for the worker. Include all relevant context: dates, city, budget, preferences, nationality."
    )
    parallel_instructions: Optional[Dict[str, str]] = Field(
        None,
        description="When using parallel_workers, provide per-agent instructions. Keys are agent names, values are their specific instructions."
    )
    plan: Optional[str] = Field(
        None,
        description="If this is the first delegation, provide a numbered multi-step plan for fulfilling the user's travel request"
    )
    current_step: Optional[str] = Field(
        None,
        description="The step of the plan currently being executed"
    )
    final_itinerary: Optional[str] = Field(
        None,
        description="The complete, synthesized itinerary, answer, OR your warm conversational response. CRITICAL: You MUST populate this field whenever next_worker is DONE!"
    )
    question_for_user: Optional[str] = Field(
        None,
        description="A direct, clear question to ask the user for missing information. Only populate when next_worker is NEED_USER_INPUT."
    )
    needs_rag_search: Optional[str] = Field(
        None,
        description="If the user asks a factual, cultural, or general UAE knowledge question and you need to search the knowledge base to answer it directly without delegating, put the search query here."
    )
    prebook_id: Optional[str] = Field(None, description="If a worker returned a prebook ID, pass it here")
    prebook_details: Optional[PrebookDetails] = Field(None, description="If a worker returned prebook details, pass them here")


# =============================================================================
# MASAR AI - MULTI-AGENT ORCHESTRATOR
# =============================================================================

# =============================================================================
# GLOBAL MEMORY
# =============================================================================
# PostgreSQL in production; process-local memory is retained for development/tests.



class MasarAi:
    def __init__(self):
        # LLMs
        self.orchestrator_tool_llm = None
        self.orchestrator_structured = None
        self.trip_planner_llm = None
        self.accom_llm = None
        self.logistics_llm = None
        self.event_llm = None
        self.flight_llm = None
        # Tool lists
        self.accom_tools = None
        self.logistics_tools = None
        self.event_tools = None
        self.orchestrator_tools = None
        # Graph
        self.graph = None
        self.masar_ai_id = str(uuid.uuid4())
        self.memory = get_checkpointer()

    async def setup(self, planning=False):
        """Initialize all LLMs, bind tools, and compile the graph."""
        # Load domain-specific tool sets
        self.accom_tools = get_accommodation_tools()
        self.logistics_tools = get_logistics_tools()
        self.event_tools = get_event_tools()
        self.orchestrator_tools = get_orchestrator_tools()
        from masarAiTools import get_flight_tools
        self.flight_tools = get_flight_tools()
        if planning:
            from masarAiTools import get_planning_catalogue
            self.orchestrator_tools.append(get_planning_catalogue)
            # Planning may research and save a new draft, but cannot book or send email.
            self.accom_tools=[t for t in self.accom_tools if t.name in {'search_google_places','resolve_discovery_places','search_hotels','search_for_availability','get_hotel_details','get_hotel_reviews','get_hotel_rooms'}]
            self.flight_tools=[t for t in self.flight_tools if t.name=='search_flights']
            self.orchestrator_tools=[t for t in self.orchestrator_tools if t.name in {'save_trip_to_database','get_trip_from_database','search_portal_knowledge','scrape_official_portal','resolve_discovery_places','get_planning_catalogue'}]

        # Read model configurations from environment variables
        orchestrator_model = os.getenv("ORCHESTRATOR_MODEL", "gpt-4o")
        worker_model = os.getenv("WORKER_MODEL", "gpt-4o-mini")
        logistics_model = os.getenv("LOGISTICS_MODEL", worker_model)
        trip_planner_model = os.getenv("TRIP_PLANNER_MODEL", "gpt-4o")

        # Orchestrator - uses structured output for routing decisions only
        # Tools (email, portal knowledge) are handled via orchestrator_tools_node
        orchestrator_base = ChatOpenAI(model=orchestrator_model, temperature=0)
        self.orchestrator_structured = orchestrator_base.with_structured_output(OrchestratorDecision, method="function_calling")

        # Orchestrator tool-caller: a separate LLM step for using portal/email tools
        self.orchestrator_tool_llm = ChatOpenAI(model=worker_model, temperature=0).bind_tools(self.orchestrator_tools)

        # Dedicated Trip Planner LLM for high-intelligence synthesis and database saving
        self.trip_planner_llm = ChatOpenAI(model=trip_planner_model, temperature=0).bind_tools(self.orchestrator_tools)

        # Specialized workers - each bound to their own tool subset
        self.accom_llm = ChatOpenAI(model=worker_model, temperature=0).bind_tools(self.accom_tools)
        self.logistics_llm = ChatOpenAI(model=logistics_model, temperature=0).bind_tools(self.logistics_tools)
        self.event_llm = ChatOpenAI(model=worker_model, temperature=0).bind_tools(self.event_tools)
        self.flight_llm = ChatOpenAI(model=worker_model, temperature=0).bind_tools(self.flight_tools)

        await self.build_graph()

    # =========================================================================
    # ORCHESTRATOR NODE (The Brain / Supervisor)
    # =========================================================================

    def orchestrator(self, state: TripState) -> Dict[str, Any]:
        """The Orchestrator analyzes user intent, creates a plan, delegates to workers,
        synthesizes results, and validates the final itinerary."""
        from domain.planning import structured_routing
        routed=structured_routing(state)
        if routed is not None:return routed
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Gather any worker results collected so far
        collected_results = []
        if state.get("accommodation_result"):
            collected_results.append(f"[Accommodation Agent]: {state['accommodation_result'].get('conversational_message', '')}")
        if state.get("logistics_result"):
            collected_results.append(f"[Logistics Agent]: {state['logistics_result'].get('conversational_message', '')}")
        if state.get("event_result"):
            collected_results.append(f"[Event Agent]: {state['event_result'].get('conversational_message', '')}")
        if state.get("flight_result"):
            collected_results.append(f"[Flight Agent]: {state['flight_result'].get('conversational_message', '')}")
        if state.get("trip_planner_result"):
            collected_results.append(f"[Trip Planner]: {state['trip_planner_result']}")

        has_worker_results = len(collected_results) > 0
        results_section = "\n\n".join(collected_results) if collected_results else "No worker results collected yet."

        prefs_str = json.dumps(state.get("user_preferences") or {}, indent=2) if state.get("user_preferences") else "None provided."
        system_message = prompts_orchestrator.get_orchestrator_prompt(now=now, results_section=results_section, has_worker_results=has_worker_results, user_preferences=prefs_str)
        from config.localization import response_language_instruction
        system_message += '\n\n' + response_language_instruction((state.get('user_preferences') or {}).get('response_locale', 'en'))

        if state.get("plan"):
            system_message += f"""
═══════════════════════════════════════════════════════
YOUR CURRENT PLAN:
═══════════════════════════════════════════════════════
{state['plan']}
CURRENT STEP: {state.get('current_step', 'Not set')}
"""

        decision_messages = [
            SystemMessage(content=system_message),
            HumanMessage(content=self._format_conversation(state["messages"]))
        ]

        decision: OrchestratorDecision = self.orchestrator_structured.invoke(decision_messages)

        # Handle internal RAG search if the orchestrator requested it
        if decision.needs_rag_search and decision.next_worker != "trip_planner_agent":
            from masarAiTools import search_portal_knowledge
            rag_result = search_portal_knowledge.invoke({"query": decision.needs_rag_search})
            rag_context = f"Internal Knowledge Base Result for '{decision.needs_rag_search}':\n{rag_result}\n\nUse this information to answer the user directly in the final_itinerary field, and set next_worker to DONE."
            decision_messages.append(SystemMessage(content=rag_context))
            # Re-invoke to get the final answer
            decision = self.orchestrator_structured.invoke(decision_messages)

        # Safety guard: prevent DONE without worker results, UNLESS it's a greeting/conversational, we just did a RAG search, or it provided a direct factual answer.
        is_direct_answer = decision.is_greeting_or_conversational or decision.needs_rag_search or bool(decision.final_itinerary)
        if decision.next_worker == "DONE" and not has_worker_results and not is_direct_answer:
            # Force a delegation based on the user's message
            last_user_msg = ""
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    last_user_msg = msg.content.lower()
                    break

            if "customize my trip" in last_user_msg or "update my trip" in last_user_msg:
                decision.next_worker = "trip_planner_agent"
                decision.instructions_for_worker = f"The user wants to customize an existing trip. Use get_trip_from_database to fetch it, make the requested changes based on their prompt, and then use update_trip_in_database to save it: {last_user_msg}"
                decision.ui_status_update = "Accessing your trip to make customizations..."
            elif any(kw in last_user_msg for kw in ["hotel", "stay", "room", "book", "accommodation", "prebook"]):
                decision.next_worker = "accommodation_agent"
                
                if "prebook" in last_user_msg or "book" in last_user_msg:
                    decision.instructions_for_worker = f"The user wants to book a hotel. Use makePrebook to lock the room: {last_user_msg}"
                    decision.ui_status_update = "Securing your room and locking the price..."
                else:
                    decision.instructions_for_worker = f"Find hotels based on this user request: {last_user_msg}"
                    decision.ui_status_update = "Finding the perfect stay..."
            elif any(kw in last_user_msg for kw in ["route", "metro", "taxi", "transport", "get to", "how to get", "weather"]):
                decision.next_worker = "logistics_agent"
                decision.instructions_for_worker = f"Research transport/logistics for: {last_user_msg}"
            elif any(kw in last_user_msg for kw in ["event", "concert", "sport", "restaurant", "food", "dining", "show", "ticket"]):
                decision.next_worker = "event_agent"
                decision.instructions_for_worker = f"Search for live events or restaurants: {last_user_msg}"
            elif any(kw in last_user_msg for kw in ["flight", "flights", "plane", "airline"]):
                decision.next_worker = "flight_agent"
                decision.instructions_for_worker = f"Search for flights: {last_user_msg}"
            else:
                # Default safety fallback: we ask the user for clarification instead of spinning up the Ticketmaster agent.
                decision.next_worker = "NEED_USER_INPUT"
                decision.question_for_user = "I can help you plan a trip, book a hotel, find live events, or map out transit routes. What would you like to explore?"

        # Extract the user's latest message for intent analysis
        last_user_msg = ""
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                last_user_msg = msg.content.lower()
                break

        import re
        is_trip_keyword_present = bool(re.search(r'\b(plan|create|build|make)\b.*\b(trip|itinerary|vacation|holiday|journey)\b', last_user_msg)) or any(kw in last_user_msg for kw in ["honeymoon", "save this trip", "save my trip", "plan the whole trip", "using our conversation", "using the above"])
        
        is_standalone_search = any(kw in last_user_msg for kw in ["flight", "flights", "hotel", "hotels", "stay", "room", "rooms", "event", "events", "concert", "route", "metro", "taxi", "how to get", "weather", "restaurant", "dining"]) and not is_trip_keyword_present
        is_trip_request = is_trip_keyword_present and not is_standalone_search

        # --- PARALLEL DISPATCH LOGIC ---
        # If the orchestrator requested parallel workers, honour it
        if decision.parallel_workers and len(decision.parallel_workers) > 1:
            agent_names = [w.replace('_agent', '').title() for w in decision.parallel_workers]
            agents_str = ", ".join(agent_names)
            updates: Dict[str, Any] = {
                "status_updates": [f"Orchestrator: Dispatching {agents_str} Agents in parallel..."],
                "parallel_workers": decision.parallel_workers,
                "next_worker": "parallel_dispatch",
                "itinerary_complete": False,
                "user_input_needed": False,
            }
            if decision.plan:
                updates["plan"] = decision.plan
            if decision.current_step:
                updates["current_step"] = decision.current_step
            if decision.parallel_instructions:
                updates["feedback_on_work"] = json.dumps(decision.parallel_instructions)
            elif decision.instructions_for_worker:
                updates["feedback_on_work"] = decision.instructions_for_worker
            return updates

        # 1. Force trip planner ONLY if the user explicitly asked for a full multi-part trip plan
        if decision.next_worker == "DONE" and has_worker_results:
            has_trip_planner_run = bool(state.get("trip_planner_result"))
            if is_trip_request and not has_trip_planner_run:
                decision.next_worker = "trip_planner_agent"
                decision.instructions_for_worker = "Compile ALL previously collected research (flights, hotels, events, routes) from the conversation into a premium day-by-day itinerary. Group activities geographically and save it to the database using the save_trip_to_database tool."
                decision.ui_status_update = "Structuring premium itinerary..."

        # 2. CRITICAL HARD GUARD: If decision is trip_planner_agent but user did NOT ask for a full trip plan or customization, FORBID IT!
        if decision.next_worker == "trip_planner_agent":
            # Check if trip planner already successfully called the database tool in THIS turn
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    break
                from domain.planning import saved_trip_identity
                if getattr(msg, "name", "") in ["save_trip_to_database", "update_trip_in_database"] and saved_trip_identity(msg.content):
                    decision.next_worker = "DONE"
                    decision.final_itinerary = "I have successfully organized and saved your premium itinerary! You can view the details in the trip cards."
                    break

            is_customization = any(kw in last_user_msg for kw in ["customize", "update my trip", "change my trip", "modify my trip"])
            if not is_trip_request and not is_customization:
                decision.next_worker = "DONE"
                if not decision.final_itinerary:
                    decision.final_itinerary = "Here are the options based on your request."

        # Manually override the UI status if we detect a prebook command
        final_ui_status = decision.ui_status_update
        if decision.next_worker == "accommodation_agent" and any(k in state["messages"][-1].content.lower() for k in ["book", "prebook"]):
            final_ui_status = "Securing your room and locking the price..."

        # Build state update
        updates: Dict[str, Any] = {
            "status_updates": [final_ui_status]
        }

        if decision.plan:
            updates["plan"] = decision.plan

        if decision.current_step:
            updates["current_step"] = decision.current_step

        if decision.next_worker == "DONE":
            # Make sure it actually sends the conversational response, not just the internal reasoning
            final_content = decision.final_itinerary if decision.final_itinerary else "I have processed your request. Let me know what else you'd like to explore!"
            
            if decision.is_greeting_or_conversational and not decision.final_itinerary:
                 final_content = "Hello! I am Masar AI, your luxury UAE travel concierge. How can I craft your perfect journey today?"

            # CRITICAL FIX: Bubble up any required forms or direct tool messages from workers
            flight_res = state.get("flight_result", {})
            if isinstance(flight_res, dict):
                flight_msg = str(flight_res.get("conversational_message", ""))
                if "[FLIGHT_SEARCH_FORM" in flight_msg:
                    final_content = flight_msg

            updates["messages"] = [AIMessage(content=final_content)]
            updates["itinerary_complete"] = True
            updates["user_input_needed"] = False
            updates["next_worker"] = "DONE"
            if decision.prebook_id:
                updates["prebook_id"] = decision.prebook_id
            if decision.prebook_details:
                updates["prebook_details"] = decision.prebook_details.dict() if hasattr(decision.prebook_details, "dict") else decision.prebook_details

        elif decision.next_worker == "NEED_USER_INPUT":
            content = decision.question_for_user or "I need a bit more information to proceed. Could you clarify your request?"
            updates["messages"] = [AIMessage(content=content)]
            updates["itinerary_complete"] = False
            updates["user_input_needed"] = True
            updates["next_worker"] = "NEED_USER_INPUT"

        else:
            updates["next_worker"] = decision.next_worker
            updates["feedback_on_work"] = decision.instructions_for_worker
            updates["itinerary_complete"] = False
            updates["user_input_needed"] = False

        return updates

    def orchestrator_router(self, state: TripState) -> str:
        """Routes from the Orchestrator to the appropriate worker or END."""
        next_w = state.get("next_worker", "DONE")
        if next_w == "parallel_dispatch":
            return "parallel_dispatch"
        if next_w in ("DONE", "NEED_USER_INPUT"):
            return "END"
        elif next_w in ("accommodation_agent", "logistics_agent", "event_agent", "flight_agent", "trip_planner_agent"):
            return next_w
        else:
            return "END"

    # =========================================================================
    # PARALLEL DISPATCH NODE (Fan-Out Multiple Workers Concurrently)
    # =========================================================================

    async def parallel_dispatch(self, state: TripState) -> Dict[str, Any]:
        """Fan-out node: runs multiple worker agents concurrently using asyncio.gather.
        Each worker runs its full tool loop (agent -> tool -> agent -> save) independently,
        then results are merged back into state."""
        workers = state.get("parallel_workers", [])
        if state.get('trip_brief'):
            from domain.planning import research_policy
            allowed=research_policy(state['trip_brief'])['workers']
            workers=[w for w in dict.fromkeys(workers) if w in allowed]
        if not workers:
            return {"status_updates": ["No parallel workers to dispatch."], "next_worker": "DONE"}

        # Parse per-agent instructions if available
        feedback = state.get("feedback_on_work", "")
        per_agent_instructions = {}
        try:
            per_agent_instructions = json.loads(feedback)
        except (json.JSONDecodeError, TypeError):
            # feedback is a plain string — use it for all agents
            per_agent_instructions = {w: feedback for w in workers}

        async def run_worker(worker_name: str) -> Dict[str, Any]:
            """Execute a single worker's full pipeline (agent -> tools loop -> save)."""
            instructions = per_agent_instructions.get(worker_name, feedback)
            worker_state = dict(state)
            worker_state["feedback_on_work"] = instructions

            if worker_name == "accommodation_agent":
                agent_result = await asyncio.to_thread(self.accommodation_agent, worker_state)
                worker_state["messages"] = list(state["messages"]) + agent_result.get("messages", [])
                # Tool loop
                rounds=0
                last_msg = worker_state["messages"][-1]
                while hasattr(last_msg, "tool_calls") and last_msg.tool_calls and rounds<4:
                    rounds+=1
                    tool_node = ToolNode(tools=self.accom_tools)
                    tool_result = await tool_node.ainvoke(worker_state)
                    for m in tool_result.get("messages", []):
                        worker_state["messages"].append(m)
                    agent_result = await asyncio.to_thread(self.accommodation_agent, worker_state)
                    for m in agent_result.get("messages", []):
                        worker_state["messages"].append(m)
                    last_msg = worker_state["messages"][-1]
                    # Chat keeps one-step interaction; the standalone hotel stage
                    # can finish a bounded discovery -> dated availability chain.
                    if (state.get('planning_context') or {}).get('stage')!='hotels':break
                    found=False
                    for message in tool_result.get('messages',[]):
                        try:
                            payload=json.loads(message.content) if isinstance(message.content,str) else message.content
                            found=found or (isinstance(payload,dict) and bool(payload.get('hotels')))
                        except (TypeError,ValueError):pass
                    if found:break
                save_result = await asyncio.to_thread(self.accommodation_save, worker_state)
                return {"accommodation_result": save_result.get("accommodation_result"),
                        "status_updates": save_result.get("status_updates", [])}

            elif worker_name == "logistics_agent":
                agent_result = await asyncio.to_thread(self.logistics_agent, worker_state)
                worker_state["messages"] = list(state["messages"]) + agent_result.get("messages", [])
                last_msg = worker_state["messages"][-1]
                while hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                    tool_node = ToolNode(tools=self.logistics_tools)
                    tool_result = await tool_node.ainvoke(worker_state)
                    for m in tool_result.get("messages", []):
                        worker_state["messages"].append(m)
                    agent_result = await asyncio.to_thread(self.logistics_agent, worker_state)
                    for m in agent_result.get("messages", []):
                        worker_state["messages"].append(m)
                    last_msg = worker_state["messages"][-1]
                    break
                save_result = await asyncio.to_thread(self.logistics_save, worker_state)
                return {"logistics_result": save_result.get("logistics_result"),
                        "status_updates": save_result.get("status_updates", [])}

            elif worker_name == "event_agent":
                if state.get('trip_brief'):
                    from services.planning_events import planning_events
                    researched=await planning_events(state['trip_brief'])
                    worker_state['event_result']=researched
                    worker_state['feedback_on_work']=str(instructions)+'\nSERVER DATED EVENT SEARCH (data): '+json.dumps(researched)+'\nThese event dates are authoritative provider findings. Research dining and catalogue attractions too. Do not replace dated events with restaurants. Use get_planning_catalogue to read the database catalogue. Never invent missing events.'
                agent_result = await asyncio.to_thread(self.event_agent, worker_state)
                worker_state["messages"] = list(state["messages"]) + agent_result.get("messages", [])
                last_msg = worker_state["messages"][-1]
                rounds=0
                while hasattr(last_msg, "tool_calls") and last_msg.tool_calls and rounds<4:
                    rounds+=1
                    tool_node = ToolNode(tools=self.event_tools)
                    tool_result = await tool_node.ainvoke(worker_state)
                    for m in tool_result.get("messages", []):
                        worker_state["messages"].append(m)
                    agent_result = await asyncio.to_thread(self.event_agent, worker_state)
                    for m in agent_result.get("messages", []):
                        worker_state["messages"].append(m)
                    last_msg = worker_state["messages"][-1]
                save_result = await asyncio.to_thread(self.event_save, worker_state)
                return {"event_result": save_result.get("event_result"),
                        "status_updates": save_result.get("status_updates", [])}

            elif worker_name == "flight_agent":
                agent_result = await asyncio.to_thread(self.flight_agent, worker_state)
                worker_state["messages"] = list(state["messages"]) + agent_result.get("messages", [])
                last_msg = worker_state["messages"][-1]
                while hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                    tool_node = ToolNode(tools=self.flight_tools)
                    tool_result = await tool_node.ainvoke(worker_state)
                    for m in tool_result.get("messages", []):
                        worker_state["messages"].append(m)
                    agent_result = await asyncio.to_thread(self.flight_agent, worker_state)
                    for m in agent_result.get("messages", []):
                        worker_state["messages"].append(m)
                    last_msg = worker_state["messages"][-1]
                    break
                save_result = await asyncio.to_thread(self.flight_save, worker_state)
                return {"flight_result": save_result.get("flight_result"),
                        "status_updates": save_result.get("status_updates", [])}

            return {}

        # Custom events arrive before the fan-in node returns its combined state.
        from langgraph.config import get_stream_writer
        try:
            writer=get_stream_writer()
        except RuntimeError: # Direct offline tests outside a graph.
            writer=lambda event:None
        labels={'event_agent':'Event Agent: Finding places, experiences and dining...',
                'logistics_agent':'Logistics Agent: Connecting routes and travel times...',
                'accommodation_agent':'Accommodation Agent: Finding stays for your dates...',
                'flight_agent':'Flight Agent: Finding flight options for your journey...'}
        async def publish_worker(name):
            writer({'status_update':labels[name]})
            result=await run_worker(name)
            from domain.accessibility import annotate_candidates
            from services.accessibility_evidence import trusted_results
            if state.get('trip_brief'):
                if result.get('event_result'):result['event_result']=annotate_candidates(result['event_result'],state['trip_brief']['brief'])
                if result.get('accommodation_result'):result['accommodation_result']=trusted_results(result['accommodation_result'])
            for key in ['accommodation_result','event_result','logistics_result','flight_result']:
                if result.get(key):writer({'worker_result':(key,result[key])})
            for status in result.get('status_updates',[]):writer({'status_update':status})
            return result
        # Fan-out: run all workers concurrently
        tasks = [publish_worker(w) for w in workers]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Fan-in: merge all results into a single state update
        merged: Dict[str, Any] = {
            "status_updates": ["Orchestrator: Parallel research complete — synthesizing your itinerary..."],
            "next_worker": "trip_planner_agent",
            "feedback_on_work": "Compile ALL the research results just collected (flights, hotels, events, routes) into a premium day-by-day itinerary. Group activities geographically and save it to the database using save_trip_to_database.",
            "parallel_workers": None,  # Clear after use
        }

        for r in results:
            if isinstance(r, Exception):
                merged["status_updates"].append(f"Worker error: {str(r)}")
                continue
            if isinstance(r, dict):
                for key in ["accommodation_result", "logistics_result", "event_result", "flight_result"]:
                    if key in r and r[key]:
                        merged[key] = r[key]
                if "status_updates" in r:
                    merged["status_updates"] = merged["status_updates"] + r["status_updates"]

        return merged

    def parallel_dispatch_router(self, state: TripState) -> str:
        """After parallel dispatch, always route to trip_planner_agent."""
        return state.get("next_worker", "trip_planner_agent")

    # =========================================================================
    # ACCOMMODATION AGENT (Nuitee Hotel Specialist)
    # =========================================================================

    def accommodation_agent(self, state: TripState) -> Dict[str, Any]:
        """Specialist agent for hotel search, availability, prebooking, and confirmation."""
        instructions = state.get("feedback_on_work", "Find suitable hotels based on the user's requirements.")
        
        # Inject previously found hotels into context so the agent knows the hotelIds without searching again
        hotels_list = (state.get("accommodation_result") or {}).get("hotels", [])
        if not hotels_list:
            for msg in reversed(state["messages"]):
                if hasattr(msg, "content") and isinstance(msg.content, str):
                    try:
                        data = json.loads(msg.content)
                        if isinstance(data, dict) and "hotels" in data and isinstance(data["hotels"], list) and len(data["hotels"]) > 0:
                            hotels_list = data["hotels"]
                            break
                    except Exception:
                        pass
                elif hasattr(msg, "content") and isinstance(msg.content, dict) and "hotels" in msg.content:
                    hotels_list = msg.content.get("hotels", [])
                    if hotels_list:
                        break

        # Only inject known hotel IDs if the user is explicitly asking about rooms, booking, or hotel details!
        # If the user is asking to search hotels, do NOT inject them, so the agent performs a fresh search.
        last_user_msg = ""
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                last_user_msg = msg.content.lower()
                break

        is_room_or_detail_query = any(kw in last_user_msg for kw in ["room", "rooms", "book", "prebook", "rates", "rate", "availability", "reserve"])
        if hotels_list and is_room_or_detail_query:
            known_hotels = "\n".join([f"- {h['name']} (ID: {h.get('hotelId', '')})" for h in hotels_list if isinstance(h, dict) and 'name' in h])
            instructions += f"\n\nContext - Previously found hotels in this session:\n{known_hotels}\nIf the user asks about rooms or details for one of these, use its ID directly."

        system_message = prompts_workers.get_accommodation_prompt(now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"), instructions=instructions)
        messages = [SystemMessage(content=system_message)] + self._get_worker_messages(state, instructions)
        response = self.accom_llm.invoke(messages)
        
        status = "Accommodation Agent: Processing your request..."
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_name = response.tool_calls[0]["name"]
            if tool_name == "search_hotels":
                status = "Accommodation Agent: Searching Nuitee for luxury hotels..."
            elif tool_name in ["get_hotel_rooms", "search_for_availability"]:
                status = "Accommodation Agent: Fetching real-time room rates and availability..."
            elif tool_name == "makePrebook":
                status = "Accommodation Agent: Securely holding your room reservation..."
            elif tool_name in ["get_hotel_details", "get_hotel_reviews"]:
                status = "Accommodation Agent: Retrieving detailed property insights..."
            else:
                status = f"Accommodation Agent: Running {tool_name}..."

        return {
            "messages": [response],
            "status_updates": [status]
        }

    def accommodation_router(self, state: TripState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            # ONE STEP PER USER TURN:
            # If a hotel or room tool has already run in this turn, STOP and return to save.
            # Do NOT allow chaining search_hotels -> get_hotel_rooms in a single user turn!
            recent_tools = []
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    break
                if getattr(msg, "name", ""):
                    recent_tools.append(msg.name)

            if "search_hotels" in recent_tools or "get_hotel_rooms" in recent_tools or "makePrebook" in recent_tools:
                return "accom_save"
            return "accom_tools"
        else:
            return "accom_save"

    def accommodation_save(self, state: TripState) -> Dict[str, Any]:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        # Check if any recent tool messages contain live hotel rates
        tool_hotels = []
        tool_rooms = []
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                break
            if (state.get('planning_context') or {}).get('stage')=='hotels' and getattr(msg,'type','')!='tool':continue
            if hasattr(msg, "content") and isinstance(msg.content, str):
                try:
                    data = json.loads(msg.content)
                    if isinstance(data, dict):
                        if "hotels" in data and isinstance(data["hotels"], list) and len(data["hotels"]) > 0:
                            tool_hotels = data["hotels"] + tool_hotels
                        if "rooms" in data and isinstance(data["rooms"], list) and len(data["rooms"]) > 0:
                            tool_rooms = data["rooms"] + tool_rooms
                except Exception:
                    pass
            elif hasattr(msg, "content") and isinstance(msg.content, dict):
                tool_hotels = msg.content.get("hotels", []) + tool_hotels
                tool_rooms = msg.content.get("rooms", []) + tool_rooms

        # Safely get any existing hotels and rooms from state
        existing_result = state.get("accommodation_result") or {}
        existing_hotels = existing_result.get("hotels", [])
        existing_rooms = existing_result.get("rooms", [])

        # If existing_hotels is empty and tool_hotels is empty, scan history for earlier hotels
        if not tool_hotels and not existing_hotels:
            for msg in reversed(state["messages"]):
                if (state.get('planning_context') or {}).get('stage')=='hotels' and getattr(msg,'type','')!='tool':continue
                if hasattr(msg, "content") and isinstance(msg.content, str):
                    try:
                        data = json.loads(msg.content)
                        if isinstance(data, dict) and "hotels" in data and isinstance(data["hotels"], list) and len(data["hotels"]) > 0:
                            existing_hotels = data["hotels"]
                            break
                    except Exception:
                        pass
                elif hasattr(msg, "content") and isinstance(msg.content, dict) and "hotels" in msg.content:
                    existing_hotels = msg.content.get("hotels", [])
                    if existing_hotels:
                        break

        # --- LATENCY FIX: Extract conversational message directly from AI content ---
        # Instead of calling a second LLM to extract a "conversational_message",
        # we use the AI's last text output directly. This eliminates a redundant LLM call.
        conversational_message = content if content else "Here are the hotel options I found for you."
        
        # Extract prebook info from content if present
        prebook_id_extracted = None
        prebook_details_extracted = None
        if "[PREBOOK_ID:" in content:
            import re
            pid_match = re.search(r"\[PREBOOK_ID:\s*([^\]]+)\]", content)
            if pid_match:
                prebook_id_extracted = pid_match.group(1).strip()
            pd_match = re.search(r"\[PREBOOK_DETAILS:\s*(\{[^}]+\})\]", content)
            if pd_match:
                try:
                    prebook_details_extracted = json.loads(pd_match.group(1))
                except Exception:
                    pass

        parsed_dict = {
            "conversational_message": conversational_message,
            "hotels": tool_hotels if tool_hotels else existing_hotels,
            "rooms": tool_rooms if tool_rooms else existing_rooms,
            "prebook_id": prebook_id_extracted,
            "prebook_details": prebook_details_extracted,
        }

        updates = {
            "status_updates": ["Accommodation Agent: Analysis complete, returning to Orchestrator..."]
        }
        
        if prebook_id_extracted:
            updates["prebook_id"] = prebook_id_extracted
            
        if prebook_details_extracted:
            updates["prebook_details"] = prebook_details_extracted
            
        updates["accommodation_result"] = parsed_dict
        return updates

    # =========================================================================
    # LOGISTICS AGENT (UAE Transit Specialist)
    # =========================================================================

    def logistics_agent(self, state: TripState) -> Dict[str, Any]:
        """Specialist agent for UAE transit, routes, and transportation logistics."""
        instructions = state.get("feedback_on_work", "Research transportation and logistics for the user's trip.")

        system_message = prompts_workers.get_logistics_prompt(now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"), instructions=instructions)
        messages = [SystemMessage(content=system_message)] + self._get_worker_messages(state, instructions)
        response = self.logistics_llm.invoke(messages)
        
        status = "Logistics Agent: Analyzing travel requirements..."
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_name = response.tool_calls[0]["name"]
            if tool_name == "get_route_directions":
                status = "Logistics Agent: Mapping optimal transit routes..."
            elif tool_name == "estimate_taxi_fare":
                status = "Logistics Agent: Calculating local taxi fares..."
            elif tool_name == "get_uae_weather":
                status = "Logistics Agent: Checking live local weather conditions..."
            elif tool_name == "search_transit_rules":
                status = "Logistics Agent: Searching official UAE transit rules..."
            else:
                status = f"Logistics Agent: Running {tool_name}..."

        return {
            "messages": [response],
            "status_updates": [status]
        }

    def logistics_router(self, state: TripState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            # ONE-STEP GUARD: If any logistics tool has already run in this turn, STOP.
            # This prevents the agent from cascading through directions -> taxi -> weather -> rules.
            recent_tools = []
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage):
                    break
                if getattr(msg, "name", ""):
                    recent_tools.append(msg.name)

            logistics_tool_names = {"get_route_directions", "estimate_taxi_fare", "get_uae_weather", "search_transit_rules", "search_web_uae"}
            if any(t in logistics_tool_names for t in recent_tools):
                return "logistics_save"
            return "logistics_tools"
        else:
            return "logistics_save"

    def logistics_save(self, state: TripState) -> Dict[str, Any]:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        tool_routes = []
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                break
            if getattr(msg, "name", "") == "get_route_directions":
                try:
                    data = json.loads(msg.content)
                    if isinstance(data, dict) and "steps" in data:
                        route = {
                            "origin": data.get("start_address", "Origin"),
                            "destination": data.get("end_address", "Destination"),
                            "duration": data.get("duration_text", "Unknown"),
                            "distance": data.get("distance_text", "Unknown"),
                            "fare": "Unknown",
                            "steps": data.get("steps", [])
                        }
                        tool_routes = [route] + tool_routes
                except Exception:
                    pass

        # --- LATENCY FIX: Use AI content directly instead of second LLM call ---
        conversational_message = content if content else "Here are the transit options I found."

        parsed_dict = {
            "conversational_message": conversational_message,
            "routes": tool_routes,
        }
            
        return {
            "logistics_result": parsed_dict,
            "status_updates": ["Logistics Agent: Transit analysis complete, returning to Orchestrator..."]
        }

    # =========================================================================
    # EVENT AGENT (UAE Culture, Heritage & Portal Intelligence)
    # =========================================================================

    def event_agent(self, state: TripState) -> Dict[str, Any]:
        """Specialist agent for UAE events, heritage, culture, and live portal data."""
        instructions = state.get("feedback_on_work", "Research UAE events, attractions, and cultural activities.")

        system_message = prompts_workers.get_event_prompt(now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"), instructions=instructions)
        messages = [SystemMessage(content=system_message)] + self._get_worker_messages(state, instructions)
        response = self.event_llm.invoke(messages)
        
        status = "Event Agent: Analyzing request..."
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_name = response.tool_calls[0]["name"]
            if tool_name == "search_live_events":
                status = "Event Agent: Searching Ticketmaster for live events..."
            elif tool_name == "search_restaurants":
                status = "Event Agent: Finding top dining experiences..."
            else:
                status = f"Event Agent: Running {tool_name}..."

        return {
            "messages": [response],
            "status_updates": [status]
        }

    def event_router(self, state: TripState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "event_tools"
        else:
            return "event_save"

    def event_save(self, state: TripState) -> Dict[str, Any]:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        existing=state.get('event_result') or {}
        tool_events = list(existing.get('live_events',[]))
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                break
            if getattr(msg, "name", "") in ["search_live_events", "search_restaurants"]:
                try:
                    data = json.loads(msg.content)
                    if isinstance(data, dict) and "events" in data:
                        tool_events = data["events"] + tool_events
                except Exception:
                    pass

        # --- LATENCY FIX: Use AI content directly instead of second LLM call ---
        conversational_message = content if content else "Here are the events and experiences I found."

        parsed_dict = {
            "conversational_message": conversational_message,
            "events": sorted({item.get('place_id') or item.get('link') or item.get('name'):item for item in tool_events if isinstance(item,dict)}.values(),key=lambda item:item.get('kind')!='live_event'),
            **({"live_events":existing['live_events'],"event_search":existing['event_search']} if existing.get('event_search') else {}),
        }
            
        return {
            "event_result": parsed_dict,
            "status_updates": ["Event Agent: Research complete, returning to Orchestrator..."]
        }

    # =========================================================================
    # FLIGHT AGENT (Duffel API)
    # =========================================================================

    def flight_agent(self, state: TripState) -> Dict[str, Any]:
        """Specialist agent for flights using Duffel API."""
        instructions = state.get("feedback_on_work", "Research flight options.")
        prefs = json.dumps(state.get("user_preferences", {}))

        system_message = prompts_workers.get_flight_prompt(now=datetime.now().strftime("%Y-%m-%d %H:%M:%S"), instructions=instructions, user_preferences=prefs)
        messages = [SystemMessage(content=system_message)] + self._get_worker_messages(state, instructions)
        response = self.flight_llm.invoke(messages)
        
        status = "Flight Agent: Analyzing request..."
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_name = response.tool_calls[0]["name"]
            if tool_name == "search_flights":
                status = "Flight Agent: Searching global flight inventory (GDS/NDC)..."
            elif tool_name == "book_flight":
                status = "Flight Agent: Booking flight via Duffel Sandbox..."
            else:
                status = f"Flight Agent: Running {tool_name}..."

        return {
            "messages": [response],
            "status_updates": [status]
        }

    def flight_router(self, state: TripState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "flight_tools"
        else:
            return "flight_save"

    def flight_save(self, state: TripState) -> Dict[str, Any]:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        tool_flights = []
        tool_error = None
        for msg in reversed(state["messages"]):
            if isinstance(msg, HumanMessage):
                break
            if getattr(msg, "name", "") == "search_flights":
                try:
                    data = json.loads(msg.content)
                    if isinstance(data,dict) and data.get('error'):tool_error=str(data['error'])[:400]
                    if isinstance(data, dict) and "offers" in data:
                        tool_flights = data["offers"] + tool_flights
                except Exception:
                    pass

        # Preserve state if no new flights were fetched
        existing_result = state.get("flight_result") or {}
        existing_flights = existing_result.get("flights", [])

        if not tool_flights and not existing_flights:
            for msg in reversed(state["messages"]):
                if getattr(msg, "name", "") == "search_flights":
                    try:
                        data = json.loads(msg.content)
                        if isinstance(data, dict) and "offers" in data and isinstance(data["offers"], list) and len(data["offers"]) > 0:
                            existing_flights = data["offers"]
                            break
                    except Exception:
                        pass

        # --- LATENCY FIX: Use AI content directly instead of second LLM call ---
        conversational_message = content if content else "Here are the flight options I found."

        parsed_dict = {
            "conversational_message": conversational_message,
            "flights": tool_flights if tool_flights else existing_flights,
            **({"error":tool_error} if tool_error and not tool_flights else {}),
        }
                
        return {
            "flight_result": parsed_dict,
            "next_worker": "DONE"
        }

    # =========================================================================
    # TRIP PLANNER AGENT (Synthesizes & Saves Premium Trips)
    # =========================================================================

    def trip_planner_agent(self, state: TripState) -> Dict[str, Any]:
        """Agent that formats research into a premium itinerary and saves it to the database."""
        instructions = state.get("feedback_on_work") or "Format the collected research into a premium itinerary and save it."

        # Inject all collected worker results into the instructions so the trip planner
        # has access to the actual data even if it wasn't in the recent messages
        enriched_instructions = instructions
        from domain.time_travel_planning import planner_instructions
        enriched_instructions += planner_instructions(state.get('trip_brief'), seed=state.get('planning_run_id'))
        if state.get('trip_brief'):
            enriched_instructions+='\nValidated user choices (preserve dates and exact selection IDs): '+json.dumps(state['trip_brief'])
            enriched_instructions+='\nOnly USER-SELECTED shortlist stops may have selection_id. For recommended stops OMIT selection_id and supply place_id instead. Never copy a generated place ID into selection_id. Financial choices are already settled; do not choose different flights, hotels or rooms. Use the selected flight arrival/departure times and hotel as constraints, with no extra unquoted budget totals.'
        from domain.itinerary_validation import research_instructions,validation_failures,catalogue
        failures=validation_failures(state.get('messages',[]))
        if len(failures)>=3:
            return {'messages':[AIMessage(content='The proposed itinerary still needs your review before it can be saved.')],
                    'status_updates':['Planning needs your review: '+ '; '.join(item['message'] for item in failures[-1]['issues'][:3])]}
        enriched_instructions+=research_instructions(state)
        if state.get('trip_brief'):
            enriched_instructions+='\nInclude suitable provider-returned live events on their actual local dates with event_date and source_url, alongside attractions and dining. Events are not restaurants. If none fit, explain why in planning notes; never invent an event to fill a slot. Choose catalogue destinations around the traveller’s interests and geographic route, not all seven emirates by default. Include at most one fitting supported challenge each day when enabled. Sunset tasks should be scheduled in their server-estimated window; confirm access and weather.'
        if state.get('trip_brief'):
            from domain.accessibility import support_instructions, compatibility
            eligible=catalogue()
            eligible['places']=[p for p in eligible['places'] if not compatibility(p.get('accessibility'),state['trip_brief']['brief'])['conflicts']]
            enriched_instructions+=support_instructions(state['trip_brief']['brief'])
            enriched_instructions+='\nSERVER IDENTITY / CHALLENGE CATALOGUE: '+json.dumps(eligible)
            enriched_instructions+='\nSave exactly the inclusive number of travel days, numbered 1..N. Include every must-visit with its exact selection_id and correct place_id/product_id. Explain each omitted optional selection via omissions. Give start_time/end_time or duration_minutes when known and allow travel gaps. Never manufacture opening hours, event dates, facility verification or reward points. Only catalogue-supported optional challenges are allowed, at most one per day. Tool validation_error is NOT a save: repair its issues and retry, up to two repairs.'
            if failures:enriched_instructions+='\nREPAIR THESE SERVER VALIDATION ISSUES: '+json.dumps(failures[-1]['issues'])

        system_message = prompts_orchestrator.get_trip_planner_prompt(instructions=enriched_instructions)
        messages = [SystemMessage(content=system_message)] + self._get_worker_messages(state, instructions)
        response = self.trip_planner_llm.invoke(messages)
        
        status = "Trip Planner: Crafting your itinerary..."
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_name = response.tool_calls[0]["name"]
            if tool_name == "save_trip_to_database":
                status = "Trip Planner: Saving new trip to your dashboard..."
            elif tool_name == "update_trip_in_database":
                status = "Trip Planner: Updating your trip customizations..."
            elif tool_name == "get_trip_from_database":
                status = "Trip Planner: Fetching existing trip data..."
            elif tool_name == "search_portal_knowledge":
                status = "Trip Planner: Searching official UAE portal for insights..."
            else:
                status = f"Trip Planner: Running {tool_name}..."

        return {
            "messages": [response],
            "status_updates": [status]
        }
        
    def trip_planner_router(self, state: TripState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "trip_planner_tools"
        else:
            return "trip_planner_save"
            
    def trip_planner_save(self, state: TripState) -> Dict[str, Any]:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        from domain.planning import saved_trip_identity
        saved_id=None
        for msg in reversed(state['messages']):
            if getattr(msg,'name','') in {'save_trip_to_database','update_trip_in_database'}:
                saved_id=saved_trip_identity(msg.content)
                break
        if not saved_id:
            from domain.itinerary_validation import validation_failures
            failures=validation_failures(state.get('messages',[]))
            content=('Planning needs your review: '+ '; '.join(item['message'] for item in failures[-1]['issues'][:3])) if failures else 'Your itinerary could not be saved. Please retry before treating this trip as ready.'
        return {'trip_planner_result':content,'saved_trip_id':saved_id,
                'status_updates':['Trip saved to your dashboard.' if saved_id else content]}

    # =========================================================================
    # GRAPH CONSTRUCTION
    # =========================================================================

    async def build_graph(self):
        """Build the multi-agent StateGraph with Orchestrator -> Workers -> Tools loops."""
        g = StateGraph(TripState)

        # --- Nodes ---
        g.add_node("orchestrator", self.orchestrator)
        g.add_node("parallel_dispatch", self.parallel_dispatch)

        # Accommodation pipeline
        g.add_node("accommodation_agent", self.accommodation_agent)
        g.add_node("accom_tools", ToolNode(tools=self.accom_tools))
        g.add_node("accom_save", self.accommodation_save)

        # Logistics pipeline
        g.add_node("logistics_agent", self.logistics_agent)
        g.add_node("logistics_tools", ToolNode(tools=self.logistics_tools))
        g.add_node("logistics_save", self.logistics_save)

        # Event pipeline
        g.add_node("event_agent", self.event_agent)
        g.add_node("event_tools", ToolNode(tools=self.event_tools))
        g.add_node("event_save", self.event_save)
        
        # Flight pipeline
        g.add_node("flight_agent", self.flight_agent)
        g.add_node("flight_tools", ToolNode(tools=self.flight_tools))
        g.add_node("flight_save", self.flight_save)
        
        # Trip Planner pipeline
        g.add_node("trip_planner_agent", self.trip_planner_agent)
        g.add_node("trip_planner_tools", ToolNode(tools=self.orchestrator_tools))
        g.add_node("trip_planner_save", self.trip_planner_save)

        # --- Edges ---

        # Entry point
        g.add_edge(START, "orchestrator")

        # Orchestrator routes to workers, parallel dispatch, or END
        g.add_conditional_edges("orchestrator", self.orchestrator_router, {
            "accommodation_agent": "accommodation_agent",
            "logistics_agent": "logistics_agent",
            "event_agent": "event_agent",
            "flight_agent": "flight_agent",
            "trip_planner_agent": "trip_planner_agent",
            "parallel_dispatch": "parallel_dispatch",
            "END": END,
        })

        # Parallel dispatch routes back to orchestrator (which will then route to trip_planner)
        g.add_conditional_edges("parallel_dispatch", self.parallel_dispatch_router, {
            "trip_planner_agent": "trip_planner_agent",
            "DONE": END,
        })

        # Accommodation: agent -> tools loop, then save -> orchestrator
        g.add_conditional_edges("accommodation_agent", self.accommodation_router, {
            "accom_tools": "accom_tools",
            "accom_save": "accom_save",
        })
        g.add_edge("accom_tools", "accommodation_agent")
        g.add_edge("accom_save", "orchestrator")

        # Logistics: agent -> tools loop, then save -> orchestrator
        g.add_conditional_edges("logistics_agent", self.logistics_router, {
            "logistics_tools": "logistics_tools",
            "logistics_save": "logistics_save",
        })
        g.add_edge("logistics_tools", "logistics_agent")
        g.add_edge("logistics_save", "orchestrator")

        # Event: agent -> tools loop, then save -> orchestrator
        g.add_conditional_edges("event_agent", self.event_router, {
            "event_tools": "event_tools",
            "event_save": "event_save",
        })
        g.add_edge("event_tools", "event_agent")
        g.add_edge("event_save", "orchestrator")

        # Flight: agent -> tools loop, then save -> orchestrator
        g.add_conditional_edges("flight_agent", self.flight_router, {
            "flight_tools": "flight_tools",
            "flight_save": "flight_save",
        })
        g.add_edge("flight_tools", "flight_agent")
        g.add_edge("flight_save", "orchestrator")

        # Trip Planner: agent -> tools loop, then save -> orchestrator
        g.add_conditional_edges("trip_planner_agent", self.trip_planner_router, {
            "trip_planner_tools": "trip_planner_tools",
            "trip_planner_save": "trip_planner_save",
        })
        g.add_edge("trip_planner_tools", "trip_planner_agent")
        g.add_edge("trip_planner_save", "orchestrator")

        # Compile with checkpointer for memory persistence
        self.graph = g.compile(checkpointer=self.memory)

    # =========================================================================
    # EXECUTION
    # =========================================================================

    async def run_stream(self, message, history=None, user_id=None, user_preferences=None, trip_brief=None, planning_run_id=None, planning_lease_token=None, planning_context=None):
        # Execute a full conversation step through the multi-agent graph as an async generator.
        time_travel_seed = str(planning_run_id or uuid.uuid4())
        config = {
            "configurable": {"thread_id": checkpoint_thread(user_id, self.masar_ai_id), "user_id": user_id, "trip_brief": trip_brief, "planning_run_id": planning_run_id, "planning_lease_token": planning_lease_token, "time_travel_seed": time_travel_seed},
            "recursion_limit": 50
        }

        # Only pass the NEW state delta. LangGraph reducers will merge this into the persisted state.
        # We explicitly clear previous worker results so they don't leak into the new turn.
        new_msg = [HumanMessage(content=message)] if isinstance(message, str) else message
        
        state_update = {
            "messages": new_msg,
            "user_preferences": user_preferences,
            "trip_brief": trip_brief,
            "planning_run_id": time_travel_seed,
            "planning_context": planning_context,
            "plan": None,
            "current_step": None,
            "next_worker": None,
            "parallel_workers": None,
            "accommodation_result": None,
            "logistics_result": None,
            "event_result": None,
            "flight_result": None,
            "trip_planner_result": None,
            "saved_trip_id": None,
            "prebook_id": None,
            "prebook_details": None,
            "feedback_on_work": None,
            "itinerary_complete": False,
            "user_input_needed": False,
            "status_updates": ["Analyzing your request..."],
        }

        if planning_context:
            selected=planning_context.get('selected',{})
            if selected.get('flight'):state_update['flight_result']={'flights':[selected['flight']]}
            if selected.get('room'):state_update['accommodation_result']={'hotels':[selected['hotel']],'rooms':[selected['room']]}
        yield {"status_update": state_update["status_updates"][0]}

        final_state = None

        # Fetch current state to see if we need to hydrate from DB history
        try:
            curr = await self.graph.aget_state(config)
            final_state = dict(curr.values) if curr and hasattr(curr, 'values') else {}
            
            # If memory was wiped (e.g. server restart) but we have DB history, inject it!
            if not final_state.get("messages") and history:
                state_update["messages"] = history + new_msg
        except Exception:
            final_state = {}
            if history:
                state_update["messages"] = history + new_msg
            
        final_state.update(state_update)

        delivered_research=set()
        def research_identity(key,value):
            return (key,json.dumps(value,sort_keys=True,default=str))
        async for mode, output in self.graph.astream(state_update, config=config, stream_mode=["updates","custom"]):
            if mode=="custom":
                if output.get('worker_result'):
                    key,value=output['worker_result']
                    delivered_research.add(research_identity(key,value))
                yield output
                continue
            for node_name, node_state in output.items():
                for k, v in node_state.items():
                    if k == "messages":
                        final_state["messages"] = final_state["messages"] + v
                    elif k == "status_updates":
                        final_state["status_updates"] = final_state["status_updates"] + v
                    else:
                        final_state[k] = v

                if node_state.get("status_updates"):
                    for status in node_state["status_updates"]:
                        yield {"status_update": status}

                for result_key in ["accommodation_result", "logistics_result", "event_result", "flight_result"]:
                    if result_key in node_state and node_state[result_key]:
                        identity=research_identity(result_key,node_state[result_key])
                        if identity not in delivered_research:
                            delivered_research.add(identity)
                            yield {"worker_result": (result_key, node_state[result_key])}

        # Extract final response
        final_response = ""
        for msg in reversed(final_state["messages"]):
            if isinstance(msg, AIMessage) and msg.content:
                final_response = msg.content
                break

        yield {
            "final": True,
            "response": final_response,
            "saved_trip_id": final_state.get("saved_trip_id"),
            "itinerary_complete": final_state.get("itinerary_complete", False),
            "user_input_needed": final_state.get("user_input_needed", False),
            "plan": final_state.get("plan"),
            "prebook_id": final_state.get("prebook_id"),
            "prebook_details": final_state.get("prebook_details"),
            "events": final_state.get("event_result", {}).get("events") if final_state.get("event_result") else None,
            "hotels": final_state.get("accommodation_result", {}).get("hotels") if final_state.get("accommodation_result") else None,
            "flights": final_state.get("flight_result", {}).get("flights") if final_state.get("flight_result") else None,
            "history": [
                {"role": msg.type, "content": msg.content}
                for msg in final_state["messages"]
                if hasattr(msg, "type") and hasattr(msg, "content") and msg.content
            ]
        }

    async def run_superstep(self, message, history=None, user_id=None):
        # Execute a full conversation step (Batch mode).
        config = {
            "configurable": {"thread_id": checkpoint_thread(user_id, self.masar_ai_id), "user_id": user_id},
            "recursion_limit": 50
        }
        state = {
            "messages": [HumanMessage(content=message)] if isinstance(message, str) else message,
            "plan": None,
            "current_step": None,
            "next_worker": None,
            "parallel_workers": None,
            "accommodation_result": None,
            "logistics_result": None,
            "event_result": None,
            "flight_result": None,
            "itinerary_complete": False,
            "user_input_needed": False,
            "feedback_on_work": None,
            "prebook_id": None,
            "prebook_details": None,
            "status_updates": [],
        }

        result = await self.graph.ainvoke(state, config=config)

        final_response = ""
        for msg in reversed(result["messages"]):
            if isinstance(msg, AIMessage) and msg.content:
                final_response = msg.content
                break

        return {
            "response": final_response,
            "itinerary_complete": result.get("itinerary_complete", False),
            "user_input_needed": result.get("user_input_needed", False),
            "plan": result.get("plan"),
            "status_updates": result.get("status_updates", []),
            "worker_results": {
                "accommodation": result.get("accommodation_result"),
                "logistics": result.get("logistics_result"),
                "events": result.get("event_result"),
            },
        }

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _format_conversation(self, messages: List[Any]) -> str:
        # Formats the conversation messages into a readable string for the Orchestrator.
        formatted = ""
        for message in messages:
            if isinstance(message, HumanMessage):
                formatted += f"User: {message.content}\n"
            elif isinstance(message, AIMessage) and message.content:
                formatted += f"Assistant: {message.content}\n"
        return formatted or "No conversation history yet."

    def _get_worker_messages(self, state: TripState, instructions: str) -> List[Any]:
        # 1. Give the worker recent conversational context so it doesn't forget user details (cities, dates)
        context = []
        for msg in state["messages"][-6:]:
            if isinstance(msg, HumanMessage):
                context.append(msg)
            elif isinstance(msg, AIMessage) and not getattr(msg, "tool_calls", None):
                context.append(msg)

        # 2. Extract the current tool execution loop (if the worker just called a tool)
        worker_loop = []
        for msg in reversed(state["messages"]):
            if isinstance(msg, (AIMessage, ToolMessage)):
                if isinstance(msg, AIMessage) and not getattr(msg, "tool_calls", None):
                    break
                worker_loop.insert(0, msg)
            else:
                break

        # Combine context, orchestrator instructions, and the active tool loop
        from config.localization import response_language_instruction
        locale=(state.get('user_preferences') or {}).get('response_locale', 'en')
        language_context=[SystemMessage(content=response_language_instruction(locale))] if locale in {'ar','hi'} else []
        return language_context + context + [HumanMessage(content=f"SYSTEM INSTRUCTIONS FOR THIS TURN:\n{instructions}")] + worker_loop
