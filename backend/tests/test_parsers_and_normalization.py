import os
from backend.app.services.normalization.normalizer import NormalizerService
from backend.app.core.config import settings

def test_cisco_normalization():
    path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "cisco_insecure.cfg")
    with open(path, "r") as f:
        content = f.read()

    vendor, normalized, _ = NormalizerService.normalize_configuration(content, "cisco_insecure.cfg")
    assert vendor == "Cisco"
    assert normalized.device.vendor == "Cisco"
    assert len(normalized.management_access) > 0

    # Verify Telnet is normalized with INSECURE security tag
    telnet_access = [m for m in normalized.management_access if m.protocol == "TELNET"]
    assert len(telnet_access) > 0
    assert telnet_access[0].security == "INSECURE"
    assert telnet_access[0].line_number > 0

def test_fortigate_normalization():
    path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "fortigate_insecure.conf")
    with open(path, "r") as f:
        content = f.read()

    vendor, normalized, _ = NormalizerService.normalize_configuration(content, "fortigate_insecure.conf")
    assert vendor == "Fortinet"
    assert normalized.device.vendor == "Fortinet"
    assert len(normalized.firewall_rules) > 0

    # Verify Any-to-Any policy detection
    any_any_rules = [r for r in normalized.firewall_rules if r.is_any_any]
    assert len(any_any_rules) > 0

def test_juniper_normalization():
    path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "juniper_insecure.conf")
    with open(path, "r") as f:
        content = f.read()

    vendor, normalized, _ = NormalizerService.normalize_configuration(content, "juniper_insecure.conf")
    assert vendor == "Juniper"
    assert normalized.device.vendor == "Juniper"

    # Verify Telnet normalized from Junos syntax
    telnet_access = [m for m in normalized.management_access if m.protocol == "TELNET"]
    assert len(telnet_access) > 0
    assert telnet_access[0].security == "INSECURE"

def test_cross_vendor_parity():
    """
    Key PPT Demonstration:
    The same normalized security object property (TELNET INSECURE) is produced
    across Cisco, Fortinet, and Juniper despite different syntax.
    """
    c_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "cisco_insecure.cfg")
    f_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "fortigate_insecure.conf")
    j_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "juniper_insecure.conf")

    with open(c_path, "r") as f:
        _, c_norm, _ = NormalizerService.normalize_configuration(f.read(), "cisco.cfg")
    with open(f_path, "r") as f:
        _, f_norm, _ = NormalizerService.normalize_configuration(f.read(), "forti.conf")
    with open(j_path, "r") as f:
        _, j_norm, _ = NormalizerService.normalize_configuration(f.read(), "juniper.conf")

    c_telnet = any(m.protocol == "TELNET" and m.security == "INSECURE" for m in c_norm.management_access)
    f_telnet = any(m.protocol == "TELNET" and m.security == "INSECURE" for m in f_norm.management_access)
    j_telnet = any(m.protocol == "TELNET" and m.security == "INSECURE" for m in j_norm.management_access)

    assert c_telnet is True
    assert f_telnet is True
    assert j_telnet is True
