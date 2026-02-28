# Standard libraries
import os
import sys
import json
import asyncio
import argparse
import tempfile
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv

# Third-party libraries
from pydantic import BaseModel
from openai import OpenAI
import speech_recognition as sr
import pyttsx3
import edge_tts
from pygame import mixer

# Load environment variables
load_dotenv()

# UI System
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.markdown import Markdown

console = Console()

# --- CONFIGURATION ---
OPENROUTER_API_KEY = os.getenv("GROK_API_KEY")
# Switching to Llama 3.3 70B for superior multilingual performance
MODEL = "meta-llama/llama-3.3-70b-instruct" 

class BatterySample(BaseModel):
    id: str
    chemistry: str
    capacity_kwh: float
    soh_pct: float
    cycles: int
    age_years: float
    rul_estimate_years: Optional[float] = None

class UIOrchAgent:
    def __init__(self):
        if not OPENROUTER_API_KEY:
            console.print("[bold red]Error:[/] GROK_API_KEY (or OpenRouter Key) not set.")
            sys.exit(1)
        
        self.client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1"
        )
        self.samples_file = "samples.json"
        self.recognizer = sr.Recognizer()

    async def speak(self, text: str):
        """High-speed Neural TTS with support for 11+ languages."""
        clean_text = text.replace('*', '').replace('#', '').replace('`', '').strip()
        if not clean_text: return

        # Language Voice Mapping
        # Mapping based on Unicode ranges for major Indian languages
        voice = "en-IN-PrabhatNeural" # Default English (India)
        
        # Heuristic Language Detection
        if any('\u0b80' <= c <= '\u0bff' for c in clean_text): voice = "ta-IN-PallaviNeural"   # Tamil
        elif any('\u0900' <= c <= '\u097f' for c in clean_text): voice = "hi-IN-MadhurNeural"    # Hindi
        elif any('\u0d00' <= c <= '\u0d7f' for c in clean_text): voice = "ml-IN-MidhunNeural"    # Malayalam
        elif any('\u0c00' <= c <= '\u0c7f' for c in clean_text): voice = "te-IN-MohanNeural"     # Telugu
        elif any('\u0c80' <= c <= '\u0cff' for c in clean_text): voice = "kn-IN-GaganNeural"     # Kannada
        elif any('\u0980' <= c <= '\u09ff' for c in clean_text): voice = "bn-IN-BashkarNeural"   # Bengali
        elif any('\u0a00' <= c <= '\u0a7f' for c in clean_text): voice = "pa-IN-AnmolNeural"     # Punjabi
        elif any('\u0a80' <= c <= '\u0aff' for c in clean_text): voice = "gu-IN-NiranjanNeural"  # Gujarati
        elif any('\u0900' <= c <= '\u097f' for c in clean_text) and "। " not in clean_text: 
            # Marathi often shares Hindi range but has slight variations, simplified here
            # For better Marathi detection, we can check for specific characters like ळ
            if any(c == '\u0933' for c in clean_text): voice = "mr-IN-ManoharNeural"
        
        # Urdu uses Arabic script range
        if any('\u0600' <= c <= '\u06ff' for c in clean_text): voice = "ur-IN-SalmanNeural" # Urdu

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as fp:
                temp_path = fp.name
            
            # Increase speech speed by 20% for faster delivery as requested
            communicate = edge_tts.Communicate(clean_text, voice, rate="+20%")
            await communicate.save(temp_path)
            
            mixer.init()
            mixer.music.load(temp_path)
            mixer.music.play()
            while mixer.music.get_busy():
                await asyncio.sleep(0.05)
            mixer.quit()
            
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        except Exception as e:
            pass

    def listen(self) -> Optional[str]:
        """Capture audio from microphone and convert to text."""
        # We use a broad 'en-IN' code which helps with mixed-language Indian inputs
        # or it can be switched per-language if requested.
        with sr.Microphone() as source:
            console.print("\n[bold green]🎤 Listening...[/] (Speak in any Indian language)")
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                audio = self.recognizer.listen(source, timeout=7, phrase_time_limit=10)
                console.print("[bold blue]🔄 Processing...[/]")
                # Google STT is exceptionally good at mixed-language detection in India context
                text = self.recognizer.recognize_google(audio, language="en-IN")
                console.print(f"[bold cyan]You said:[/] [italic]{text}[/]")
                return text
            except Exception:
                return None

    def add_sample(self):
        samples = [
            BatterySample(id="BAT-001", chemistry="LFP", capacity_kwh=40.0, soh_pct=85.0, cycles=1200, age_years=3.5, rul_estimate_years=4.5),
            BatterySample(id="BAT-002", chemistry="NMC", capacity_kwh=60.0, soh_pct=72.0, cycles=800, age_years=4.2, rul_estimate_years=2.1),
            BatterySample(id="BAT-003", chemistry="LFP", capacity_kwh=15.0, soh_pct=55.0, cycles=2500, age_years=6.0, rul_estimate_years=1.0),
        ]
        with open(self.samples_file, "w") as f:
            json.dump([s.model_dump() for s in samples], f, indent=4)
        console.print(Panel("[bold green]Success:[/] Battery inventory refreshed."))

    def load_samples(self) -> List[BatterySample]:
        if not os.path.exists(self.samples_file): return []
        with open(self.samples_file, "r") as f:
            data = json.load(f)
            return [BatterySample(**s) for s in data]

    async def run_query(self, user_input: str, voice_enabled: bool):
        samples = self.load_samples()
        samples_ctx = json.dumps([s.model_dump() for s in samples])

        prompt = f"""
        User Query: {user_input}
        Inventory Data: {samples_ctx}
        
        Strict Guidelines:
        1. If user asks for a specific battery (e.g. '001', 'battery 2'), provide FULL data: ID, Chemistry, Capacity, SoH, Cycles, Age, and RUL estimate.
        2. NATURAL LANGUAGE FLOW (CRITICAL): 
           - Avoid using brackets like ( ) in your response. 
           - Instead of 'நிச்சயிக்கப்பட்ட ஆயுட்காலம் (ஆண்டுகள்): 2.1', write 'மதிப்பிடப்பட்ட எஞ்சிய ஆயுட்காலம்: 2.1 ஆண்டுகள்'.
           - Use natural sentence structures rather than "Label: Value" formats.
        3. INTENT-BASED LANGUAGE: Identify the language intended by the user. 
           - If they type in Roman script but use Hindi words (e.g., 'kae baarae mae'), respond in HINDI (Devanagari script).
           - If they type in 'Tanglish' (e.g., 'pathi sollu'), respond in TAMIL script.
           - Support all 11 languages: Telugu, Urdu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Tamil, English, Hindi, Malayalam.
        4. NO MIXING: The response must be 100% in the target language's native script.
        5. NO English labels in non-English responses. Translate labels like 'Capacity' to the target language.
        6. Do not prefix the answer with phrases like "Sure, here it is". Start directly.
        """

        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as progress:
            progress.add_task(description="Agent Orchestrating...", total=None)
            try:
                response = self.client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {"role": "system", "content": "You are an expert EV Battery AI. You speak 11+ Indian languages including Telugu, Urdu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Tamil, English, Hindi, and Malayalam fluently. You never mix languages."},
                        {"role": "user", "content": prompt}
                    ]
                )
                content = response.choices[0].message.content
            except Exception as e:
                content = f"Error: {e}"

        console.print(Panel(Markdown(content), title="Analysis", border_style="green"))
        if voice_enabled:
            await self.speak(content)

    async def start(self):
        console.print(Panel.fit("[bold blue]🔋 Advanced EV Battery Orchestrator 🔋[/]", subtitle=f"Llama 3 Multi-lingual | High-Speed TTS"))
        
        if not os.path.exists(self.samples_file): self.add_sample()
        
        # Display Table
        samples = self.load_samples()
        table = Table(title="Live Inventory Management")
        table.add_column("ID", style="cyan")
        table.add_column("Chemistry", style="magenta")
        table.add_column("Status (SoH)", justify="right")
        table.add_column("RUL (Yrs)", justify="right")
        for s in samples:
            table.add_row(s.id, s.chemistry, f"{s.soh_pct}%", f"{s.rul_estimate_years}")
        console.print(table)

        console.print("\n[bold yellow]Interaction Mode:[/]\n1. Text Mode\n2. Voice Mode (Multi-lingual)")
        mode = console.input("\n[bold cyan]Select (1 or 2): [/]").strip()
        voice_on = (mode == "2")

        if voice_on:
            console.print("[bold green]Voice Mode Active.[/] (English, Tamil, Hindi, Malayalam)")
            while True:
                q = self.listen()
                if q:
                    if any(x in q.lower() for x in ["exit", "stop", "quit"]): break
                    await self.run_query(q, voice_enabled=True)
        else:
            console.print("[bold green]Text Mode Active.[/] (Voice Output Enabled)")
            while True:
                q = console.input("\n[bold cyan]Query (exit to quit) > [/]").strip()
                if q.lower() == "exit": break
                # Even in text mode, we enable voice output so the agent "explains" the answer
                if q: await self.run_query(q, voice_enabled=True)

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--add-sample", action="store_true")
    args = parser.parse_args()
    
    agent = UIOrchAgent()
    if args.add_sample:
        agent.add_sample()
    else:
        await agent.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[red]Closed.[/]")