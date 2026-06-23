from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from database import Base


class Items(Base):
    __tablename__ = 'items'

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

