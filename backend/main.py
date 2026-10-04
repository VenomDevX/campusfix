from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import UPLOAD_DIR, Base, SessionLocal, engine
from models import Issue
from routers import analytics, auth, issues, notifications
from services import vision_model
from services.auth import csrf_guard
from services.priority_engine import LOCATIONS


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    vision_model.warm_up_async()  # load CLIP on the GPU in the background
    with SessionLocal() as db:
        if db.query(Issue).count() == 0:
            from seed import seed
            seed(db)
    yield


app = FastAPI(title="CampusFix AI", version="1.1.0", lifespan=lifespan, dependencies=[Depends(csrf_guard)],
              description="See it. Snap it. Solve it. - AI-powered campus maintenance API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
                   allow_methods=["*"], allow_headers=["*"])
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(auth.router)
app.include_router(issues.router)
app.include_router(analytics.router)
app.include_router(analytics.public)
app.include_router(notifications.router)


@app.get("/api/health")
def health():
    m = vision_model._model  # don't block on loading
    return {"status": "ok", "model": m.name if m else ("loading" if vision_model.enabled() else "Heuristic (rules)")}


@app.get("/api/locations")
def locations():
    return [{"name": k, "traffic": v[0]} for k, v in LOCATIONS.items()]
