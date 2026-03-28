from __future__ import annotations

import secrets
import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
)
from sqlalchemy.ext.asyncio import AsyncSession
from .main import Base
from sqlalchemy.future import select



class DomainStatus:
    pending = "pending"
    active = "active"
    revoked = "revoked"


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True)
    domain = Column(String(255), unique=True, nullable=False, index=True)
    owner = Column(String(255), nullable=True)
    token = Column(String(64), nullable=False, unique=True, index=True)
    status = Column(String(20), default=DomainStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    @classmethod
    async def create(cls, session: AsyncSession, domain: str, owner: Optional[str] = None) -> "Domain":
        token = secrets.token_urlsafe(16)
        obj = cls(domain=domain, owner=owner, token=token, status=DomainStatus.pending)
        session.add(obj)
        await session.flush()
        return obj

    @classmethod
    async def get_by_domain(cls, session: AsyncSession, domain: str) -> Optional["Domain"]:
        q = select(cls).where(cls.domain == domain)
        res = await session.execute(q)
        return res.scalars().first()

    @classmethod
    async def get_by_token(cls, session: AsyncSession, token: str) -> Optional["Domain"]:
        q = select(cls).where(cls.token == token)
        res = await session.execute(q)
        return res.scalars().first()
