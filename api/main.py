from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.assess import router as assess_router
from routers.oracle import router as oracle_router
from routers.cron import router as cron_router

load_dotenv()

app = FastAPI(title="Aurum API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assess_router)
app.include_router(oracle_router)
app.include_router(cron_router)

@app.get("/health")
def health():
    return {"status": "ok"}
