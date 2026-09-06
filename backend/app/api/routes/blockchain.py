from typing import List
from fastapi import APIRouter
from backend.app.schemas.schemas import BlockchainBlockResponse, BlockchainVerifyResponse, TamperTestResponse
from backend.app.services.blockchain.chain import BlockchainLedger

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])

@router.get("", response_model=List[BlockchainBlockResponse])
async def get_blockchain():
    blocks = await BlockchainLedger.get_all_blocks()
    if not blocks:
        # Initialize genesis block if empty
        await BlockchainLedger.append_event("GENESIS_INIT", {"system": "NEXORA"})
        blocks = await BlockchainLedger.get_all_blocks()
    return blocks

@router.post("/verify", response_model=BlockchainVerifyResponse)
async def verify_blockchain():
    is_valid, tampered_idx, msg = await BlockchainLedger.validate_chain()
    blocks = await BlockchainLedger.get_all_blocks()
    return BlockchainVerifyResponse(
        is_valid=is_valid,
        total_blocks=len(blocks),
        tampered_block_index=tampered_idx,
        message=msg
    )

from backend.app.core.config import settings
from fastapi import HTTPException

@router.post("/tamper-test", response_model=TamperTestResponse)
async def live_tamper_demonstration():
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Tamper testing is disabled in production")
    result = await BlockchainLedger.simulate_tamper_demonstration()
    return TamperTestResponse(**result)

