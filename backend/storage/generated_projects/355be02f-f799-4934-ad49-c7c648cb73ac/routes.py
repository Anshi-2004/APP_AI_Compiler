from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import RoleChecker, get_current_user
import models

router = APIRouter(prefix='/api/v1', tags=['Generated Endpoints'])

@router.get('/items', dependencies=[Depends(RoleChecker(['admin', 'user']))])
async def get_items(db: AsyncSession = Depends(get_db)):
    return {'message': 'Success', 'endpoint': '/items'}

