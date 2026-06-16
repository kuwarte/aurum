#!/usr/bin/env python3
"""
GROQ API CONNECTIVITY TEST

This script tests connectivity to the GROQ API using the ChatGroq client
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
print(f"API Key loaded: {api_key[:20]}..." if api_key else "API Key NOT FOUND")

try:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=api_key
    )
    
    response = llm.invoke([HumanMessage(content='Say "hello" in JSON: {"message": "hello"}')])
    print(f"\n[/] Groq API working!")
    print(f"Response: {response.content}")
    
except Exception as e:
    print(f"\n[x] Groq API failed: {e}")
