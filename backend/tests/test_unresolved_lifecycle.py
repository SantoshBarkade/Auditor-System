import pytest
from backend.app.models.unresolved import UnresolvedCase, UnresolvedStatus, FinalVerdict
from backend.app.services.unresolved.lifecycle import UnresolvedLifecycle, InvalidStateTransition

@pytest.mark.asyncio
async def test_lifecycle_valid_transitions():
    class DummySession:
        def add(self, obj):
            pass
    
    session = DummySession()
    case = UnresolvedCase(id=1, status=UnresolvedStatus.OPEN)
    
    # OPEN -> ANALYZING
    history1 = await UnresolvedLifecycle.transition(session, case, UnresolvedStatus.ANALYZING, "SYSTEM", "TEST")
    assert case.status == UnresolvedStatus.ANALYZING
    assert history1.previous_status == UnresolvedStatus.OPEN
    assert history1.new_status == UnresolvedStatus.ANALYZING
    
    # ANALYZING -> AWAITING_REVIEW
    history2 = await UnresolvedLifecycle.transition(session, case, UnresolvedStatus.AWAITING_REVIEW, "SYSTEM", "TEST")
    assert case.status == UnresolvedStatus.AWAITING_REVIEW
    
    # AWAITING_REVIEW -> RESOLVED
    history3 = await UnresolvedLifecycle.transition(session, case, UnresolvedStatus.RESOLVED, "ADMIN", "TEST")
    assert case.status == UnresolvedStatus.RESOLVED

@pytest.mark.asyncio
async def test_lifecycle_invalid_transitions():
    class DummySession:
        def add(self, obj):
            pass
            
    session = DummySession()
    case = UnresolvedCase(id=1, status=UnresolvedStatus.RESOLVED)
    
    # RESOLVED -> OPEN should fail (terminal)
    with pytest.raises(InvalidStateTransition):
        await UnresolvedLifecycle.transition(session, case, UnresolvedStatus.OPEN, "SYSTEM", "TEST")
