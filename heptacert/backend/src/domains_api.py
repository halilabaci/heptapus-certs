from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional
import dns.resolver
import logging

from .main import SessionLocal
from .domains import Domain

logger = logging.getLogger("heptacert.domains")

router = APIRouter()


class DomainCreateIn(BaseModel):
    domain: str
    owner: Optional[str] = None


class DomainOut(BaseModel):
    id: int
    domain: str
    owner: Optional[str]
    status: str
    token: str


@router.post("/api/domains", response_model=DomainOut)
async def create_domain(payload: DomainCreateIn):
    async with SessionLocal() as db:
        exists = await Domain.get_by_domain(db, payload.domain)
        if exists:
            raise HTTPException(status_code=409, detail="Domain already exists")
        dom = await Domain.create(db, payload.domain, owner=payload.owner)
        await db.commit()
        await db.refresh(dom)
        return DomainOut(id=dom.id, domain=dom.domain, owner=dom.owner, status=dom.status, token=dom.token)


@router.get("/api/domains/{domain}/check")
async def check_domain(domain: str):
    """Check DNS TXT for verification token. If found, activate domain."""
    async with SessionLocal() as db:
        d = await Domain.get_by_domain(db, domain)
        if not d:
            raise HTTPException(status_code=404, detail="Domain not found")
        # TXT record name
        txt_name = f"_heptacert-verify.{domain}"
        try:
            answers = dns.resolver.resolve(txt_name, "TXT", lifetime=5)
            tokens = []
            for r in answers:
                for s in r.strings:
                    # dns.resolver returns bytes strings
                    tokens.append(s.decode() if isinstance(s, bytes) else str(s))

            if d.token in tokens:
                d.status = "active"
                db.add(d)
                await db.commit()
                return {"status": "active"}
            else:
                return {"status": d.status}
        except Exception as exc:
            logger.debug("DNS check failed for %s: %s", domain, exc)
            return {"status": d.status}


@router.get("/.internal/caddy/authorize")
async def caddy_authorize(domain: Optional[str] = Query(None)):
    """Caddy ask endpoint. Returns 200 if domain is authorized."""
    if not domain:
        raise HTTPException(status_code=400, detail="missing domain")
    async with SessionLocal() as db:
        d = await Domain.get_by_domain(db, domain)
        if d and d.status == "active":
            return {"authorized": True}
        raise HTTPException(status_code=403, detail="unauthorized")
