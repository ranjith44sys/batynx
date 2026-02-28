import os
import sys
import json
import logging
import asyncio
from typing import List
from dotenv import load_dotenv
from colorama import Fore, Style, init

# Core Logic
from app.agent.graph import build_graph
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()
logging.basicConfig(level=logging.ERROR)
init(autoreset=True)

class UnifiedOrchestratorCLI:
    def __init__(self):
        self.graph = build_graph()

    async def run(self):
        print(f"\n{Fore.CYAN}{Style.BRIGHT}🔋 Advanced EV Battery Orchestrator 🔋")
        print(f"{Fore.YELLOW}Sequential Multi-Agent Analysis | Clean Terminal Mode\n")
        
        messages = []
        state = {
            "messages": messages, 
            "awaiting_confirmation": False,
            "battery_id": None,
            "recommendations": [],
            "health_report": {},
            "risk_report": {},
            "sustainability_report": {},
            "market_report": {},
            "trade_details": {}
        }

        print(f"{Fore.GREEN}Ready! Examples of what you can ask:")
        print(" - Recommendation: 'Recommend a battery for an electric scooter with long life.'")
        print(" - Assessment: 'Check health and sustainability of battery BATT-HG-101.'")
        print(" - Order: 'I want to buy battery BATT-HG-101 for my solar kit.'\n")

        while True:
            try:
                question = input(f"{Fore.WHITE}{Style.BRIGHT}You (exit to quit) > ").strip()
                
                if not question: continue
                if question.lower() in ["exit", "quit", "/exit", "/quit"]:
                    print(f"{Fore.YELLOW}Shutting down orchestrator... Goodbye!")
                    break

                # Prepare state
                user_msg = HumanMessage(content=question)
                messages.append(user_msg)
                state["messages"] = messages
                state["question"] = question
                
                print(f"{Fore.MAGENTA}⠋ Orchestrating agents (Health, Risk, Sustainability, Market)...")
                
                # Use asyncio for potential non-blocking calls if needed, 
                # though graph.invoke is usually synchronous in this setup
                result = self.graph.invoke(state)

                # Update state
                state.update(result)
                answer = result.get("answer", "Analysis complete.")
                
                # Persist AI response
                ai_msg = AIMessage(content=answer)
                messages.append(ai_msg)
                state["messages"] = messages
                
                # Output answer
                print(f"\n{Fore.GREEN}{'='*60}")
                print(f"{Fore.CYAN}{answer}")
                print(f"{Fore.GREEN}{'='*60}\n")

            except KeyboardInterrupt:
                print(f"\n{Fore.RED}Interrupted by user. Exiting...")
                break
            except Exception as e:
                print(f"{Fore.RED}System Error: {e}")

async def main():
    cli = UnifiedOrchestratorCLI()
    await cli.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
