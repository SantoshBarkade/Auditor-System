import os
from backend.app.services.vendor_detection.detector import VendorDetector
from backend.app.core.config import settings

def test_detect_cisco():
    cisco_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "cisco_insecure.cfg")
    with open(cisco_path, "r") as f:
        content = f.read()
    detection = VendorDetector.detect(content, "cisco_insecure.cfg")
    assert detection.vendor == "Cisco"
    assert detection.confidence > 0.5
    assert len(detection.fingerprints) > 0

def test_detect_fortigate():
    fgt_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "fortigate_insecure.conf")
    with open(fgt_path, "r") as f:
        content = f.read()
    detection = VendorDetector.detect(content, "fortigate_insecure.conf")
    assert detection.vendor == "Fortinet"
    assert detection.confidence > 0.5
    assert len(detection.fingerprints) > 0

def test_detect_juniper():
    junos_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "juniper_insecure.conf")
    with open(junos_path, "r") as f:
        content = f.read()
    detection = VendorDetector.detect(content, "juniper_insecure.conf")
    assert detection.vendor == "Juniper"
    assert detection.confidence > 0.5
    assert len(detection.fingerprints) > 0
